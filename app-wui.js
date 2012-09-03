/*!
 *  Chinachu WebUI Server Service (chinachu-wui)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://akkar.in/projects/chinachu/
**/

var CONFIG_FILE         = __dirname + '/config.json';
var RULES_FILE          = __dirname + '/rules.json';
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

// 追加モジュールのロード
var auth     = require('http-auth');
var socketio = require('socket.io');

// 設定の読み込み
var config = JSON.parse( fs.readFileSync(CONFIG_FILE, 'ascii') );

// https or http
if (config.wuiTlsKeyPath && config.wuiTlsCertPath) {
	var https = require('https');
	
	var tlsOption = {
		key : fs.readFileSync(config.wuiTlsKeyPath),
		cert: fs.readFileSync(config.wuiTlsCertPath)
	};
} else {
	var http = require('http');
}

// ファイル更新監視: ./data/rules.json
if (!fs.existsSync(RULES_FILE)) fs.writeFileSync(RULES_FILE, '[]');
var rules = JSON.parse( fs.readFileSync(RULES_FILE, 'ascii') );
var rulesTimer;
function rulesOnUpdated() {
	clearTimeout(rulesTimer);
	rulesTimer = setTimeout(function() {
		util.log('UPDATED: ' + RULES_FILE);
		
		rules = JSON.parse( fs.readFileSync(RULES_FILE, 'ascii') );
		io.sockets.emit('rules', rules);
	}, 500);
}
fs.watch(RULES_FILE, rulesOnUpdated);

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

// BASIC認証
if (config.wuiUsers && (config.wuiUsers.length > 0)) {
	var basic = auth({
		authRealm: 'Authentication.',
		authList : config.wuiUsers
	});
}

var status = {
	connectedCount: 0,
	feature: {
		previewer   : !!config.wuiPreviewer,
		streamer    : !!config.wuiStreamer,
		filer       : !!config.wuiFiler,
		configurator: !!config.wuiConfigurator
	}
};

//
// http server
//
if (http)  { var app = http.createServer(httpServer); }
if (https) { var app = https.createServer(tlsOption, httpServer); }
app.listen(config.wuiPort, (config.wuiIpv6 !== null) ? config.wuiIpv6 : null);

function httpServer(req, res) {
	// http request logging
	var log = function(statusCode) {
		util.log([
			/*statusCode*/ statusCode,
			/*method+url*/ req.method + ':' + req.url,
			/*remoteAddr*/ req.headers['x-forwarded-for'] || req.client.remoteAddress,
			/*referer   */ /* req.headers.referer || '-', */
			/*userAgent */ req.headers['user-agent'].split(' ').pop() || '-'
		].join(' '));
	};
	
	// serve static file
	if (req.url.match(/\/$/) !== null) req.url += 'index.html';
	if (req.url.match(/(\?.*)$/) !== null) req.url = req.url.match(/^(.+)\?.*$/)[1];
	var filename = path.join('./web/', req.url);
	
	var ext= filename.split('.').pop();
	
	function err400() {
		res.writeHead(400, {'Content-Type': 'text/plain'});
		res.write('400 Bad Request\n');
		res.end();
		log(400);
	}
	
	function err404() {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.write('404 Not Found\n');
		res.end();
		log(404);
	}
	
	function err500() {
		res.writeHead(500, {'Content-Type': 'text/plain'});
		res.write('500 Internal Server Error\n');
		res.end();
		log(500);
	}
	
	function responseStatic() {
		fs.readFile(filename, function(err, data) {
			if (err) {
				err500();
				return;
			}
			
			var statusCode = 200;
			var type       = 'text/plain';
			
			if (ext === 'html') { type = 'text/html'; }
			if (ext === 'js')   { type = 'text/javascript'; }
			if (ext === 'css')  { type = 'text/css'; }
			if (ext === 'ico')  { type = 'image/vnd.microsoft.icon'; }
			if (ext === 'cur')  { type = 'image/vnd.microsoft.icon'; }
			if (ext === 'png')  { type = 'image/png'; }
			if (ext === 'gif')  { type = 'image/gif'; }
			if (ext === 'xspf') { type = 'application/xspf+xml'; }
			
			res.writeHead(statusCode, {
				'Content-Type': type,
				'Server'      : 'chinachu-wui'
			});
			res.write(data, 'binary');
			res.end();
			log(statusCode);
			return;
		});
	}
	
	function responseApi() {
		var map = req.url.replace('/api/', '').split('/');
		
		var statusCode = 200;
		var type       = 'text/plain';
		
		if (ext === 'png')  { type = 'image/png'; }
		if (ext === 'gif')  { type = 'image/gif'; }
		if (ext === 'json') { type = 'application/json'; }
		
		switch (map[0]) {
			case 'recording':
				if (map.length === 3) {
					var program = (function() {
						var x = null;
						
						recording.forEach(function(a) {
							if (a.id === map[1]) { x = a; }
						});
						
						return x;
					})();
					
					if (program === null) {
						err404();
						return;
					}
					
					switch (map[2]) {
						case 'preview':
							if ((!status.feature.previewer) || (program.tuner && program.tuner.isScrambling)) {
								err404();
								return;
							}
							
							res.writeHead(statusCode, {'Content-Type': type});
							
							var ffmpeg = child_process.exec(
								'tail -c 3200000 "' + program.recorded + '" | ' +
								'ffmpeg -i pipe:0 -ss 1.3 -vframes 1 -f image2 -vcodec png -s 320x180 -map 0.0 -y pipe:1'
							, {
								encoding: 'binary',
								maxBuffer: 3200000
							},
							function(err, stdout, stderr) {
								res.write('data:image/png;base64,' + new Buffer(stdout, 'binary').toString('base64'));
								res.end();
								log(statusCode);
								clearTimeout(timeout);
							});
							
							var timeout = setTimeout(function() {
								ffmpeg.kill('SIGKILL');
							}, 3000);
							
							return;
						default:
							err404();
							return;
					}
				} else {
					err400();
					return;
				}
				break;
			default:
				err404();
				return;
		}
	}
	
	if (req.url.match(/^\/api\/.+$/) === null) {
		if (fs.existsSync(filename) === false) {
			err404();
			return;
		}
		
		if ((req.url === '/apple-touch-icon.png') || (req.url === '/apple-touch-startup-image-iphone4.png')) {
			responseStatic();
		} else if (basic) {
			basic.apply(req, res, responseStatic);
		} else {
			responseStatic();
		}
	} else {
		if (basic) {
			basic.apply(req, res, responseApi);
		} else {
			responseApi();
		}
	}
}

//
// socket.io server
//
var io   = socketio.listen(app);
io.enable('browser client minification');
io.set('log level', 1);
io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
io.sockets.on('connection', ioServer);

function ioServer(socket) {
	++status.connectedCount;
	
	socket.on('disconnect', function _socketOnDisconnect() {
		--status.connectedCount;
		io.sockets.emit('status', status);
	});
	
	// broadcast
	io.sockets.emit('status', status);
	
	socket.emit('rules', rules);
	socket.emit('reserves', reserves);
	socket.emit('schedule', schedule);
	socket.emit('recording', recording);
	socket.emit('recorded', recorded);
}