/*!
 * chinachu-scheduler
**/

var CONFIG_FILE    = __dirname + '/config.json';
var RULES_FILE     = __dirname + '/rules.json';
var RESERVES_FILE  = __dirname + '/reserves.json';

// load modules
var util      = require('util');
var exec      = require('child_process').exec;
var fs        = require('fs');
var path      = require('path');
var opts      = require('opts');
var xml2js    = require('xml2js');
var xmlParser = new xml2js.Parser();

// opts
opts.parse([
	{
		short      : 'fr',
		long       : 'force-reload',
		description: 'disable read EPG from cache',
		value      : false,
		required   : false
	}
]);

// load configuration
var config = JSON.parse( fs.readFileSync(CONFIG_FILE, 'ascii') || '{}' );

var rules = JSON.parse( fs.readFileSync(RULES_FILE, 'ascii') || '[]' );

var reserves = JSON.parse( fs.readFileSync(RESERVES_FILE, 'ascii') || '[]' );

config.recordedDir  = (config.recordedDir.match('{full}') === null) ? __dirname + config.recordedDir : config.recordedDir.replace('{full}', '');
config.scheduleData = (config.scheduleData.match('{full}') === null) ? __dirname + config.scheduleData : config.scheduleData.replace('{full}', '');
config.recordingLog = (config.recordingLog.match('{full}') === null) ? __dirname + config.recordingLog : config.recordingLog.replace('{full}', '');

var reserveCtpl = fs.readFileSync( __dirname + '/reserve.ctpl', 'ascii' );

function log(messages) {
	util.puts( new Date().getTime() + ' ' + messages.join(' ') );
}

function cleanUpJobs(callback) {
	exec('atq', function(err, stdout, stderr) {
		var ats = stdout.trim().split('\n');
		
		if (ats[0] === '') if (callback) callback();
		
		var count = 0;
		
		for (var i = 0; i < ats.length; i++) {
			(function() {
				var id = ats[i].split('\t')[0];
				
				exec('at -c ' + id + ' | grep ' + config.recordProgram, function(err, stdout, stderr) {
					if (stdout.trim().match(config.recordProgram) !== null) {
						exec('atrm ' + id, function() {
							++count;
							
							if (count === ats.length) {
								if (callback) callback();
							}
						});
					}
				});
			})();
		}
	});
}

// get schedule use epgdumpr2
var i = 0;
function getEpg() {
	if (config.channels.length === i) {
		fs.writeFileSync( '/tmp/chinachu-scheduler_epg-cache.json', JSON.stringify(config.channels) );
		cleanUpJobs(scheduler);
		return;
	}
	
	var self = arguments.callee;
	var cur  = config.channels[i];
	
	var temp = '/tmp/chinachu-scheduler_get-epg_' + new Date().getTime().toString(10) + '.m2ts';
	
	var comm = [
		'timeout -s KILL 60',
		config.recordCommand.replace('[channel]', cur.channel),
		'>',
		temp
	].join(' ') ;
	
	log(['GET-EPG', cur.channel, cur.callsign, 'Receiving...']);
	
	exec(comm, function(err, stdout, stderr) {
		log(['GET-EPG', cur.channel, cur.callsign, 'Reading...']);
		
		var comm = 'epgdump ' + cur.callsign + ' ' + temp + ' -';
		
		exec(comm, function(err, stdout, stderr) {
			log(['GET-EPG', cur.channel, cur.callsign, 'Parsing...']);
			
			xmlParser.parseString(stdout, function(err, result) {
				var schedule = result;
				
				cur._schedule = schedule;
				
				if (schedule === null) {
					log(['GET-EPG', cur.channel, cur.callsign, 'Retrying...']);
				} else {
					log(['GET-EPG', cur.channel, cur.callsign, 'Done']);
					
					++i;
				}
				
				fs.unlinkSync(temp);
				setTimeout(self, 5000);
			});
		});
	});
}

// cache ctrl
if (opts.get('fr') || !path.existsSync('/tmp/chinachu-scheduler_epg-cache.json')) {
	getEpg();
} else {
	config.channels = JSON.parse( fs.readFileSync('/tmp/chinachu-scheduler_epg-cache.json', 'ascii') );
	cleanUpJobs(scheduler);
}

// scheduler
function scheduler() {
	log(['SCHEDULER', 'Matching...']);
	
	// matching
	var matches = [];
	for (var i = 0; i < config.channels.length; i++) {
		var ch = config.channels[i];
		
		ch.displayName = ch._schedule.channel['display-name']['#'];
		
		ch.programs = convertPrograms(ch._schedule.programme, ch);
		
		for (var j = 0; j < ch.programs.length; j++) {
			var p = ch.programs[j];
			
			if (isMatchedProgram(p)) {
				matches.push(p);
			}
		}
	}
	
	log(['SCHEDULER', 'Matched programs:', matches.length]);
	
	log(['SCHEDULER', 'Checking conflicts...']);
	
	// check conflict
	for (var i = 0; i < matches.length; i++) {
		var a = matches[i];
		
		for (var j = 0; j < matches.length; j++) {
			var b = matches[j];
			
			if (b.isConflict) continue;
			
			if (a === b) continue;
			
			if (a.end <= b.start) continue;
			
			if (a.start >= b.end) continue;
			
			log([
				'SCHEDULER', 'Conflict:', a.title, '!', b.title,
				'[' + new Date(a.start).getHours() + ':' + new Date(a.start).getMinutes() +
				'~' + new Date(a.end).getHours() + ':' + new Date(a.end).getMinutes() +
				'!' + new Date(b.start).getHours() + ':' + new Date(b.start).getMinutes() +
				'~' + new Date(b.end).getHours() + ':' + new Date(b.end).getMinutes() +
				']'
			]);
			a.isConflict = true;
		}
	}
	
	log(['SCHEDULER', 'Reserving...']);
	
	// sort
	matches.sort(function(a, b) {
		return a.start - b.start;
	});
	
	// reserve
	var reserves      = [];
	var reservedCount = 0;
	for (var i = 0; i < matches.length; i++) {
		(function() {
			var a = matches[i];
			
			if (!a.isConflict) {
				var d = new Date(a.start);
				
				reserves.push(a);
				
				setTimeout(function() {
					
					log([
						'SCHEDULER', 'Reserving:', 
						'[' + a.filename.split('.')[0] + ']',
						'(' + (a.seconds / 60) + 'min)',
						a.title
					]);
					
					reserveProgram(a, function _onReserved() {
						a.isReserved = true;
						
						++reservedCount;
						
						if (reservedCount === reserves.length) {
							outputSchedule();
						}
					});
				
				}, 150 * i);
			}
		})();
	}
}

// (function) program converter
function convertPrograms(p, ch) {
	var programs = [];
	
	for (var i = 0; i < p.length; i++) {
		var c = p[i];
		
		if (!c.title['#']) continue;
		
		var callsign = c['@'].channel;
		
		var tcRegex   = /^(.{4})(.{2})(.{2})(.{2})(.{2})(.{2}).+$/;
		var startDate = new Date( c['@'].start.replace(tcRegex, '$1/$2/$3 $4:$5:$6') );
		var endDate   = new Date( c['@'].stop.replace(tcRegex, '$1/$2/$3 $4:$5:$6') );
		var startTime = startDate.getTime();
		var endTime   = endDate.getTime();
		
		var filename  = [
			startDate.getFullYear(),
			( '0' + (startDate.getMonth() + 1) ).slice(-2),
			( '0' + startDate.getDate() ).slice(-2),
			( '0' + startDate.getHours() ).slice(-2) +
			( '0' + startDate.getMinutes() ).slice(-2)
		].join('-') + '_' + callsign + '.m2ts';
		
		var flags = c.title['#'].match(/【(.)】/g);
		if (flags === null) {
			flags = [];
		} else {
			for (var j = 0; j < flags.length; j++) {
				flags[j] = flags[j].match(/【(.)】/)[1];
			}
		}
		
		var programData = {
			callsign  : callsign,
			channel   : ch.channel,
			category  : c.category[1]['#'],
			title     : c.title['#'],
			detail    : c.desc['#'],
			start     : startTime,
			end       : endTime,
			seconds   : ((endTime - startTime) / 1000),
			flags     : flags,
			filename  : filename,
			filepath  : config.recordedDir + filename,
			isReserved: false
		};
		
		reserves.forEach(function(reserve) {
			if ((reserve.channel === programData.channel) && (reserve.start === programData.start)) {
				programData.isManualReserved = true;
			}
		});
		
		programs.push(programData);
	}
	
	return programs;
}

// (function) rule checker
function isMatchedProgram(program) {
	if (program.isManualReserved) {
		return true;
	}
	
	var result = false;
	
	rules.forEach(function(rule) {
		
		// channels
		if (rule.channels) {
			var isFound = false;
			
			for (var i = 0; i < rule.channels.length; i++) {
				if (program.channel === rule.channels[i]) isFound = true;
			}
			
			if (!isFound) return;
		}
		
		// category
		if (rule.category && rule.category !== program.category) return;
		
		// hour
		if (rule.hour && rule.hour.start && rule.hour.end) {
			var ruleStart = rule.hour.start;
			var ruleEnd   = rule.hour.end;
			
			var progStart = new Date(program.start).getHours();
			var progEnd   = new Date(program.end).getHours();
			
			if ((ruleStart > progStart) && (ruleEnd < progEnd)) return;
		}
		
		// duration
		if (rule.duration && rule.duration.min && rule.duration.max) {
			if ((rule.duration.min > program.seconds) && (rule.duration.max < program.seconds)) return;
		}
		
		// ignore_titles
		if (rule.ignore_titles) {
			for (var i = 0; i < rule.ignore_titles.length; i++) {
				if (program.title.match(rule.ignore_titles[i]) !== null) return;
			}
		}
		
		// reserve_titles
		if (rule.reserve_titles) {
			var isFound = false;
			
			for (var i = 0; i < rule.reserve_titles.length; i++) {
				if (program.title.match(rule.reserve_titles[i]) !== null) isFound = true;
			}
			
			if (!isFound) return;
		}
		
		// ignore_flags
		if (rule.ignore_flags) {
			for (var i = 0; i < rule.ignore_flags.length; i++) {
				for (var j = 0; j < program.flags.length; j++) {
					if (rule.ignore_flags[i] === program.flags[j]) return;
				}
			}
		}
		
		result = true;
		
	});
	
	return result;
}

// (function) program reserver
function reserveProgram(program, callback) {
	var duration = program.seconds - 10;// 録画終了時刻を削る
	
	// atd コマンド
	var atdd    = new Date(program.start - (1000 * 60));
	var atddt   = (
		atdd.getHours() + ':' + ('0' + atdd.getMinutes()).slice(-2) + ' ' +
		(atdd.getMonth() + 1) + '/' + atdd.getDate() + '/' + atdd.getFullYear()
	);
	var atdcomm = ['at', atddt, '> /dev/null 2>&1'].join(' ');
	var reccomm = config.recordCommand.replace('[channel]', program.channel);
	var strcomm = config.streamCommand;
	
	//
	var comm = reserveCtpl.replace(
		/\[filepath\]/g, program.filepath
	).replace(
		/\[logfile\]/g, config.recordingLog
	).replace(
		/\[seconds\]/g, duration
	).replace(
		/\[rec\-command\]/g, reccomm
	).replace(
		/\[str\-command\]/g, strcomm
	).replace(
		/\[atd\-command\]/g, atdcomm
	);
	
	//console.log(comm);
	exec(comm, callback);
}

// (function) output schedule
function outputSchedule() {
	log(['SCHEDULER', 'Output:', config.scheduleData]);
	
	config.channels.forEach(function(ch) {
		delete ch._schedule;
	});
	
	fs.writeFileSync( config.scheduleData, JSON.stringify(config.channels) );
	
	outputReserves();
}

// (function) remake reserves
function outputReserves() {
	log(['SCHEDULER', 'Output:', RESERVES_FILE]);
	
	var array = [];
	
	reserves.forEach(function(reserve) {
		if (reserve.start < new Date().getTime()) return;
		
		array.push(reserve);
	});
	
	fs.writeFileSync( RESERVES_FILE, JSON.stringify(array) );
}
