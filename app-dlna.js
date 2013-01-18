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
var path          = require('path');
var http          = require('http');
var fs            = require('fs');
var util          = require('util');
var os            = require('os');
var child_process = require('child_process');

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
		
		recorded = data.reverse();
		
		util.log(mes);
	}
	,
	{ create: [], now: true }
);

var host = '';
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
	
	host = ipAddress;
	
	mediaServer.server('http', host, port);
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
		
	} else {
		util.log('Unknown HTTP Request (Tentatively 200 OK): ' + req.method + ' ' + req.url);
		
		res.writeHead(200, {
			'Ccontent-Length': '0',
			'SID'            : '49ee272d-f140-4cf0-a8cf-b7caa23ff772',
			'Server'         : 'Chinachu-DLNA/beta',
			'Timeout'        : 'Second-30'
		});
		
		res.end();
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
	};
	
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
	};
	
	var responseStatic = function _responseStatic() {
		
		if (fs.existsSync(filename) === false) return resErr(404);
		
		fs.readFile(filename, function(err, data) {
			
			if (err) return resErr(500);
			
			writeHead(200);
			res.end(data);
			
			log(200);
			
			return;
		});
	};
	
	var responseM2ts = function _respopnseM2ts(id) {
		
		var isLive  = false;
		var program = chinachu.getProgramById(id, recorded);
		
		if (program === null) {
			isLive  = true;
			program = chinachu.getProgramById(id, recording);
			
			if (program === null) return resErr(404);
		}
		
		if (!fs.existsSync(program.recorded)) return resErr(410);
		
		var fstat = fs.statSync(program.recorded);
		var total = fstat.size;
		
		// for debug
		util.log(req.method + ', ' + JSON.stringify(req.headers, null, '  '));
		
		var header = {
			'Content-Type'            : 'video/vnd.dlna.mpeg-tts',
			'ContentFeatures.DLNA.ORG': 'DLNA.ORG_PN=MPEG_TS_JP_T;DLNA.ORG_OP=01;DLNA.ORG_CI=0',
			'TransferMode.DLNA.ORG'   : 'Streaming',
			'Server'                  : 'Chinachu-DLNA/beta'
		};
		
		if (!!req.headers.range) {
			
			var range = req.headers.range;
			var parts = range.replace(/bytes=/, '').split('-');
			var partialstart = parts[0];
			var partialend   = parts[1];
			
			var start     = parseInt(partialstart, 10);
			var end       = partialend ? parseInt(partialend, 10) : total - 1;
			var chunksize = (end-start) + 1;
			
			util.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);
			
			if (isLive) {
				
				var tailf  = child_process.spawn('tail', ['-f', '-c', '61440', program.recorded])
				var stream = tailf.stdout;
				
				req.on('close', function() {
					if (tailf) {
						tailf.kill('SIGKILL');
					}
				});
				
				header['Content-Range']            = 'bytes ' + start + '-';
				header['ContentFeatures.DLNA.ORG'] = 'DLNA.ORG_PN=MPEG_TS_JP_T;DLNA.ORG_OP=00;DLNA.ORG_CI=0';
			} else {
				
				
				header['Content-Range']  = 'bytes ' + start + '-' + end + '/' + total;
				header['Content-Length'] = chunksize;
				
				var stream = fs.createReadStream(program.recorded, {start: start, end: end});
			}
			
			header['Accept-Ranges']  = 'bytes';
			
			res.writeHead(206, header);
			
			stream.pipe(res);
		} else {
			
			if (!isLive) header['Content-Length'] = fstat.size;
			
			res.writeHead(200, header);
			
			var readStream = fs.createReadStream(program.recorded).pipe(res);
			
			log(200);
		}
	};
	
	//query && util.log(JSON.stringify(query, null, '  '));// for debug
	
	switch (req.url) {
		case '/cd-control.xml':
			
			if (!query['s:Envelope']) return resErr(400);
			
			var browse = query['s:Envelope']['s:Body'][0]['u:Browse'][0];
			
			var objectId = browse.ObjectID[0];
			var start    = parseInt(browse.StartingIndex[0], 10);
			var count    = parseInt(browse.RequestedCount[0], 10);
			
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
						parentId  : objectId,
						title     : 'Recorded',
						childCount: recorded.length
					});
					
					if (recording.length === 0) break;
					
					matched = 2;
					
					results.push({
						id        : 'C2',
						class     : 'container',
						parentId  : objectId,
						title     : 'Recording',
						childCount: recording.length
					});
					
					break;
				
				case 'C1':
					
					var matched = recorded.length;
					
					for (var i = 0; i < matched; i++) {
						if (start > i) continue;
						if (count !== 0 && start + count <= i) break;
						
						results.push({
							id         : recorded[i].id,
							class      : 'video',
							parentId   : objectId,
							title      : recorded[i].title,
							start      : recorded[i].start,
							//end        : recorded[i].end,
							file       : recorded[i].recorded,
							seconds    : recorded[i].seconds,
							channelType: recorded[i].channel.type,
							channelName: recorded[i].channel.name,
							genre      : recorded[i].category,
							description: recorded[i].detail || ''
						});
					}
					
					break;
				
				case 'C2':
					
					var matched = recording.length;
					
					for (var i = 0; i < matched; i++) {
						if (start > i) continue;
						if (count !== 0 && start + count <= i) break;
						
						results.push({
							id         : recording[i].id,
							class      : 'video',
							parentId   : objectId,
							title      : recording[i].title,
							start      : recording[i].start,
							//end        : recording[i].end,
							file       : recording[i].recorded,
							seconds    : 0,
							channelType: recording[i].channel.type,
							channelName: recording[i].channel.name,
							genre      : recording[i].category,
							description: recording[i].detail || ''
						});
					}
					
					break;
			}
			
			result += '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:arib="urn:schemas-arib-or-jp:elements-1-0/">';
			
			results.forEach(function(a, i) {
				
				if (a.class === 'container') {
					result += '<container id="' + a.id + '" restricted="1" parentID="' + a.parentId + '" childCount="' + a.childCount + '">';
					result += '<dc:title>' + a.title + '</dc:title>';
					result += '<dc:date>' + dateFormat(new Date(), 'yyyy-mm-dd') + '</dc:date>';
					result += '<upnp:genre></upnp:genre>';
					result += '<upnp:channelName></upnp:channelName>';
					result += '<upnp:channelNr></upnp:channelNr>';
					result += '<upnp:class>object.container.storageFolder</upnp:class>';
					result += '<res></res>';
					result += '</container>';
				}
				
				if (a. class === 'video') {
					result += '<item id="' + a.id + '" restricted="1" parentID="' + a.parentId + '">';
					result += '<dc:title>' + a.title + '</dc:title>';
					//result += '<dc:description>' + a.description + '</dc:description>';
					result += '<dc:date>' + dateFormat(new Date(a.start), 'yyyy-mm-dd') + '</dc:date>';
					result += '<arib:objectType>ARIB_' + (a.channelType === 'GR' ? 'TB' : (a.channelType === 'EX' ? 'CS' : a.channelType)) + '</arib:objectType>';
					result += '<upnp:genre>' + a.genre + '</upnp:genre>';
					result += '<upnp:channelName>' + a.channelName + '</upnp:channelName>';
					result += '<upnp:channelNr>0</upnp:channelNr>';
					result += '<upnp:album></upnp:album>';
					result += '<upnp:artist></upnp:artist>';
					result += '<upnp:originalTrackNumber></upnp:originalTrackNumber>';
					result += '<upnp:class>object.item.videoItem.videoBroadcast</upnp:class>';
					
					var SS = a.seconds % 60;
					var MM = ((a.seconds - SS) / 60) % 60;
					var HH = (((a.seconds - SS) / 60) - MM) / 60;
					
					result += '<res duration="' + HH + ':' + MM + ':' + SS + '.0" protocolInfo="http-get:*:video/vnd.dlna.mpeg-tts:DLNA.ORG_PN=MPEG_TS_JP_T;DLNA.ORG_OP=01;DLNA.ORG_CI=0">http://' + host + ':' + port + '/' + a.id + '.m2ts</res>';
					
					result += '<res duration="' + HH + ':' + MM + ':' + SS + '.0" protocolInfo="http-get:*:video/m2ts:DLNA.ORG_PN=MPEG_TS_JP_T;DLNA.ORG_OP=01;DLNA.ORG_CI=0">http://' + host + ':' + port + '/' + a.id + '.m2ts</res>';
					
					result += '<res duration="' + HH + ':' + MM + ':' + SS + '.0" protocolInfo="http-get:*:video/mpeg:DLNA.ORG_PN=MPEG_TS_JP_T;DLNA.ORG_OP=01;DLNA.ORG_CI=0">http://' + host + ':' + port + '/' + a.id + '.m2ts</res>';
					
					result += '<res duration="' + HH + ':' + MM + ':' + SS + '.0" protocolInfo="http-get:*:video/mpeg:DLNA.ORG_PN=MPEG_TS_HD_JP_ISO;DLNA.ORG_OP=01;DLNA.ORG_CI=0">http://' + host + ':' + port + '/' + a.id + '.m2ts</res>';
					
					result += '</item>';
				}
				
			});
			
			result += '</DIDL-Lite>';
			
			response += '<Result>' + result.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</Result>';
			
			response += '<NumberReturned>' + results.length + '</NumberReturned>';
			response += '<TotalMatches>' + matched + '</TotalMatches>';
			response += '<UpdateID>' + new Date().getTime() + '</UpdateID>';
			
			writeHead(200);
			res.end(envelope.replace('::response::', response));
			
			//util.log(envelope.replace('::response::', response));// for debug
			
			log(200);
			
			break;
		
		default:
			if (req.url.match(/^\/.+\.m2ts$/) !== null) {
				responseM2ts(req.url.match(/^\/(.+)\.m2ts$/)[1]);
			} else {
				responseStatic();
			}
	};
}