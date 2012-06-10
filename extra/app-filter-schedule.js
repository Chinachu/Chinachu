/*!
 * chinachu-filter-schedule (experimental)
**/

var CONFIG_FILE = __dirname + '/../config.json';

// load modules
var util = require('util');
var fs   = require('fs');

// load configuration
var config = {};

config = JSON.parse( fs.readFileSync(CONFIG_FILE, 'ascii') );

config.scheduleData = __dirname + '/../' + config.scheduleData;

var schedule = JSON.parse( fs.readFileSync(config.scheduleData, 'ascii') );

schedule.forEach(function(ch) {
	ch.programs.forEach(function(p) {
		delete p.filepath;
		delete p.filename;
		delete p.isReserved;
		if (p.isConflict)       delete p.isConflict;
		if (p.isManualReserved) delete p.isManualReserved;
	});
});

util.puts( JSON.stringify(schedule) );