/*!
 *  Chinachu WebUI Server Service (chinachu-wui)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://chinachu.akkar.in/
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
var querystring   = require('querystring');
var vm            = require('vm');
var os            = require('os');

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
var auth     = require('http-auth');
var socketio = require('socket.io');
var chinachu = require('chinachu-common');

// 設定の読み込み
var config = require(CONFIG_FILE);

// https or http
if (config.wuiTlsKeyPath && config.wuiTlsCertPath) {
	var https = require('spdy');
	
	var tlsOption = {
		key : fs.readFileSync(config.wuiTlsKeyPath),
		cert: fs.readFileSync(config.wuiTlsCertPath)
	};
} else {
	var http = require('http');
}

// ファイル更新監視: ./data/rules.json
var rules = [];
chinachu.jsonWatcher(
	RULES_FILE
	,
	function _onUpdated(err, data, mes) {
		if (err) {
			util.error(err);
			return;
		}
		
		rules = data;
		if (io) io.sockets.emit('rules', rules);
		util.log(mes);
	}
	,
	{ create: [], now: true }
);

// ファイル更新監視: ./data/schedule.json
var schedule = [];
chinachu.jsonWatcher(
	SCHEDULE_DATA_FILE
	,
	function _onUpdated(err, data, mes) {
		if (err) {
			util.error(err);
			return;
		}
		
		schedule = data;
		if (io) io.sockets.emit('schedule', schedule);
		util.log(mes);
	}
	,
	{ create: [], now: true }
);

// ファイル更新監視: ./data/reserves.json
var reserves = [];
chinachu.jsonWatcher(
	RESERVES_DATA_FILE
	,
	function _onUpdated(err, data, mes) {
		if (err) {
			util.error(err);
			return;
		}
		
		reserves = data;
		if (io) io.sockets.emit('reserves', reserves);
		util.log(mes);
	}
	,
	{ create: [], now: true }
);

// ファイル更新監視: ./data/recording.json
var recording = [];
chinachu.jsonWatcher(
	RECORDING_DATA_FILE
	,
	function _onUpdated(err, data, mes) {
		if (err) {
			util.error(err);
			return;
		}
		
		recording = data;
		if (io) io.sockets.emit('recording', recording);
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
	function _onUpdated(err, data, mes) {
		if (err) {
			util.error(err);
			return;
		}
		
		recorded = data;
		if (io) io.sockets.emit('recorded', recorded);
		util.log(mes);
	}
	,
	{ create: [], now: true }
);

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
		core: os.cpus().length
	}
};

//
// http server
//
if (http)  { var app = http.createServer(httpServer); }
if (https) { var app = https.createServer(tlsOption, httpServer); }

if (config.wuiHost != null) {
	app.listen(config.wuiPort, config.wuiHost);
} else {
	app.listen(config.wuiPort);
}

function httpServer(req, res) {
	if (req.method === 'GET') {
		
		httpServerMain(req, res, url.parse(req.url, true).query);
		
	} else if (req.method === 'POST') {
		
		var postBody = '';
		
		req.on('data', function(chunk) {
			postBody += chunk.toString();
		});
		
		req.on('end', function() {
			httpServerMain(req, res, querystring.parse(postBody));
		});
		
	}
}

function httpServerMain(req, res, query) {
	// http request logging
	var log = function(statusCode) {
		util.log([
			/*statusCode*/ statusCode,
			/*method+url*/ req.method + ':' + req.url,
			/*remoteAddr*/ req.headers['x-forwarded-for'] || req.client.remoteAddress,
			/*referer   */ /* req.headers.referer || '-', */
			/*userAgent */ (req.headers['user-agent'] || '').split(' ').pop() || '-'
		].join(' '));
	};
	
	// serve static file
	var location = req.url;
	if (location.match(/\/$/) !== null)     { location += 'index.html'; }
	if (location.match(/(\?.*)$/) !== null) { location = location.match(/^(.+)\?.*$/)[1]; }
	
	// HTTPメソッド指定を上書き
	if (query.method) {
		req.method = query.method.toUpperCase();
		delete query.method;
	}
	
	if (query._method) {
		req.method = query._method.toUpperCase();
		delete query._method;
	}
	
	var filename = path.join('./web/', location);
	
	var ext = null;
	if (filename.match(/[^\/]+\..+$/) !== null) {
		ext = filename.split('.').pop();
	}
	
	// エラーレスポンス用
	function resErr(code) {
		res.writeHead(code, {'content-type': 'text/plain'});
		switch (code) {
			case 400:
				res.write('400 Bad Request\n');
				break;
			case 402:
				res.write('402 Payment Required\n');
				break;
			case 401:
				res.write('401 Unauthorized\n');
				break;
			case 403:
				res.write('403 Forbidden\n');
				break;
			case 404:
				res.write('404 Not Found\n');
				break;
			case 405:
				res.write('405 Method Not Allowed\n');
				break;
			case 406:
				res.write('406 Not Acceptable\n');
				break;
			case 407:
				res.write('407 Proxy Authentication Required\n');
				break;
			case 408:
				res.write('408 Request Timeout\n');
				break;
			case 409:
				res.write('409 Conflict\n');
				break;
			case 410:
				res.write('410 Gone\n');
				break;
			case 411:
				res.write('411 Length Required\n');
				break;
			case 412:
				res.write('412 Precondition Failed\n');
				break;
			case 413:
				res.write('413 Request Entity Too Large\n');
				break;
			case 414:
				res.write('414 Request-URI Too Long\n');
				break;
			case 415:
				res.write('415 Unsupported Media Type\n');
				break;
			case 416:
				res.write('416 Requested Range Not Satisfiable\n');
				break;
			case 417:
				res.write('417 Expectation Failed\n');
				break;
			case 429:
				res.write('429 Too Many Requests\n');
				break;
			case 451:
				res.write('451 Unavailable For Legal Reasons\n');
				break;
			case 500:
				res.write('500 Internal Server Error\n');
				break;
			case 501:
				res.write('501 Not Implemented\n');
				break;
			case 502:
				res.write('502 Bad Gateway\n');
				break;
			case 503:
				res.write('503 Service Unavailable\n');
				break;
		}
		res.end();
		log(code);
	}
	
	function writeHead(code) {
		var type = 'text/plain';
		
		if (ext === 'html') { type = 'text/html'; }
		if (ext === 'js')   { type = 'text/javascript'; }
		if (ext === 'css')  { type = 'text/css'; }
		if (ext === 'ico')  { type = 'image/vnd.microsoft.icon'; }
		if (ext === 'cur')  { type = 'image/vnd.microsoft.icon'; }
		if (ext === 'png')  { type = 'image/png'; }
		if (ext === 'gif')  { type = 'image/gif'; }
		if (ext === 'jpg')  { type = 'image/jpeg'; }
		if (ext === 'f4v')  { type = 'video/mp4'; }
		if (ext === 'm4v')  { type = 'video/mp4'; }
		if (ext === 'mp4')  { type = 'video/mp4'; }
		if (ext === 'flv')  { type = 'video/x-flv'; }
		if (ext === 'webm') { type = 'video/webm'; }
		if (ext === 'm2ts') { type = 'video/MP2T'; }
		if (ext === 'm3u8') { type = 'video/x-mpegURL'; }
		if (ext === 'asf')  { type = 'video/x-ms-asf'; }
		if (ext === 'json') { type = 'application/json'; }
		if (ext === 'xspf') { type = 'application/xspf+xml'; }
		
		var head = {
			'content-type': type,
			'server'      : 'chinachu-wui'
		};
		
		if (req.isSpdy) head['X-Chinachu-Spdy'] = req.spdyVersion;
		
		res.writeHead(code, head);
	}
	
	// 静的ファイルまたはAPIレスポンスの分岐
	if (req.url.match(/^\/api\/.*$/) === null) {
		if (fs.existsSync(filename) === false) return resErr(404);
		
		if (req.url.match(/^\/apple-.+\.png$/) !== null) {
			responseStatic();
		} else if (!basic) {
			responseStatic();
		} else {
			basic.apply(req, res, responseStatic);
		}
	} else {
		if (basic) {
			basic.apply(req, res, responseApi);
		} else {
			responseApi();
		}
	}
	
	function responseStatic() {
		fs.readFile(filename, function(err, data) {
			if (err) return resErr(500);
			
			writeHead(200);
			res.end(data);
			log(200);
			return;
		});
	}
	
	function responseApi() {
		var dir  = location.replace('/api/', '').replace(/\.[a-z0-9]+$/, '');
		var dirs = dir.split('/');
		var addr = dir.replace(/^[^\/]+\/?/, '/');
		
		if (dirs[0] === 'index.html') return resErr(400);
		
		var resourceFile = './api/resource-' + dirs[0] + '.json';
		
		if (fs.existsSync(resourceFile) === false) return resErr(404);
		
		fs.readFile(resourceFile, function(err, json) {
			if (err) return resErr(500);
			
			try {
				var r = JSON.parse(json);
			} catch (e) {
				util.error(e);
				return resErr(500);
			}
			
			var pattern;
			var param;
			var target = null;
			
			for (var k in r) {
				pattern = new RegExp(k.replace(/:[^\/]+/g, '([^/]+)'));
				
				if (addr.match(pattern) !== null) {
					target = r[k];
					param  = {};
					
					if (k.match(pattern).length > 1) {
						k.match(pattern).forEach(function(a, i) {
							if (i === 0) return;
							
							param[a.replace(':', '')] = addr.match(pattern)[i];
						});
					}
				}
				
				
			}
			
			if (target === null) return resErr(400);
			if (target.methods.indexOf(req.method.toLowerCase()) === -1) return resErr(405);
			if (target.types.indexOf(ext) === -1) return resErr(415);
			
			var scriptFile = './api/script-' + target.script + '.vm.js';
			
			if (fs.existsSync(scriptFile) === false) return resErr(501);
			
			var sandbox = {
				request      : req,
				response     : res,
				path         : path,
				fs           : fs,
				url          : url,
				util         : util,
				child_process: child_process,
				Buffer       : Buffer,
				chinachu     : chinachu,
				config       : config,
				define: {
					CONFIG_FILE        : CONFIG_FILE,
					RULES_FILE         : RULES_FILE,
					RESERVES_DATA_FILE : RESERVES_DATA_FILE,
					SCHEDULE_DATA_FILE : SCHEDULE_DATA_FILE,
					RECORDING_DATA_FILE: RECORDING_DATA_FILE,
					RECORDED_DATA_FILE : RECORDED_DATA_FILE,
					OPERATOR_LOG_FILE  : OPERATOR_LOG_FILE,
					WUI_LOG_FILE       : WUI_LOG_FILE,
					SCHEDULER_LOG_FILE : SCHEDULER_LOG_FILE
				},
				data: {
					rules    : rules,
					schedule : schedule,
					reserves : reserves,
					recording: recording,
					recorded : recorded,
					status   : status
				},
				setInterval: setInterval,
				setTimeout : setTimeout,
				clearInterval: clearInterval,
				clearTimeout : clearTimeout
			};
			
			var isClosed = false;
			
			sandbox.request.query  = query;
			sandbox.request.param  = param;
			sandbox.request.type   = ext;
			sandbox.response.head  = writeHead;
			sandbox.response.error = function(code) {
				resErr(code);
				isClosed = true;
			};
			
			sandbox.response.exit = function(data, encoding) {
				try {
					res.end(data, encoding);
				} catch (e) {
					util.log(e);
				}
				onEnd();
			};
			
			function onEnd() {
				if (!isClosed) {
					isClosed = true;
					
					log(res.statusCode);
					
					setTimeout(function() {
						process.nextTick(gc);
					}, 3000);
				}
			}
			
			try {
				vm.runInNewContext(fs.readFileSync(scriptFile), sandbox, scriptFile);
			} catch (e) {
				if (!isClosed) {
					resErr(500);
					isClosed = true;
				}
				
				util.error(e);
			}
			
			return;
		});
		
		return;
	}
}

//
// socket.io server
//
var io = socketio.listen(app);
io.enable('browser client minification');
io.set('log level', 1);
io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
io.sockets.on('connection', ioServer);

function ioServer(socket) {
	// ヘッダを確認
	if (
		!socket.handshake.headers.authorization ||
		(socket.handshake.headers.authorization.match(/^Basic .+$/) === null)
	) {
		socket.disconnect();
		return;
	}
	
	// Base64文字列を取り出す
	var auth = socket.handshake.headers.authorization.split(' ')[1];
	
	// Base64デコード
	try {
		auth = new Buffer(auth, 'base64').toString('ascii');
	} catch (e) {
		socket.disconnect();
		return;
	}
	
	// 認証
	if (config.wuiUsers && config.wuiUsers.indexOf(auth) === -1) {
		socket.disconnect();
		return;
	}
	
	// 通ってよし
	ioServerMain(socket);
}

function ioServerMain(socket) {
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
