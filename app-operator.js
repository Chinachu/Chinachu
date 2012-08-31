/*!
 *  Chinachu Task Operator Service (chinachu-operator)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://akkar.in/projects/chinachu/
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

// 追加モジュールのロード
var dateFormat = require('dateformat');

// 設定の読み込み
var config = JSON.parse( fs.readFileSync(CONFIG_FILE, 'ascii') );

// ファイル更新監視: ./data/reserves.json
if (!fs.existsSync(RESERVES_DATA_FILE)) fs.writeFileSync(RESERVES_DATA_FILE, '[]');
var reserves = JSON.parse( fs.readFileSync(RESERVES_DATA_FILE, 'ascii') );
var reservesTimer;
function reservesOnUpdated() {
	clearTimeout(reservesTimer);
	reservesTimer = setTimeout(function() {
		util.log('UPDATED: ' + RESERVES_DATA_FILE);
		
		reserves = JSON.parse( fs.readFileSync(RESERVES_DATA_FILE, 'ascii') );
	}, 500);
}
fs.watch(RESERVES_DATA_FILE, reservesOnUpdated);
 
// よみこみ: ./data/recorded.json
if (!fs.existsSync(RECORDED_DATA_FILE)) fs.writeFileSync(RECORDED_DATA_FILE, '[]');
var recorded = JSON.parse( fs.readFileSync(RECORDED_DATA_FILE, 'ascii') );

//
var prepTime    = config.operRecPrepTime || 1000 * 60 * 1;
var offsetStart = config.operRecOffsetStart || 1000 * 5;
var offsetEnd   = config.operRecOffsetEnd || -(1000 * 8);
var clock       = new Date().getTime();
var recording   = [];

var mainInterval = setInterval(main, 5000); 
function main() {
	clock = new Date().getTime();
	
	reserves.forEach(reservesChecker);
}

// 予約時間チェック
function reservesChecker(program) {
	// 予約時間超過
	if (clock > program.end) { return; }
	
	// 予約準備時間内
	if (program.start - clock <= prepTime) {
		if (
			(isRecording(program) === false) &&
			(isRecorded(program) === false)
		) {
			prepRecord(program);
		}
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

// 録画準備
function prepRecord(program) {
	util.log(
		'PREPARE: ' + dateFormat(new Date(program.start), 'isoDateTime') +
		' [' + program.channel.name + '] ' + program.title
	);
	
	recording.push(program);
	
	var timeout = (program.start - clock) - offsetStart;
	if (timeout < 0) { timeout = 0; }
	
	setTimeout(function() {
		doRecord(program);
	}, timeout);
	
	fs.writeFile(RECORDING_DATA_FILE, JSON.stringify(recording, null, '  '));
	util.log('WRITE: ' + RECORDING_DATA_FILE);
}

// 録画実行
function doRecord(program) {
	util.log(
		'RECORD: ' + dateFormat(new Date(program.start), 'isoDateTime') +
		' [' + program.channel.name + '] ' + program.title
	);
	
	var timeout = (program.end - new Date().getTime()) + offsetStart + offsetEnd;
	
	if (timeout < 0) {
		util.log('FATAL: タイムアウトによる録画失敗');
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
	
	function unlockTuner() {
		// チューナーのロックを解除
		fs.unlinkSync(tunerLockFile);
		util.log('UNLOCK: ' + tuner.name + ' (n=' + tuner.n.toString(10) + ')');
		
		process.removeListener('SIGINT', unlockTuner);
		process.removeListener('SIGQUIT', unlockTuner);
		process.removeListener('SIGTERM', unlockTuner);
	}
	process.on('SIGINT', unlockTuner);
	process.on('SIGQUIT', unlockTuner);
	process.on('SIGTERM', unlockTuner);
	
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
	setTimeout(function() { recProc.kill('SIGKILL'); }, timeout);
	
	// 状態保存
	fs.writeFile(RECORDING_DATA_FILE, JSON.stringify(recording, null, '  '));
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
	
	// プロセス終了時処理
	recProc.on('exit', function(code) {
		// 書き込みストリームを閉じる
		recFile.end();
		
		// チューナーのロックを解除
		unlockTuner();
		
		// 状態を更新
		recorded.push(program);
		recording.splice(recording.indexOf(program), 1);
		fs.writeFile(RECORDED_DATA_FILE, JSON.stringify(recorded, null, '  '));
		fs.writeFile(RECORDING_DATA_FILE, JSON.stringify(recording, null, '  '));
		util.log('WRITE: ' + RECORDED_DATA_FILE);
		util.log('WRITE: ' + RECORDING_DATA_FILE);
	});
}

// 録画ファイル名
function formatRecordedName(program) {
	var name = config.recordedFormat;
	
	// <date:?>
	if (name.match(/<date:[^>]+>/) !== null) {
		name = name.replace(/<date:[^>]+>/, dateFormat(new Date(program.start), name.match(/<date:([^>]+)>/)[1]));
	}
	
	// <type>
	name = name.replace('<type>', program.channel.type);
	
	// <channel>
	name = name.replace('<channel>', program.channel.channel);
	
	// <tuner>
	name = name.replace('<tuner>', program.tuner.name);
	
	// <title>
	name = name.replace('<title>', program.title);
	
	return name;
}