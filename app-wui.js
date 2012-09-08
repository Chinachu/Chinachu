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
var OPERATOR_LOG_FILE   = __dirname + '/log/operator';
var WUI_LOG_FILE        = __dirname + '/log/wui';
var SCHEDULER_LOG_FILE  = __dirname + '/log/scheduler';


// 標準モジュールのロード
var path          = require('path');
var fs            = require('fs');
var util          = require('util');
var child_process = require('child_process');
var url           = require('url');

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
		
		try {
			rules = JSON.parse( fs.readFileSync(RULES_FILE, 'ascii') );
			io.sockets.emit('rules', rules);
		} catch (e) {
			util.log('WARNING: RULES_FILE が不正です');
		}
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
	},
	system: {
		core: 1
	}
};

child_process.exec('cat /proc/cpuinfo | grep "core id" | sort -i | uniq | wc -l', function(err, stdout) {
	status.system.core = parseInt(stdout.trim(), 10);
});

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
	var location = req.url;
	if (location.match(/\/$/) !== null)     { location += 'index.html'; }
	if (location.match(/(\?.*)$/) !== null) { location = location.match(/^(.+)\?.*$/)[1]; }
	
	var query = url.parse(req.url, true).query;
	
	var filename = path.join('./web/', location);
	
	var ext = null;
	if (filename.match(/[^\/]+\..+$/) !== null) {
		ext = filename.split('.').pop();
	}
	
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
		var map = location.replace('/api/', '').split('/');
		
		var statusCode = 200;
		var type       = 'text/plain';
		
		if (ext === 'png')  { type = 'image/png'; }
		if (ext === 'gif')  { type = 'image/gif'; }
		if (ext === 'jpg')  { type = 'image/jpeg'; }
		if (ext === 'f4v')  { type = 'video/mp4'; }
		if (ext === 'flv')  { type = 'video/x-flv'; }
		if (ext === 'm2ts') { type = 'video/MP2T'; }
		if (ext === 'm3u8') { type = 'video/x-mpegURL'; }
		if (ext === 'json') { type = 'application/json'; }
		
		switch (map[0]) {
			case 'scheduler.json':
				var result = {
					time     : 0,
					conflicts: [],
					reserves : []
				};
				
				switch (req.method) {
					case 'GET':
						if (!fs.existsSync(SCHEDULER_LOG_FILE)) {
							err404();
							return;
						}
						
						result.time = fs.statSync(SCHEDULER_LOG_FILE).mtime.getTime();
						
						fs.readFileSync(SCHEDULER_LOG_FILE, 'ascii').split('\n').forEach(function(line) {
							if ((line.match('CONFLICT:') !== null) || (line.match('RESERVE:') !== null)) {
								var id = line.match(/(RESERVE|CONFLICT): ([a-z0-9-]+)/)[2];
								var t  = line.match(/(RESERVE|CONFLICT): ([a-z0-9-]+)/)[1];
								var f  = null;
								
								for (var i = 0; i < schedule.length; i++) {
									for (var j = 0; j < schedule[i].programs.length; j++) {
										if (schedule[i].programs[j].id === id) {
											f = schedule[i].programs[j];
											break;
										}
									}
									if (f !== null) { break; }
								}
								
								if (t === 'CONFLICT') {
									result.conflicts.push(f);
								}
								if (t === 'RESERVE') {
									result.reserves.push(f);
								}
							}
						});
						
						res.writeHead(statusCode, {'Content-Type': type});
						res.write(JSON.stringify(result));
						res.end();
						log(statusCode);
				}
				return;//<--case 'scheduler.json'
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
						case 'preview.png':
						case 'preview.jpg':
							if (!status.feature.previewer || !program.pid || (program.tuner && program.tuner.isScrambling)) {
								err404();
								return;
							}
							
							res.writeHead(statusCode, {'Content-Type': type});
							
							var w = query.width  || '320';
							var h = query.height || '180';
							
							var vcodec = ext || 'mjpeg';
							if (ext === 'jpg') { vcodec = 'mjpeg'; }
							
							var ffmpeg = child_process.exec(
								(
									'tail -c 3200000 "' + program.recorded + '" | ' +
									'ffmpeg -i pipe:0 -ss 1.3 -vframes 1 -f image2 -vcodec ' + vcodec +
									' -s ' + w + 'x' + h + ' -map 0.0 -y pipe:1'
								),
								{
									encoding: 'binary',
									maxBuffer: 3200000
								},
								function(err, stdout, stderr) {
									if (ext) {
										res.write(stdout, 'binary');
									} else {
										res.write('data:image/jpeg;base64,' + new Buffer(stdout, 'binary').toString('base64'));
									}
									res.end();
									log(statusCode);
									clearTimeout(timeout);
								}
							);
							
							var timeout = setTimeout(function() {
								ffmpeg.kill('SIGKILL');
							}, 3000);
							
							return;
						// HTTP Live Streaming (Experimental)
						case 'watch.m3u8.txt'://for debug
						case 'watch.m3u8':
							if (!status.feature.streamer || !program.pid || (program.tuner && program.tuner.isScrambling)) {
								err404();
								return;
							}
							
							res.writeHead(statusCode, {'Content-Type': type});
							
							var current  = (new Date().getTime() - program.start) / 1000;
							var duration = parseInt(query.duration || 15, 10);
							var vcodec   = query.vcodec   || 'libx264';
							var acodec   = query.acodec   || 'libfaac';
							var bitrate  = query.bitrate  || '1000k';
							var ar       = query.ar       || '44100';
							var ab       = query.ab       || '96k';
							var size     = query.size     || '1024x576';
							var rate     = query.rate     || '24';
							
							res.write('#EXTM3U\n');
							res.write('#EXT-X-TARGETDURATION:' + duration + '\n');
							res.write('#EXT-X-MEDIA-SEQUENCE:' + Math.floor(current / duration) + '\n');
							
							var target = query.prefix || '';
							target += 'watch.m2ts?duration=' + duration + '&vcodec=' + vcodec + '&acodec=' + acodec;
							target += '&bitrate=' + bitrate + '&size=' + size + '&ar=' + ar + '&ab=' + ab + '&rate=' + rate;
							
							for (var i = 0; i < current; i += duration) {
								if (current - i > 60) { continue; }
								res.write('#EXTINF:' + duration + ',\n');
								res.write(target + '&start=' + i + '\n');
							}
							
							res.end();
							log(statusCode);
							
							return;
						case 'watch.m2ts':
						case 'watch.f4v':
						case 'watch.flv':
							if (!status.feature.streamer || !program.pid || (program.tuner && program.tuner.isScrambling)) {
								err404();
								return;
							}
							
							res.writeHead(statusCode, {'Content-Type': type});
							util.log('streamer: ' + program.recorded);
							
							var start    = query.start    || null;
							var duration = query.duration || null;
							var vcodec   = query.vcodec   || 'copy';
							var acodec   = query.acodec   || 'copy';
							var bitrate  = query.bitrate  || null;//r:3000k
							var ar       = query.ar       || '44100';
							var ab       = query.ab       || '128k';
							var format   = query.format   || null;
							var size     = query.size     || null;
							var rate     = query.rate     || null;
							
							if (start && (start === 'live')) {
								start = Math.round((new Date().getTime() - program.start) / 1000).toString(10);
							}
							
							if (ext === 'm2ts') {
								format = 'mpegts';
								
								if ((vcodec === 'copy') && size) { vcodec = 'mpeg2video'; }
								
								/*if (start && duration) {
									start    = parseInt(start, 10) - 1;
									duration = parseInt(duration, 10) + 1;
								}*/
							} else if (ext === 'f4v') {
								format = 'flv';
								
								if (vcodec === 'copy') { vcodec = 'libx264'; }
								if (acodec === 'copy') { acodec = 'libfaac'; }
							} else if (ext === 'flv') {
								format = 'flv';
								
								if (vcodec === 'copy') { vcodec = 'flv'; }
								if (acodec === 'copy') { acodec = 'libmp3lame'; }
							}
							
							var args = [];
							
							args.push('-v', '0');
							args.push('-threads', status.system.core.toString(10));
							
							if (start)    { args.push('-ss', start); }
							if (duration) { args.push('-t', duration); }
							
							args.push(/*'-re', */'-i', program.recorded);
							args.push('-vcodec', vcodec, '-acodec', acodec);
							args.push('-map', '0.0', '-map', '0.1');
							
							if (size)                 { args.push('-s', size); }
							if (rate)                 { args.push('-r', rate); }
							if (bitrate)              { args.push('-b', bitrate); }
							if (acodec !== 'copy')    { args.push('-ar', ar, '-ab', ab); }
							if (format === 'mpegts')  { args.push('-copyts'); }
							if (vcodec === 'libx264') { args.push('-coder', '0', '-bf', '0', '-subq', '1', '-intra'); }
							
							args.push('-y', '-f', format, 'pipe:1');
							
							var ffmpeg = child_process.spawn('ffmpeg', args);
							
							ffmpeg.stdout.on('data', function(data) {
								res.write(data, 'binary');
							});
							
							ffmpeg.stderr.on('data', function(data) {
								util.puts(data);
							});
							
							ffmpeg.on('exit', function(code) {
								res.end();
								log(statusCode);
							});
							
							req.on('close', function() {
								ffmpeg.kill('SIGKILL');
							});
							
							return;
						default:
							err404();
							return;
					}//<--switch
				} else {
					err400();
					return;
				}
				return;//<--case 'recording'
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