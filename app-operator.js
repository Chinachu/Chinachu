/*!
 *  Chinachu Task Operator Service (chinachu-operator)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://akkar.in/projects/chinachu/
**/

var CONFIG_FILE         = __dirname + '/config.json';
var RESERVES_DATA_FILE  = __dirname + '/data/reserves.json';
var SCHEDULE_DATA_FILE  = __dirname + '/data/schedule.json';
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
		
		io.sockets.emit('reserves', reserves);
	}, 500);
}
fs.watch(RESERVES_DATA_FILE, reservesOnUpdated);

// ファイル更新監視: ./data/schedule.json
if (!fs.existsSync(SCHEDULE_DATA_FILE)) fs.writeFileSync(SCHEDULE_DATA_FILE, '[]');
var schedule = JSON.parse( fs.readFileSync(SCHEDULE_DATA_FILE, 'ascii') );
var scheduleTimer;
function scheduleOnUpdated() {
	clearTimeout(scheduleTimer);
	scheduleTimer = setTimeout(function() {
		util.log('UPDATED: ' + SCHEDULE_DATA_FILE);
		
		schedule = JSON.parse( fs.readFileSync(SCHEDULE_DATA_FILE, 'ascii') );
		
		io.sockets.emit('schedule', schedule);
	}, 500);
}
fs.watch(SCHEDULE_DATA_FILE, scheduleOnUpdated);

// ファイル更新監視: ./data/recording.json
if (!fs.existsSync(RECORDING_DATA_FILE)) fs.writeFileSync(RECORDING_DATA_FILE, '[]');
var recording = JSON.parse( fs.readFileSync(RECORDING_DATA_FILE, 'ascii') );
var recordingTimer;
function recordingOnUpdated() {
	clearTimeout(recordingTimer);
	recordingTimer = setTimeout(function() {
		util.log('UPDATED: ' + RECORDING_DATA_FILE);
		
		recording = JSON.parse( fs.readFileSync(RECORDING_DATA_FILE, 'ascii') );
		
		io.sockets.emit('recording', recording);
	}, 500);
}
fs.watch(RECORDING_DATA_FILE, recordingOnUpdated);

// ファイル更新監視: ./data/recorded.json
if (!fs.existsSync(RECORDED_DATA_FILE)) fs.writeFileSync(RECORDED_DATA_FILE, '[]');
var recorded = JSON.parse( fs.readFileSync(RECORDED_DATA_FILE, 'ascii') );
var recordedTimer;
function recordedOnUpdated() {
	clearTimeout(recordedTimer);
	recordedTimer = setTimeout(function() {
		util.log('UPDATED: ' + RECORDED_DATA_FILE);
		
		recorded = JSON.parse( fs.readFileSync(RECORDED_DATA_FILE, 'ascii') );
		
		io.sockets.emit('recorded', recorded);
	}, 500);
}
fs.watch(RECORDED_DATA_FILE, recordedOnUpdated);

// date
function main() {
	var date = new Date();
	
	//util.log(date.toLocaleString());
	
	setTimeout(main, 1000);
}

main();