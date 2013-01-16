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
var chinachu   = require('chinachu-common');
var SSDP       = require('chinachu-ssdp').SSDP;
var xml2js     = require('xml2js');
var xmlParser  = new xml2js.Parser();
var dateFormat = require('dateformat');

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
	//util.log(JSON.stringify(head, null, '  '));
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
			case 403:
				res.write('403 Forbidden\n');
				break;
			case 404:
				res.write('404 Not Found\n');
				break;
			case 429:
				res.write('429 Too Many Requests\n');
				break;
			case 500:
				res.write('500 Internal Server Error\n');
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
		if (ext === 'bmp')  { type = 'image/bmp'; }
		
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
			
			var browse = query['s:Envelope']['s:Body'][0]['u:Browse'][0];
			
			var objectId = browse.ObjectID[0];
			var start    = browse.StartingIndex[0];
			var count    = browse.RequestedCount[0];
			
			var envelope = '';
			var response = '';
			var matched  = 0;
			var results  = [];
			var result   = '';
			
			envelope += '<?xml version="1.0"?>\r\n';
			envelope += '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">';
			envelope += '<s:Body>';
			envelope += '<u:BrowseResponse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">';
			envelope += '::response::';
			envelope += '</u:BrowseResponse>';
			envelope += '</s:Body>';
			envelope += '</s:Envelope>';
			
			switch (objectId) {
				case '0':
					
					matched = 1;
					
					results.push({
						id        : 'C1',
						class     : 'container',
						parentId  : '0',
						title     : 'Recorded',
						childCount: recorded.length
					});
					
					break;
			}
			
			result += '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">';
			
			results.forEach(function(a, i) {
				
				if (a.class === 'container') {
					result += '<container id="' + a.id + '" restricted="1" parentID="' + a.parentId + '" childCount="' + a.childCount + '">';
					result += '<dc:title>' + a.title + '</dc:title>';
					result += '<dc:date>' + dateFormat(new Date(), 'yyyy-mm-dd') + '</dc:date>';
					result += '<upnp:class>object.container.storageFolder</upnp:class>';
					result += '</container>';
				}
				
				
			});
			
			result += '</DIDL-Lite>';
			
			response += '<Result>' + result.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</Result>';
			
			response += '<NumberReturned>' + results.length + '</NumberReturned>';
			response += '<TotalMatches>' + matched + '</TotalMatches>';
			response += '<UpdateID>' + new Date().getTime() + '</UpdateID>';
			
			writeHead(200);
			res.end(envelope.replace('::response::', response));
			
			util.log(envelope.replace('::response::', response));
			
			log(200);
			
			break;
		
		default:
			responseStatic();
	}
	
	query && util.log(JSON.stringify(query, null, '  '));
}