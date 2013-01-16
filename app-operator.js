/*!
 *  Chinachu Task Operator Service (chinachu-operator)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://chinachu.akkar.in/
**/

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
process.on('SIGQUIT', function() {
	setTimeout(function() {
		process.exit(0);
	}, 0);
});

// 追加モジュールのロード
var dateFormat = require('dateformat');
var OAuth      = require('oauth').OAuth;
var chinachu   = require('chinachu-common');

// 設定の読み込み
var config = JSON.parse( fs.readFileSync(CONFIG_FILE, 'ascii') );

// ファイル更新監視: ./data/reserves.json
var reserves = [];
chinachu.jsonWatcher(
	RESERVES_DATA_FILE
	,
	function _onUpdated(data, err, mes) {
		if (err) {
			util.error(err);
			return;
		}
		
		reserves = data;
		util.log(mes);
	}
	,
	{ create: [], now: true }
);
 
// ファイル更新監視: ./data/recorded.json
var recorded = [];
chinachu.jsonWatcher(
	RECORDED_DATA_FILE
	,
	function _onUpdated(data, err, mes) {
		if (err) {
			util.error(err);
			return;
		}
		
		recorded = data;
		util.log(mes);
	}
	,
	{ create: [], now: true }
);

// 録画中リストをクリア
fs.writeFileSync(RECORDING_DATA_FILE, '[]');

// Tweeter (Experimental)
if (config.operTweeter && config.operTweeterAuth && config.operTweeterFormat) {
	var tweeter = new OAuth(
		'https://api.twitter.com/oauth/request_token',
		'https://api.twitter.com/oauth/access_token',
		config.operTweeterAuth.consumerKey,
		config.operTweeterAuth.consumerSecret,
		'1.0', null, 'HMAC-SHA1'
	);
	
	var tweeterUpdater = function(status) {
		tweeter.post(
			'http://api.twitter.com/1/statuses/update.json',
			config.operTweeterAuth.accessToken,
			config.operTweeterAuth.accessTokenSecret,
			{ status: status }, 'application/json',
			function _onUpdatedTweeter(err, data, res) {
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
var schedulerProcessTime    = config.operSchedulerProcessTime    || 1000 * 60 * 30;
var schedulerIntervalTime   = config.operSchedulerIntervalTime   || 1000 * 60 * 60 * 2;
var schedulerSleepStartHour = config.operSchedulerSleepStartHour || 1;
var schedulerSleepEndHour   = config.operSchedulerSleepEndHour   || 5;
var prepTime    = config.operRecPrepTime    || 1000 * 60 * 1;
var offsetStart = config.operRecOffsetStart || 1000 * 5;
var offsetEnd   = config.operRecOffsetEnd   || -(1000 * 8);

var clock     = new Date().getTime();
var next      = 0;
var recording = [];
var scheduler = null;
var scheduled = 0;

var mainInterval = setInterval(main, 5000); 
function main() {
	clock = new Date().getTime();
	
	if (reserves.length !== 0) {
		reserves.forEach(reservesChecker);
	} else {
		next = 0;
	}
	
	if (
		(scheduler === null) &&
		(clock - scheduled > schedulerIntervalTime) &&
		((next === 0) || (next - clock > schedulerProcessTime)) &&
		((schedulerSleepStartHour > new Date().getHours()) || (schedulerSleepEndHour <= new Date().getHours()))
	) {
		startScheduler();
		scheduled = clock;
	}
}

// 予約時間チェック
function reservesChecker(program, i) {
	// 予約時間超過
	if (clock > program.end) {
		next = 0;
		return;
	}
	
	// 予約準備時間内
	if (program.start - clock <= prepTime) {
		if (
			(isRecording(program) === false) &&
			(isRecorded(program) === false)
		) {
			prepRecord(program);
		}
	}
	
	// 次の開始時間
	if (next === 0) {
		next = program.start;
	}
}

// 録画中か
function isRecording(program) {
	for (var i = 0; i < recording.length; i++) {
		if (recording[i].id === program.id) {
			return true;
		}
	}
	
	return false;
}

// 録画したか
function isRecorded(program) {
	for (var i = 0; i < recorded.length; i++) {
		if (recorded[i].id === program.id) {
			return true;
		}
	}
	
	return false;
}

// スケジューラーを開始
function startScheduler() {
	if ((scheduler !== null) || (recording.length !== 0)) { return; }
	
	scheduler = child_process.spawn(config.nodejsPath, [ 'app-scheduler.js', '-f' ]);
	util.log('SPAWN: ' + config.nodejsPath + ' app-scheduler.js -f (pid=' + scheduler.pid + ')');
	
	// ログ用
	var output = fs.createWriteStream('./log/scheduler');
	util.log('STREAM: ./log/scheduler');
	
	scheduler.stdout.on('data', function(data) {
		try {
			output.write(data);
		} catch (e) {
			util.log('ERROR: スケジューラーを中止 (' + e + ')');
			finalize();
		}
	});
	
	function finalize() {
		process.removeListener('SIGINT', finalize);
		process.removeListener('SIGQUIT', finalize);
		process.removeListener('SIGTERM', finalize);
		
		try { output.end(); } catch (e) {}
		
		scheduler = null;
	}
	
	scheduler.on('exit', finalize);
	
	process.on('SIGINT', finalize);
	process.on('SIGQUIT', finalize);
	process.on('SIGTERM', finalize);
}

// スケジューラーを停止
function stopScheduler() {
	if (scheduler === null) { return; }
	
	scheduler.kill('SIGTERM');
}

// 録画準備
function prepRecord(program) {
	util.log(
		'PREPARE: ' + dateFormat(new Date(program.start), 'isoDateTime') +
		' [' + program.channel.name + '] ' + program.title
	);
	
	recording.push(program);
	
	var timeout = program.start - clock - offsetStart;
	if (timeout < 0) { timeout = 0; }
	
	setTimeout(function() {
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

// 録画実行
function doRecord(program) {
	util.log(
		'RECORD: ' + dateFormat(new Date(program.start), 'isoDateTime') +
		' [' + program.channel.name + '] ' + program.title
	);
	
	var timeout = program.end - new Date().getTime() + offsetEnd;
	
	if (timeout < 0) {
		util.log('FATAL: 時間超過による録画中止');
		return;
	}
	
	// チューナーを選ぶ
	var tuner = null;
	for (var j = 0; config.tuners.length > j; j++) {
		tuner = config.tuners[j];
		tuner.n = j;
		
		if (
			(tuner.types.indexOf(program.channel.type) === -1) ||
			(fs.existsSync('./data/tuner.' + tuner.n.toString(10) + '.lock') === true)
		) {
			tuner = null;
			continue;
		}
		
		break;
	}
	
	// チューナーが見つからない
	if (tuner === null) {
		util.log('WARNING: ' + program.channel.type + ' 利用可能なチューナーがありません (3秒後に再試行)');
		setTimeout(function() {
			doRecord(program);
		}, 3000);
		return;
	}
	
	// チューナーをロック
	var tunerLockFile = './data/tuner.' + tuner.n.toString(10) + '.lock';
	fs.writeFileSync(tunerLockFile, '');
	util.log('LOCK: ' + tuner.name + ' (n=' + tuner.n.toString(10) + ')');
	program.tuner = tuner;
	program.tuner.lock = tunerLockFile;
	
	// 保存先パス
	var recPath = config.recordedDir + formatRecordedName(program);
	program.recorded = recPath;
	
	// 録画コマンド
	var recCmd = tuner.command.replace('<sid>', program.channel.sid).replace('<channel>', program.channel.channel);
	program.command = recCmd;
	
	// 録画プロセスを生成
	var recProc = child_process.spawn(recCmd.split(' ')[0], recCmd.replace(/[^ ]+ /, '').split(' '));
	util.log('SPAWN: ' + recCmd + ' (pid=' + recProc.pid + ')');
	program.pid = recProc.pid;
	
	// タイムアウト
	setTimeout(function() { recProc.kill('SIGTERM'); }, timeout);
	
	// 状態保存
	fs.writeFileSync(RECORDING_DATA_FILE, JSON.stringify(recording));
	util.log('WRITE: ' + RECORDING_DATA_FILE);
	
	// 書き込みストリームを作成
	var recFile = fs.createWriteStream(recPath);
	util.log('STREAM: ' + recPath);
	
	// ts出力
	recProc.stdout.on('data', function(data) {
		recFile.write(data);
	});
	
	// ログ出力
	recProc.stderr.on('data', function(data) {
		util.log('#' + (recCmd.split(' ')[0] + ': ' + data + '').replace(/\n/g, ' ').trim());
	});
	
	// お片付け
	function finalize() {
		process.removeListener('SIGINT', finalize);
		process.removeListener('SIGQUIT', finalize);
		process.removeListener('SIGTERM', finalize);
		recProc.stdout.removeAllListeners();
		
		// 書き込みストリームを閉じる
		recFile.end();
		
		// チューナーのロックを解除
		try { fs.unlinkSync(tunerLockFile); } catch(e) {}
		util.log('UNLOCK: ' + tuner.name + ' (n=' + tuner.n.toString(10) + ')');
		
		// 状態を更新
		delete program.pid;
		recorded.push(program);
		recording.splice(recording.indexOf(program), 1);
		fs.writeFileSync(RECORDED_DATA_FILE, JSON.stringify(recorded));
		fs.writeFileSync(RECORDING_DATA_FILE, JSON.stringify(recording));
		util.log('WRITE: ' + RECORDED_DATA_FILE);
		util.log('WRITE: ' + RECORDING_DATA_FILE);
	}
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

// 録画ファイル名
function formatRecordedName(program) {
	var name = config.recordedFormat;
	
	// <date:?>
	if (name.match(/<date:[^>]+>/) !== null) {
		name = name.replace(/<date:[^>]+>/, dateFormat(new Date(program.start), name.match(/<date:([^>]+)>/)[1]));
	}
	
	// <id>
	name = name.replace('<id>', program.id);
	
	// <type>
	name = name.replace('<type>', program.channel.type);
	
	// <channel>
	name = name.replace('<channel>', (program.channel.type === 'CS') ? program.channel.sid : program.channel.channel);
	
	// <tuner>
	name = name.replace('<tuner>', program.tuner.name);
	
	// <title>
	name = name.replace('<title>', program.title);
	
	// strip
	name = name.replace(/\//g, '／').replace(/\\/g, '＼').replace(/:/g, '：').replace(/\*/g, '＊').replace(/\?/g, '？');
	name = name.replace(/"/g, '”').replace(/</g, '＜').replace(/>/g, '＞').replace(/\|/g, '｜').replace(/≫/g, '＞＞');
	
	return name;
}