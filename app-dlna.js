/*!
 *  Chinachu DLNA Server Service (chinachu-dlna)
 *
 *  Copyright (c) 2013 Yuki KAN and Chinachu Project Contributors
 *  http://chinachu.akkar.in/
**/
'use strict';

var CONFIG_FILE         = __dirname + '/config.json';
var RECORDING_DATA_FILE = __dirname + '/data/recording.json';
var RECORDED_DATA_FILE  = __dirname + '/data/recorded.json';

// 標準モジュールのロード
var path = require('path');
var http = require('http');
var fs   = require('fs');
var util = require('util');
var os   = require('os');
//var child_process = require('child_process');

// ディレクトリチェック
if (!fs.existsSync('./data/') || !fs.existsSync('./log/') || !fs.existsSync('./web/')) {
	util.error('必要なディレクトリが存在しないか、カレントワーキングディレクトリが不正です。');
	process.exit(1);
}

// 終了処理
process.on('SIGQUIT', function() {
	util.log('SIGQUIT...');
	
	mediaServer.close(function() {
		process.exit(0);
	});
});

// 追加モジュールのロード
var chinachu  = require('chinachu-common');
var SSDP      = require('chinachu-ssdp').SSDP;
var xml2js    = require('xml2js');
var xmlParser = new xml2js.Parser();

// 設定の読み込み
var config = JSON.parse( fs.readFileSync(CONFIG_FILE, 'ascii') );

// ファイル更新監視: ./data/recording.json
var recording = [];
chinachu.jsonWatcher(
	RECORDING_DATA_FILE
	,
	function _onUpdated(data, err, mes) {
		
		if (err) {
			util.error(err);
			return;
		}
		
		recording = data;
		
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

var port = config.dlnaPort || 20772;

// UPnP MediaServer
var mediaServer = new SSDP;

mediaServer.addUSN('upnp:rootdevice');
mediaServer.addUSN('urn:schemas-upnp-org:device:MediaServer:1');
mediaServer.addUSN('urn:schemas-upnp-org:service:ContentDirectory:1');
mediaServer.addUSN('urn:schemas-upnp-org:service:ConnectionManager:1');

mediaServer.on('advertise-alive', function (head) {
	if (head.LOCATION === "http://192.168.1.101:20772/device.xml") return;
	
	util.log(JSON.stringify(head, null, '  '));
});

mediaServer.on('advertise-bye', function (head) {
	//
});

// This should get your local ip to pass off to the server.
require('dns').lookup(os.hostname(), function (err, ipAddress) {
	mediaServer.server('http', ipAddress, port);
});

//
// http server
//
var app = http.createServer(httpServer);
app.listen(port, '0.0.0.0');

function httpServer(req, res) {
	if (req.method === 'GET') {
		
		httpServerMain(req, res, null);
		
	} else if (req.method === 'POST') {
		
		var postBody = '';
		
		req.on('data', function(chunk) {
			postBody += chunk.toString();
		});
		
		req.on('end', function() {
			xmlParser.parseString(postBody, function(err, result) {
				httpServerMain(req, res, result || null);
			});
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
	if (location.match(/\/$/) !== null)     { location += 'device.xml'; }
	if (location.match(/(\?.*)$/) !== null) { location = location.match(/^(.+)\?.*$/)[1]; }
	
	var filename = path.join('./dlna/', location);
	
	var ext = null;
	if (filename.match(/[^\/]+\..+$/) !== null) {
		ext = filename.split('.').pop();
	}
	
	// エラーレスポンス用
	var resErr = function _resErr(code) {
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
	
	var writeHead = function _writeHead(code) {
		var type = 'text/plain';
		
		if (ext === 'xml')  { type = 'text/xml'; }
		if (ext === 'html') { type = 'text/html'; }
		if (ext === 'js')   { type = 'text/javascript'; }
		if (ext === 'css')  { type = 'text/css'; }
		if (ext === 'ico')  { type = 'image/vnd.microsoft.icon'; }
		if (ext === 'cur')  { type = 'image/vnd.microsoft.icon'; }
		if (ext === 'png')  { type = 'image/png'; }
		if (ext === 'gif')  { type = 'image/gif'; }
		if (ext === 'jpg')  { type = 'image/jpeg'; }
		
		res.writeHead(code, {
			'content-type': type,
			'server'      : [os.platform() + '/' + os.release(), 'UPnP/1.0', 'Chinachu-DLNA/beta'].join(' ')
		});
	}
	
	var responseStatic = function _responseStatic() {
		if (fs.existsSync(filename) === false) return resErr(404);
		
		fs.readFile(filename, function(err, data) {
			if (err) return resErr(500);
			
			writeHead(200);
			res.end(data);
			log(200);
			return;
		});
	}
	
	switch (req.url) {
		case '/cd-control.xml':
			
			break;
		
		default:
			responseStatic();
	}
	
	query && util.log(JSON.stringify(query, null, '  '));
}