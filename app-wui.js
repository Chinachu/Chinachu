/*!
 *  Chinachu WebUI Server Service (chinachu-wui)
 *
 *  Copyright (c) 2016 Yuki KAN and Chinachu Project Contributors
 *  https://chinachu.moe/
**/
'use strict';

process.env.PATH = `${__dirname}/usr/bin:${process.env.PATH}`;

const CONFIG_FILE = __dirname + '/config.json';
const RULES_FILE = __dirname + '/rules.json';
const RESERVES_DATA_FILE = __dirname + '/data/reserves.json';
const SCHEDULE_DATA_FILE = __dirname + '/data/schedule.json';
const RECORDING_DATA_FILE = __dirname + '/data/recording.json';
const RECORDED_DATA_FILE = __dirname + '/data/recorded.json';
const SCHEDULER_LOG_FILE = __dirname + '/log/scheduler';

// Load Config
const pkg = require("./package.json");
const config = require(CONFIG_FILE);

// Modules
const path = require('path');
const fs = require('fs');
const util = require('util');
const child_process = require('child_process');
const url = require('url');
const querystring = require('querystring');
const vm = require('vm');
const os = require('os');
const zlib = require('zlib');
const events = require('events');
const http = require('http');
const https = require('https');
const auth = require('http-auth');
const socketio = require('socket.io');
const chinachu = require('chinachu-common');
const ip = require("ip");
const geoip = require('geoip-lite');
const mdns = require('mdns-js');
const mirakurun = new (require("mirakurun").default)();

// Directory Checking
if (!fs.existsSync('./data/') || !fs.existsSync('./log/') || !fs.existsSync('./web/')) {
	console.error('FATAL: Current working directory is invalid.');
	process.exit(1);
}

const apps = require("./processes.json").apps;

const WUI_LOG_FILE = !!process.env.pm_id ? apps[0].out_file : (__dirname + '/log/wui');
const OPERATOR_LOG_FILE = !!process.env.pm_id ? apps[1].out_file : (__dirname + '/log/operator');
const OPERATOR_PID_FILE = (() => {
	if (process.env.pm_id) {
		const jlist = JSON.parse(child_process.execSync("pm2 jlist"));
		const proc = jlist.find(_proc => _proc.name === "chinachu-operator");
		return proc.pm2_env.pm_pid_path;
	} else {
		return "/var/run/chinachu-operator.pid";
	}
})();

// SIGQUIT
process.on('SIGQUIT', () => {
	setTimeout(() => {
		serverMdns && serverMdns.stop()
		openServerMdns && openServerMdns.stop()
		// Wait stopping mDNS service
		setTimeout(() => {
			process.exit(0);
		}, 1000);
	}, 0);
});

// Uncaught Exception
process.on('uncaughtException', err => {

	if (err.toString() === 'Error: read ECONNRESET') {
		util.log('ECONNRESET');
		return;
	}

	console.error('uncaughtException: ' + err);
});

// setuid
if (process.platform !== "win32") {
	if (process.getuid() === 0) {
		if (typeof config.gid === "string" || typeof config.gid === "number") {
			process.setgid(config.gid);
		} else {
			process.setgid('video');
		}
		if (typeof config.uid === "string" || typeof config.uid === "number") {
			process.setuid(config.uid);
		} else {
			console.error("[fatal] 'uid' required in config.");
			process.exit(1);
		}
	}
}

// Mirakurun Client
const mirakurunPath = config.mirakurunPath || config.schedulerMirakurunPath || "http+unix://%2Fvar%2Frun%2Fmirakurun.sock/";

if (/(?:\/|\+)unix:/.test(mirakurunPath) === true) {
	const standardFormat = /^http\+unix:\/\/([^\/]+)(\/?.*)$/;
	const legacyFormat = /^http:\/\/unix:([^:]+):?(.*)$/;

	if (standardFormat.test(mirakurunPath) === true) {
		mirakurun.socketPath = mirakurunPath.replace(standardFormat, "$1").replace(/%2F/g, "/");
		mirakurun.basePath = path.join(mirakurunPath.replace(standardFormat, "$2"), mirakurun.basePath);
	} else {
		mirakurun.socketPath = mirakurunPath.replace(legacyFormat, "$1");
		mirakurun.basePath = path.join(mirakurunPath.replace(legacyFormat, "$2"), mirakurun.basePath);
	}
} else {
	const urlObject = url.parse(mirakurunPath);
	mirakurun.host = urlObject.hostname;
	mirakurun.port = urlObject.port;
	mirakurun.basePath = path.join(urlObject.pathname, mirakurun.basePath);
}

mirakurun.userAgent = `Chinachu/${pkg.version} (wui)`;
mirakurun.priority = 0;

console.info(mirakurun);

// etc.
const timer = {};
const emptyFunction = function () {};
const status = {
	connectedCount: 0,
	feature: {
		previewer: true,
		streamer: true,
		filer: true,
		configurator: true,
		normalizationForm: config.normalizationForm
	},
	system: {
		core: os.cpus().length
	},
	operator: {
		alive: false,
		pid: null
	},
	wui: {
		alive: false,
		pid: null
	}
};

// HTTPS
var tlsOption = null;
var tlsEnabled = !!config.wuiTlsKeyPath && !!config.wuiTlsCertPath;
if (tlsEnabled) {
	tlsOption = {
		key : fs.readFileSync(config.wuiTlsKeyPath),
		cert: fs.readFileSync(config.wuiTlsCertPath),
		secureProtocol: 'SSLv23_method',
		secureOptions: require('constants').SSL_OP_NO_SSLv2 | require('constants').SSL_OP_NO_SSLv3
	};

	// 秘密鍵または pfx のパスフレーズを表す文字列
	if (config.wuiTlsPassphrase) { tlsOption.passphrase = config.wuiTlsPassphrase; }

	if (config.wuiTlsRequestCert) { tlsOption.requestCert = config.wuiTlsRequestCert; }
	if (config.wuiTlsRejectUnauthorized) { tlsOption.rejectUnauthorized = config.wuiTlsRejectUnauthorized; }
	if (config.wuiTlsCaPath) { tlsOption.ca = [ fs.readFileSync(config.wuiTlsCaPath) ]; }
}

// Basic Auth
let basic = null;
const basicAuthEnabled = config.wuiUsers && (config.wuiUsers.length > 0);
if (basicAuthEnabled) {
	basic = auth.basic({
		realm: 'Authentication.'
	}, function (username, password, callback) {
		callback(config.wuiUsers.indexOf([username, password].join(':')) !== -1);
	});
}

// Open Server
const openServerEnabled = config.wuiOpenServer === true;

var rules     = [];
var schedule  = [];
var reserves  = [];
var recording = [];
var recorded  = [];

// Init HTTP Server
let server, openServer, httpOpenServer;
let serverMdns, openServerMdns;

if (tlsEnabled) {
	if (basicAuthEnabled) {
		server = https.createServer(basic, tlsOption, httpServer);
	} else {
		server = https.createServer(tlsOption, httpServer);
	}
} else {
	if (basicAuthEnabled) {
		server = http.createServer(basic, httpServer);
	} else {
		server = http.createServer(httpServer);
	}
}

if (config.wuiPort) {
	server.timeout = 240000;

	server.listen(config.wuiPort, config.wuiHost || '0.0.0.0', function () {
		util.log((tlsEnabled ? 'HTTPS' : 'HTTP') + ' Server Listening on ' + util.inspect(server.address()));
		if (config.wuiMdnsAdvertisement === true) {
			// Start mDNS advertisement
			serverMdns = mdns.createAdvertisement(mdns.tcp(tlsEnabled ? '_https' : '_http'), config.wuiPort, {
				name: 'Chinachu on ' + os.hostname(),
				host: os.hostname(),
				txt: {
					txtvers: '1',
					'Version': 'gamma',
					'Password': basicAuthEnabled
				}
			});
			serverMdns.start();
			util.log((tlsEnabled ? 'HTTPS' : 'HTTP') + ' Server mDNS advertising started.');
		}
	});

	console.error('**DEPRECATION WARNING**: please remove `wuiPort` and use `wuiOpenServer` instead.');
}

// Open Server for Access from LAN.
if (openServerEnabled) {
	openServer = http.createServer(httpServer);
	openServer.timeout = 0;

	let hostIp = config.wuiOpenHost;
	if (!hostIp) {
		const addresses = [];

		const interfaces = os.networkInterfaces();
		Object.keys(interfaces).forEach(k => {
			interfaces[k]
				.filter(a => {
					return (
						a.family === "IPv4" &&
						a.internal === false &&
						ip.isPrivate(a.address) === true
					);
				})
				.forEach(a => addresses.push(a.address));
		});

		hostIp = addresses[0];

		console.log("============================================================");
		console.log("Detected Private IPv4:", addresses);
		console.log("Selected Private IPv4 for Open Server:", addresses[0]);
		console.log("NOTE: set `wuiOpenHost` to fix address for listen.");
		console.log("============================================================");
	}

	openServer.listen(config.wuiOpenPort || 20772, hostIp, () => {
		util.log('HTTP Open Server Listening on ' + util.inspect(openServer.address()));
		if (config.wuiMdnsAdvertisement === true) {
			// Start mDNS advertisement
			openServerMdns = mdns.createAdvertisement(mdns.tcp('_http'), config.wuiOpenPort || 20772, {
				name: 'Chinachu Open Server on ' + os.hostname(),
				host: os.hostname(),
				txt: {
					txtvers: '1',
					'Version': 'gamma',
					'Password': false
				}
			});
			openServerMdns.start();
			util.log('HTTP Open Server mDNS advertising started.');
		}
	});
}

// HTTP Server
function httpServer(req, res) {

	var q = '';

	switch (req.method) {
	case 'GET':
	case 'HEAD':

		q = url.parse(req.url, false).query || '';

		if (q.match(/^\{.*\}$/) === null) {
			q = querystring.parse(q);
		} else {
			try {
				q = JSON.parse(q);
			} catch (e) {
				q = {};
			}
		}

		httpServerMain(req, res, q);
		q = void 0;

		break;

	case 'POST':
	case 'PUT':
	case 'DELETE':

		req.on('data', function (chunk) {
			q += chunk.toString();
		});

		req.once('end', function () {
			if (q.trim().match(/^\{(\n|.)*\}$/) === null) {
				q = querystring.parse(q);
			} else {
				try {
					q = JSON.parse(q.trim());
				} catch (e) {
					q = {};
				}
			}

			httpServerMain(req, res, q);
			q = void 0;
		});

		break;

	default:

		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('400 Bad Request\n');
		util.log('400');
	}
}

function httpServerMain(req, res, query) {
	var remoteAddress = req.client.remoteAddress;

	if (config.wuiXFF === true && req.headers['x-forwarded-for']) {
		remoteAddress = req.headers['x-forwarded-for'].split(',')[0];
	}

	if (/^\:\:ffff\:[^\:]+/.test(remoteAddress) === true) {
		remoteAddress = remoteAddress.split(':')[3];
	}

	// http request logging
	var log = function (statusCode) {
		util.log([
			statusCode,
			req.method + ':' + req.url,
			remoteAddress,
			'"' + (req.headers['user-agent'] || '-') + '"'
		].join(' '));
	};

	// country restriction
	if (Array.isArray(config.wuiAllowCountries) && config.wuiAllowCountries.length > 0) {
		var geo = geoip.lookup(remoteAddress);
		if (geo !== null && config.wuiAllowCountries.indexOf(geo.country) === -1) {
			res.writeHead(403, {'content-type': 'text/plain'});
			res.end('403 Forbidden\n');
			log(403);
			console.warn('Non-allowed Country IP Blocked', remoteAddress, JSON.stringify(geo));
		}
	}

	// serve static file
	var location = req.url;
	if (location.match(/(\?.*)$/) !== null) { location = location.match(/^(.+)\?.*$/)[1]; }
	if (location.match(/\/$/) !== null) { location += 'index.html'; }

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
	var resErr = function (code) {

		if (res.headersSent === false) {
			res.writeHead(code, {'content-type': 'text/plain'});

			if (req.method !== 'HEAD') {
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
			}
			log(code);
		} else {
			log(res.statusCode + '(!' + code + ')');
		}
		res.end();
	};

	var writeHead = function (code) {
		var type = 'text/plain';

		if (ext === 'html') { type = 'text/html'; }
		if (ext === 'js') { type = 'text/javascript'; }
		if (ext === 'css') { type = 'text/css'; }
		if (ext === 'ico') { type = 'image/vnd.microsoft.icon'; }
		if (ext === 'cur') { type = 'image/vnd.microsoft.icon'; }
		if (ext === 'png') { type = 'image/png'; }
		if (ext === 'gif') { type = 'image/gif'; }
		if (ext === 'jpg') { type = 'image/jpeg'; }
		if (ext === 'f4v') { type = 'video/mp4'; }
		if (ext === 'm4v') { type = 'video/mp4'; }
		if (ext === 'mp4') { type = 'video/mp4'; }
		if (ext === 'flv') { type = 'video/x-flv'; }
		if (ext === 'webm') { type = 'video/webm'; }
		if (ext === 'm2ts') { type = 'video/MP2T'; }
		if (ext === 'asf') { type = 'video/x-ms-asf'; }
		if (ext === 'json') { type = 'application/json; charset=utf-8'; }
		if (ext === 'xspf') { type = 'application/xspf+xml'; }

		var head = {
			'Content-Type'             : type,
			'Server'                   : 'Chinachu (Node)',
			'Cache-Control'            : 'no-cache',
			'X-Content-Type-Options'   : 'nosniff',
			'X-Frame-Options'          : 'SAMEORIGIN',
			'X-UA-Compatible'          : 'IE=Edge,chrome=1',
			'X-XSS-Protection'         : '1; mode=block'
		};

		res.writeHead(code, head);
	};

	// ヘッダの確認
	if (!req.headers.host) { return resErr(400); }

	var responseStatic = function () {

		if (fs.existsSync(filename) === false) { return resErr(404); }

		if (req.method !== 'HEAD' && req.method !== 'GET') {
			res.setHeader('Allow', 'HEAD, GET');
			return resErr(405);
		}

		if (['ico', 'png'].indexOf(ext) !== -1) {
			res.setHeader('Cache-Control', 'private, max-age=86400');
		}

		var fstat = fs.statSync(filename);

		res.setHeader('Accept-Ranges', 'bytes');
		res.setHeader('Last-Modified', new Date(fstat.mtime).toUTCString());

		if (req.headers['if-modified-since'] && req.headers['if-modified-since'] === new Date(fstat.mtime).toUTCString()) {
			writeHead(304);
			log(304);
			return res.end();
		}

		var range = {};
		if (req.headers.range) {
			var bytes = req.headers.range.replace(/bytes=/, '').split('-');
			range.start = parseInt(bytes[0], 10);
			range.end   = parseInt(bytes[1], 10) || fstat.size - 1;

			if (range.start > fstat.size || range.end > fstat.size) {
				return resErr(416);
			}

			res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + fstat.size);
			res.setHeader('Content-Length', range.end - range.start + 1);

			writeHead(206);
			log(206);
		} else {
			res.setHeader('Content-Length', fstat.size);

			writeHead(200);
			log(200);
		}

		if (req.method === 'GET') {
			fs.createReadStream(filename, range || {}).pipe(res);
		} else {
			res.end();
		}
	};

	var responseApi = function () {
		var dir  = location.replace('/api/', '').replace(/\.[a-z0-9]+$/, '');
		var dirs = dir.split('/');
		var addr = dir.replace(/^[^\/]+\/?/, '/');

		if (dirs[0] === 'index.html') { return resErr(400); }

		var resourceFile = './api/resource-' + dirs[0] + '.json';

		if (fs.existsSync(resourceFile) === false) { return resErr(404); }

		fs.readFile(resourceFile, function (err, json) {
			if (err) { return resErr(500); }

			var r;
			try {
				r = JSON.parse(json);
			} catch (e) {
				console.error(e);
				return resErr(500);
			}

			var pattern;
			var param;
			var target = null;

			var k, i, l;
			for (k in r) {
				if (r.hasOwnProperty(k)) {
					pattern = new RegExp(k.replace(/:[^\/]+/g, '([^/]+)'));

					if (addr.match(pattern) !== null) {
						target = r[k];
						param  = {};

						if (k.match(pattern).length > 1) {
							for (i = 1, l = k.match(pattern).length; i < l; i++) {
								param[k.match(pattern)[i].replace(':', '')] = addr.match(pattern)[i];
							}
						}
					}
				}
			}

			if (target === null) { return resErr(400); }
			if (target.methods.indexOf(req.method.toLowerCase()) === -1) {
				res.setHeader('Allow', target.methods.join(', ').toUpperCase());
				return resErr(405);
			}
			if (target.types.indexOf(ext) === -1) { return resErr(415); }

			var scriptFile = './api/script-' + target.script + '.vm.js';

			if (fs.existsSync(scriptFile) === false) { return resErr(501); }

			res._end = res.end;
			res.end  = function () {
				res.end = res._end;
				res.end.apply(res, arguments);
				res.emit('end');
			};

			var acceptEncoding = req.headers['accept-encoding'];
			if (!acceptEncoding) { acceptEncoding = ''; }
			var encoding = '';

			if (acceptEncoding.match(/deflate/)) {
				encoding = 'deflate';
			}

			if (req.headers['user-agent'] && req.headers['user-agent'].match(/Trident/)) {
				encoding = '';
			}

			var sandbox = {
				request      : req,
				response     : res,
				path         : path,
				fs           : fs,
				url          : url,
				util         : util,
				child_process: child_process,
				Buffer       : Buffer,
				zlib         : zlib,
				chinachu     : chinachu,
				mirakurun    : mirakurun,
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
					SCHEDULER_LOG_FILE : SCHEDULER_LOG_FILE,
					OPERATOR_PID_FILE  : OPERATOR_PID_FILE
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
				clearTimeout : clearTimeout,

				children: []
			};

			var isClosed = false;
			var cleanup;

			sandbox.request.query    = query;
			sandbox.request.param    = param;
			sandbox.request.type     = ext;
			sandbox.request.encoding = encoding;
			sandbox.response.head    = writeHead;
			sandbox.response.error   = function (code) {

				isClosed = true;

				resErr(code);

				cleanup();
			};

			// DEPRECATED
			sandbox.response.exit = function (data, encoding) {

				util.log('response.exit is DEPRECATED: ' + scriptFile);

				try {
					res.end(data, encoding);
				} catch (e) {
					util.log(e);
				}
			};

			var onResponseClose = function () {

				if (!isClosed) {
					isClosed = true;

					log(res.statusCode);
				}

				cleanup();
			};

			cleanup = function () {

				setTimeout(function () {

					sandbox.children.forEach(function (pid) {

						util.log('child process killing: PID=' + pid);

						try {
							process.kill(pid, 'SIGKILL');
						} catch (e) {
						}
					});

					sandbox = null;
				}, 1000);

				res.removeListener('close', onResponseClose);
				res.removeListener('finish', onResponseClose);

				cleanup = emptyFunction;
			};

			res.on('close', onResponseClose);
			res.on('finish', onResponseClose);

			try {
				vm.runInNewContext(fs.readFileSync(scriptFile), sandbox, scriptFile);
			} catch (ee) {
				if (!isClosed) {
					resErr(500);
					isClosed = true;
				}

				console.error(ee);
			}

			return;
		});

		return;
	};

	// 静的ファイルまたはAPIレスポンスの分岐
	if (req.url.match(/^\/api\/.*$/) === null) {
		if (/^web\//.test(filename) === false) { return resErr(400); }
		if (fs.existsSync(filename) === false) { return resErr(404); }

		responseStatic();
	} else {
		responseApi();
	}
}

//
// socket.io server
//

var ios = new events.EventEmitter();
ios.setMaxListeners(0);

function iosAddEventListner(io, eventName) {
	return ios.on(eventName, function () {
		var i, l, args = [];
		for (i = 0, l = arguments.length; i < l; i++) {
			args.push(arguments[i]);
		}
		io.emit.apply(io, [eventName].concat(args));
	});
}

function ioAddListener(server, isOpen) {
	var io = socketio(server);

	io.on('connection', isOpen ? ioOpenServer : ioServer);

	// listen event
	iosAddEventListner(io, 'status');
	iosAddEventListner(io, 'notify-rules');
	iosAddEventListner(io, 'notify-reserves');
	iosAddEventListner(io, 'notify-recording');
	iosAddEventListner(io, 'notify-recorded');
	iosAddEventListner(io, 'notify-schedule');

	return io;
}

ioAddListener(server);
if (openServerEnabled === true) {
	ioAddListener(openServer, true);
}

function ioOpenServer(socket) {
	socket.isOpen = true;
	ioServer(socket);
}

function ioServer(socket) {
	if (basicAuthEnabled && !socket.isOpen) {
		// ヘッダを確認
		if (!socket.handshake.headers.authorization || (socket.handshake.headers.authorization.match(/^Basic .+$/) === null)) {
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
	}

	// 通ってよし
	ioServerMain(socket);
}

function ioServerMain(socket) {
	++status.connectedCount;

	socket.on('disconnect', ioServerSocketOnDisconnect);

	// broadcast
	ios.emit('status', status);

	socket.emit('notify-rules');
	socket.emit('notify-reserves');
	socket.emit('notify-recording');
	socket.emit('notify-recorded');
	socket.emit('notify-schedule');
}

function ioServerSocketOnDisconnect(socket) {
	--status.connectedCount;
	ios.emit('status', status);
}

// ファイル更新監視: ./data/rules.json
chinachu.jsonWatcher(
	RULES_FILE,
	function _onUpdated(err, data, mes) {
		if (err) {
			console.error(err);
			return;
		}

		rules = data;
		ios.emit('notify-rules');
		util.log(mes);
	},
	{ create: [], now: true }
);

// ファイル更新監視: ./data/schedule.json
chinachu.jsonWatcher(
	SCHEDULE_DATA_FILE,
	function _onUpdated(err, data, mes) {
		if (err) {
			console.error(err);
			return;
		}

		schedule = data;
		ios.emit('notify-schedule');
		util.log(mes);
	},
	{ create: [], now: true }
);

// ファイル更新監視: ./data/reserves.json
chinachu.jsonWatcher(
	RESERVES_DATA_FILE,
	function _onUpdated(err, data, mes) {
		if (err) {
			console.error(err);
			return;
		}

		reserves = data;
		ios.emit('notify-reserves');
		util.log(mes);
	},
	{ create: [], now: true }
);

// ファイル更新監視: ./data/recording.json
chinachu.jsonWatcher(
	RECORDING_DATA_FILE,
	function _onUpdated(err, data, mes) {
		if (err) {
			console.error(err);
			return;
		}

		recording = data;
		ios.emit('notify-recording');
		util.log(mes);
	},
	{ create: [], now: true }
);

// ファイル更新監視: ./data/recorded.json
chinachu.jsonWatcher(
	RECORDED_DATA_FILE,
	function _onUpdated(err, data, mes) {
		if (err) {
			console.error(err);
			return;
		}

		recorded = data;
		ios.emit('notify-recorded');
		util.log(mes);
	},
	{ create: [], now: true }
);

// プロセス監視
function processChecker() {

	ios.emit('status', status);

	var c = chinachu.createCountdown(1, chinachu.createTimeout(processChecker, 5000));

	if (fs.existsSync(OPERATOR_PID_FILE) === true) {
		fs.readFile(OPERATOR_PID_FILE, function (err, pid) {

			if (err) { return c.tick(); }

			pid = pid.toString().trim();

			child_process.exec('ps h -p ' + pid + ' -o %cpu,rss', function (err, stdout) {

				if (stdout === '') {
					status.operator.alive = false;
					status.operator.pid   = null;
				} else {
					status.operator.alive = true;
					status.operator.pid   = parseInt(pid, 10);
				}

				c.tick();
			});
		});
	} else {
		status.operator.alive = false;
		status.operator.pid   = null;

		c.tick();
	}
}
processChecker();
