/*!
 *  Chinachu Task Operator Service (chinachu-operator)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://chinachu.akkar.in/
**/
/*jslint node:true, nomen: true, plusplus: true, regexp: true */
/*global gc */
'use strict';

var CONFIG_FILE         = __dirname + '/config.json';
var RESERVES_DATA_FILE  = __dirname + '/data/reserves.json';
var RECORDING_DATA_FILE = __dirname + '/data/recording.json';
var RECORDED_DATA_FILE  = __dirname + '/data/recorded.json';

// 標準モジュールのロード
var path          = require('path');
var fs            = require('fs');
var util          = require('util');
var child_process = require('child_process');

// ディレクトリチェック
if (!fs.existsSync('./data/') || !fs.existsSync('./log/') || !fs.existsSync('./web/')) {
	util.error('必要なディレクトリが存在しないか、カレントワーキングディレクトリが不正です。');
	process.exit(1);
}

// 終了処理
process.on('SIGQUIT', function () {
	setTimeout(function () {
		process.exit(0);
	}, 0);
});

// 例外処理
process.on('uncaughtException', function (err) {
	util.error('uncaughtException: ' + err);
});

// 追加モジュールのロード
var dateFormat = require('dateformat');
var mkdirp     = require('mkdirp');
var Mtwitter   = require('mtwitter');
var chinachu   = require('chinachu-common');

//
var reserves  = [];
var recorded  = [];
var recording = [];

// 設定の読み込み
var config = require(CONFIG_FILE);

// 録画中リストをクリア
fs.writeFileSync(RECORDING_DATA_FILE, '[]');

// Tweeter (Experimental)
if (config.operTweeter && config.operTweeterAuth && config.operTweeterFormat) {
	var tweeter = new Mtwitter({
		consumer_key       : config.operTweeterAuth.consumerKey,
		consumer_secret    : config.operTweeterAuth.consumerSecret,
		access_token_key   : config.operTweeterAuth.accessToken,
		access_token_secret: config.operTweeterAuth.accessTokenSecret
	});
	
	var tweeterUpdater = function (status) {
		tweeter.post(
			'/statuses/update',
			{ status: status },
			function _onUpdatedTweeter(err, item) {
				if (err) {
					util.log('[Tweeter] Error: ' + JSON.stringify(err));
				} else {
					util.log('[Tweeter] Updated: ' + status);
				}
			}
		);
	};
}

//
var schedulerProcessTime    = config.operSchedulerProcessTime    || 1000 * 60 * 20;//20分
var schedulerIntervalTime   = config.operSchedulerIntervalTime   || 1000 * 60 * 60;//60分
var schedulerSleepStartHour = config.operSchedulerSleepStartHour || 1;
var schedulerSleepEndHour   = config.operSchedulerSleepEndHour   || 5;
var schedulerEpgRecordTime  = config.schedulerEpgRecordTime      || 60;
var prepTime    = config.operRecPrepTime    || 1000 * 60;//60秒
var offsetStart = config.operRecOffsetStart || 1000 * 5;
var offsetEnd   = config.operRecOffsetEnd   || -(1000 * 8);

var clock     = new Date().getTime();
var next      = 0;
var scheduler = null;
var scheduled = 0;

// 録画中か
function isRecording(program) {
	var i, l;
	for (i = 0, l = recording.length; i < l; i++) {
		if (recording[i].id === program.id) {
			return true;
		}
	}
	
	return false;
}

// 録画したか
function isRecorded(program) {
	var i, l;
	for (i = 0, l = recorded.length; i < l; i++) {
		if (recorded[i].id === program.id) {
			return true;
		}
	}
	
	return false;
}

// 録画中の番組を更新
function recordingUpdater(program) {
	var i, l, k;
	for (i = 0, l = recording.length; i < l; i++) {
		if (recording[i].id === program.id) {
			for (k in program) {
				if (program.hasOwnProperty(k)) {
					recording[i][k] = program[k];
				}
			}
			return;
		}
	}
}

// スケジューラーを停止
function stopScheduler() {
	process.removeListener('SIGINT',  stopScheduler);
	process.removeListener('SIGQUIT', stopScheduler);
	process.removeListener('SIGTERM', stopScheduler);
	
	if (scheduler === null) { return; }
	
	scheduler.kill('SIGQUIT');
	util.log('KILL: SIGQUIT -> Scheduler (pid=' + scheduler.pid + ')');
}

// スケジューラーを開始
function startScheduler() {
	if ((scheduler !== null) || (recording.length !== 0)) { return; }
	
	var output, finalize;
	
	scheduler = child_process.spawn('node', [ 'app-scheduler.js', '-f' ]);
	util.log('SPAWN: node app-scheduler.js -f (pid=' + scheduler.pid + ')');
	
	// ログ用
	output = fs.createWriteStream('./log/scheduler', { flags: 'a' });
	util.log('STREAM: ./log/scheduler');
	
	finalize = function () {
		try {
			process.removeListener('SIGINT', stopScheduler);
			process.removeListener('SIGQUIT', stopScheduler);
			process.removeListener('SIGTERM', stopScheduler);
		} catch (e) {}
		
		try { output.end(); } catch (ee) {}
		
		scheduler = null;
	};
	
	scheduler.stdout.on('data', function (data) {
		try {
			output.write(data);
		} catch (e) {
			util.log('ERROR: Scheduler -> Abort (' + e + ')');
			finalize();
		}
	});
	
	scheduler.once('exit', finalize);
	
	process.once('SIGINT', stopScheduler);
	process.once('SIGQUIT', stopScheduler);
	process.once('SIGTERM', stopScheduler);
}

// 録画実行
function doRecord(program) {
	var timeout, tuner, recPath, recDirPath, recCmd, recProc, recFile, epgInterval, finalize;
	
	util.log('RECORD: ' + dateFormat(new Date(program.start), 'isoDateTime') + ' [' + program.channel.name + '] ' + program.title);
	
	timeout = program.end - new Date().getTime() + offsetEnd;
	
	if (timeout < 0) {
		util.log('FATAL: 時間超過による録画中止');
		return;
	}
	
	// チューナーを選ぶ
	tuner = chinachu.getFreeTunerSync(config.tuners, program.channel.type);
	
	// チューナーが見つからない
	if (tuner === null) {
		util.log('WARNING: ' + program.channel.type + ' 利用可能なチューナーが見つかりません (存在しないかロックされています) (5秒後に再試行)');
		setTimeout(function () {
			doRecord(program);
		}, 5000);
		return;
	}
	
	// チューナーをロック
	try {
		chinachu.lockTunerSync(tuner);
	} catch (e) {
		util.log('WARNING: チューナー(' + tuner.n + ')のロックに失敗しました');
	}
	util.log('LOCK: ' + tuner.name + ' (n=' + tuner.n + ')');
	
	program.tuner = tuner;
	
	// 保存先パス
	recPath = config.recordedDir + chinachu.formatRecordedName(program, config.recordedFormat);
	program.recorded = recPath;
	
	// 保存先ディレクトリ
	recDirPath = recPath.replace(/^(.+)\/.+$/, '$1');
	if (!fs.existsSync(recDirPath)) {
		util.log('MKDIR: ' + recDirPath);
		mkdirp.sync(recDirPath);
	}
	
	// 録画コマンド
	recCmd = tuner.command;
	recCmd = recCmd.replace(' --strip', '');// EPGのSIDが消えてしまうバグへの対策(要調査)
	recCmd = recCmd.replace('<sid>', program.channel.sid + ',epg');
	recCmd = recCmd.replace('<channel>', program.channel.channel);
	program.command = recCmd;
	
	// 録画プロセスを生成
	recProc = child_process.spawn(recCmd.split(' ')[0], recCmd.replace(/[^ ]+ /, '').split(' '));
	util.log('SPAWN: ' + recCmd + ' (pid=' + recProc.pid + ')');
	program.pid = recProc.pid;
	
	// 状態保存
	fs.writeFileSync(RECORDING_DATA_FILE, JSON.stringify(recording));
	util.log('WRITE: ' + RECORDING_DATA_FILE);
	
	// 書き込みストリームを作成
	recFile = fs.createWriteStream(recPath, { flags: 'a' });
	util.log('STREAM: ' + recPath);
	
	// ts出力
	recProc.stdout.pipe(recFile);
	
	// ログ出力
	recProc.stderr.on('data', function (data) {
		util.log('#' + (recCmd.split(' ')[0] + ': ' + data).replace(/\n/g, ' ').trim());
	});
	
	// EPG処理
	epgInterval = setInterval(function () {
		var epgProc, output;
		
		epgProc = child_process.spawn('node', [
			'app-scheduler.js', '-f', '-ch', program.channel.channel, '-l', recPath
		]);
		util.log('SPAWN: node app-scheduler.js -f -ch ' + program.channel.channel + ' -l ' + recPath + ' (pid=' + epgProc.pid + ')');
		
		// ログ用
		output = fs.createWriteStream('./log/scheduler', { flags: 'a' });
		util.log('STREAM: ./log/scheduler');
		
		epgProc.stdout.on('data', function (data) {
			output.write(data);
		});
		
		epgProc.on('exit', function () {
			output.end();
		});
	}, 1000 * 300);//300秒
	
	// お片付け
	finalize = function () {
		var i, l, postProcess;
		
		process.removeListener('SIGINT', finalize);
		process.removeListener('SIGQUIT', finalize);
		process.removeListener('SIGTERM', finalize);
		recProc.stdout.removeAllListeners();
		
		// 書き込みストリームを閉じる
		recFile.end();
		
		// チューナーのロックを解除
		try {
			chinachu.unlockTunerSync(tuner);
			util.log('UNLOCK: ' + tuner.name + ' (n=' + tuner.n + ')');
		} catch (e) {
			util.log(e);
		}
		
		// EPG処理を終了
		clearInterval(epgInterval);
		
		// 状態を更新
		delete program.pid;
		recorded.push(program);
		recording.splice(recording.indexOf(program), 1);
		fs.writeFileSync(RECORDED_DATA_FILE, JSON.stringify(recorded));
		fs.writeFileSync(RECORDING_DATA_FILE, JSON.stringify(recording));
		util.log('WRITE: ' + RECORDED_DATA_FILE);
		util.log('WRITE: ' + RECORDING_DATA_FILE);
		if (program.isManualReserved) {
			for (i = 0, l = reserves.length; i < l; i++) {
				if (reserves[i].id === program.id) {
					reserves.splice(i, 1);
					fs.writeFileSync(RESERVES_DATA_FILE, JSON.stringify(reserves));
					util.log('WRITE: ' + RESERVES_DATA_FILE);
					break;
				}
			}
		}
		
		// ポストプロセス
		if (config.recordedCommand) {
			postProcess = child_process.spawn(config.recordedCommand, [recPath, JSON.stringify(program)]);
			util.log('SPAWN: ' + config.recordedCommand + ' (pid=' + postProcess.pid + ')');
		}
		
		finalize = null;
	};
	// 録画プロセス終了時処理
	recProc.on('exit', finalize);
	
	// 終了シグナル時処理
	process.on('SIGINT', finalize);
	process.on('SIGQUIT', finalize);
	process.on('SIGTERM', finalize);
	
	// Tweeter (Experimental)
	if (tweeter && config.operTweeterFormat.start) {
		tweeterUpdater(
			config.operTweeterFormat.start
				.replace('<id>', program.id)
				.replace('<type>', program.channel.type)
				.replace('<channel>', ((program.channel.type === 'CS') ? program.channel.sid : program.channel.channel))
				.replace('<title>',   program.title)
		);
	}
}

// 録画準備
function prepRecord(program) {
	util.log('PREPARE: ' + dateFormat(new Date(program.start), 'isoDateTime') + ' [' + program.channel.name + '] ' + program.title);
	
	recording.push(program);
	
	var timeout = program.start - clock - offsetStart;
	if (timeout < 0) { timeout = 3000; }
	
	setTimeout(function () {
		doRecord(program);
	}, timeout);
	
	fs.writeFileSync(RECORDING_DATA_FILE, JSON.stringify(recording));
	util.log('WRITE: ' + RECORDING_DATA_FILE);
	
	if (scheduler !== null) {
		stopScheduler();
	}
	
	// Tweeter (Experimental)
	if ((timeout !== 0) && tweeter && config.operTweeterFormat.prepare) {
		tweeterUpdater(
			config.operTweeterFormat.prepare
				.replace('<id>', program.id)
				.replace('<type>', program.channel.type)
				.replace('<channel>', ((program.channel.type === 'CS') ? program.channel.sid : program.channel.channel))
				.replace('<title>',   program.title)
		);
	}
}

// 予約時間チェック
function reservesChecker(program, i) {
	// スキップ
	if (program.isSkip) { return undefined; }
	
	// 予約時間超過
	if (clock > program.end) {
		next = 0;
		return;
	}
	
	// 予約準備時間内
	if (program.start - clock <= prepTime) {
		if (isRecording(program) === false && isRecorded(program) === false) {
			prepRecord(program);
		}
	}
	
	// 次の開始時間
	if (next === 0) {
		next = program.start;
	}
}

// 録画中チェック
function recordingChecker(program, i) {
	
	var timeout = program.end - clock + offsetEnd;
	
	// 録画時間内はreturn
	if (timeout >= 0) { return; }
	
	// 録画開始していない時はreturn
	if (!program.pid) { return; }
	
	util.log('FINISH: ' + dateFormat(new Date(program.start), 'isoDateTime') + ' [' + program.channel.name + '] ' + program.title);
	
	process.kill(program.pid, 'SIGTERM');
}

// ファイル更新監視: ./data/reserves.json
chinachu.jsonWatcher(
	RESERVES_DATA_FILE,
	function _onUpdated(err, data, mes) {
		if (err) {
			util.error(err);
			return;
		}
		
		reserves = data;
		util.log(mes);
		
		if (recording.length > 0) {
			reserves.forEach(recordingUpdater);
			
			fs.writeFileSync(RECORDING_DATA_FILE, JSON.stringify(recording));
			util.log('WRITE: ' + RECORDING_DATA_FILE);
		}
	},
	{ create: [], now: true }
);
 
// ファイル更新監視: ./data/recorded.json
chinachu.jsonWatcher(
	RECORDED_DATA_FILE,
	function _onUpdated(err, data, mes) {
		if (err) {
			util.error(err);
			return;
		}
		
		recorded = data;
		util.log(mes);
	},
	{ create: [], now: true }
);

// main
function main() {
	clock = new Date().getTime();
	
	if (reserves.length !== 0) {
		reserves.forEach(reservesChecker);
	} else {
		next = 0;
	}
	
	recording.forEach(recordingChecker);
	
	if ((scheduler === null) && (clock - scheduled > schedulerIntervalTime) && ((next === 0) || (next - clock > schedulerProcessTime)) && ((schedulerSleepStartHour > new Date().getHours()) || (schedulerSleepEndHour <= new Date().getHours()))) {
		startScheduler();
		scheduled = clock;
	}
}
setInterval(main, 1000);

//
// gc
//
if (typeof gc !== 'undefined') {
	setInterval(gc, 1000 * 60 * 2);
}