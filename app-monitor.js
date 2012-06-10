/*!
 * chinachu-monitor
**/

var CONFIG_FILE    = __dirname + '/config.json';
var RULES_FILE     = __dirname + '/rules.json';
var RESERVES_FILE  = __dirname + '/reserves.json';

// load modules
var http     = require('http');
var auth     = require('http-auth');
var util     = require('util');
var exec     = require('child_process').exec;
var fs       = require('fs');
var path     = require('path');
var socketio = require('socket.io');

// configuration
var config = JSON.parse( fs.readFileSync(CONFIG_FILE, 'ascii') );

config.scheduleData = __dirname + config.scheduleData;
config.recordingLog = __dirname + config.recordingLog;
config.schedulerLog = __dirname + config.schedulerLog;
config.webDir       = __dirname + '/web';

// watch
var rules = JSON.parse( fs.readFileSync(RULES_FILE, 'ascii') );
var rulesTimer;
fs.watch(RULES_FILE, function _watchRules() {
	clearTimeout(rulesTimer);
	rulesTimer = setTimeout(function() {
		log(['UPDATED', RULES_FILE]);
		
		rules = JSON.parse( fs.readFileSync(RULES_FILE, 'ascii') );
		
		io.sockets.emit('rules', rules);
	}, 100);
});

var schedule = JSON.parse( fs.readFileSync(config.scheduleData, 'ascii') );
var scheduleTimer;
fs.watch(config.scheduleData, function _watchSchedule() {
	clearTimeout(scheduleTimer);
	scheduleTimer = setTimeout(function() {
		log(['UPDATED', config.scheduleData]);
		
		schedule = JSON.parse( fs.readFileSync(config.scheduleData, 'ascii') );
		
		io.sockets.emit('schedule', schedule);
	}, 100);
});

// auth
var basic = auth({
	authRealm: 'Hello Chinachu.',
	authList : config.wuiUsers
});

var status = {
	connectedCount: 0,
	isRecording   : false,
	recording     : {
		process: '',
		program: {}
	}
};

function log(messages) {
	util.puts( new Date().getTime() + ' ' + messages.join(' ') );
}

// watch recording process
(function _watchRecording() {
	// process
	exec('ps cx | grep ' + config.recordProgram, function _exec(err, stdout, stderr) {
		status.recording.process = stdout.trim() || '';
		
		if (status.recording.process.match(config.recordProgram) === null) {
			status.isRecording = false;
		} else {
			status.isRecording = true;
		}
	});
	
	//schedule
	status.recording.program = {};
	
	if (status.isRecording) {
		status.isRecording = false;
		
		var cDateTime = new Date().getTime();
		schedule.forEach(function(ch) {
			ch.programs.forEach(function(p) {
				if (!p.isReserved) return;
				if (p.start > cDateTime) return;
				if (p.end   < cDateTime) return;
				
				status.isRecording       = true;
				status.recording.program = p;
			});
		});
	}
	
	if (
		(status._isRecording !== status.isRecording) ||
		(status.recording.program && (status._lastRecordTime !== status.recording.program.start))
	) {
		status._isRecording    = status.isRecording;
		status._lastRecordTime = status.recording.program.start;
		
		if (io) io.sockets.emit('status', status);
	}
	
	setTimeout(arguments.callee, 1000 * 3);// 3 seconds
})();

(function _snapshotRecording() {
	if (status.isRecording) {
		var recfile = status.recording.program.filepath || null;
		
		var tmptail = '/tmp/chinachu-monitor_recording-snapshot.m2ts';
		var tmpimg  = '/tmp/chinachu-monitor_recording-snapshot.png';
		
		if (path.existsSync(recfile) === true) {
			exec('tail -c 3200000 "' + recfile + '" > ' + tmptail, function() {
				exec('timeout -s KILL 5 ffmpeg -i "' + tmptail + '" -ss 1.3 -vframes 1 -f image2 -vcodec png -s 210x118 -map 0.0 -y "' + tmpimg + '" > /dev/null 2>&1', function() {
					
					io.sockets.emit('snapshot', 'data:image/png;base64,' + new Buffer( fs.readFileSync(tmpimg) ).toString('base64'));
					
				});
			});
			
			setTimeout(arguments.callee, 1000 * 5);// 5 seconds
		} else {
			setTimeout(arguments.callee, 1000 * 3);// 3 seconds
		}
	} else {
		setTimeout(arguments.callee, 1000 * 3);// 3 seconds
	}
})();


//
// listen server
//
var app  = http.createServer(httpServer);
var io   = socketio.listen(app);
io.enable('browser client minification');
io.sockets.on('connection', ioServer);
io.set('log level', 1);
io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
app.listen(config.wuiPort, (config.wuiIpv6 !== null) ? config.wuiIpv6 : null);

//
// http server
//
function httpServer(req, res) {
	// http request logging
	var log = function(statusCode) {
		util.puts([
			/*dateTime  */ new Date().getTime(),
			/*remoteAddr*/ req.headers['x-forwarded-for'] || req.client.remoteAddress,
			/*method+url*/ '"' + req.method + ' ' + req.url + '"',
			/*statusCode*/ statusCode,
			/*referer   */ req.headers.referer || '-',
			/*userAgent */ req.headers['user-agent'].split(' ').pop() || '-'
		].join(' '));
	};
	
	// serve static file
	if (req.url.match(/\/$/) !== null) req.url += 'index.html';
	if (req.url.match(/(\?.*)$/) !== null) req.url = req.url.match(/^(.+)\?.*$/)[1];
	var filename = path.join(config.webDir, req.url);
	
	if (path.existsSync(filename) === false) {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.write('404 Not Found\n');
		res.end();
		log(404);
		return;
	}
	
	var ext    = filename.split('.').pop();
	
	function response() {
		fs.readFile(filename, function(err, data) {
			if (err) {
				res.writeHead(500, {'Content-Type': 'text/plain'});
				res.write(err + '\n');
				res.end();
				log(500);
				return;
			}
			
			var status = 200;
			var type   = 'text/plain';
			
			if (ext === 'html') type = 'text/html';
			if (ext === 'js')   type = 'text/javascript';
			if (ext === 'css')  type = 'text/css';
			if (ext === 'ico')  type = 'image/vnd.microsoft.icon';
			if (ext === 'cur')  type = 'image/vnd.microsoft.icon';
			if (ext === 'png')  type = 'image/png';
			if (ext === 'gif')  type = 'image/gif';
			if (ext === 'xspf') type = 'application/xspf+xml';
			
			res.writeHead(status, {
				'Content-Type': type,
				'Server'      : 'chinachu-monitor'
			});
			res.write(data, 'binary');
			res.end();
			log(status);
			return;
		});
	}
	
	
	
	if (ext === 'png') {
		response();
	} else {
		basic.apply(req, res, response);
	}
}

//
// socket.io server
//
function ioServer(socket) {
	++status.connectedCount;
	
	socket.on('disconnect', function _socketOnDisconnect() {
		--status.connectedCount;
		io.sockets.emit('status', status);
	});
	
	// broadcast
	io.sockets.emit('status', status);
	
	// schedule
	socket.emit('schedule', schedule);
	
	// rules
	socket.emit('rules', rules);
	
	// (req) manual-reserve-request
	socket.on('manual-reserve-request', function(req) {
		var res = {};
		
		if (req.ctrlKey !== config.wuiControlKey) {
			res.isAuthFailure = true;
		} else {
			res.isSuccess = true;
			
			var reserves = JSON.parse( fs.readFileSync(RESERVES_FILE, 'ascii') || '[]' );
			
			reserves.push({
				channel: req.channel,
				start  : req.start
			});
			
			fs.writeFileSync( RESERVES_FILE, JSON.stringify(reserves) );
		}
		
		socket.emit('manual-reserve-result', res);
	});
	
	// (req) manual-reserve-cancel-request
	socket.on('manual-reserve-cancel-request', function(req) {
		var res = {};
		
		if (req.ctrlKey !== config.wuiControlKey) {
			res.isAuthFailure = true;
		} else {
			res.isSuccess = true;
			
			var reserves = JSON.parse( fs.readFileSync(RESERVES_FILE, 'ascii') || '[]' );
			
			var array = [];
			
			reserves.forEach(function(reserve) {
				if ((req.channel === reserve.channel) && (req.start === reserve.start)) return;
				
				array.push(reserve);
			});
			
			fs.writeFileSync( RESERVES_FILE, JSON.stringify(array) );
		}
		
		socket.emit('manual-reserve-cancel-result', res);
	});
	
	// (req) execute-scheduler-request
	socket.on('execute-scheduler-request', function(req) {
		if (req.ctrlKey !== config.wuiControlKey) {
			socket.emit('execute-scheduler-result', { isAuthFailure: true });
			return;
		}
		
		exec([
			config.nodejsPath,
			__dirname + '/app-scheduler.js',
			'>',
			config.schedulerLog
		].join(' '), function() {
			socket.emit('execute-scheduler-result', {
				isSuccess: true,
				result   : fs.readFileSync( config.schedulerLog, 'ascii' )
			});
		});
	});
}