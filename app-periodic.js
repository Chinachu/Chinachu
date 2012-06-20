/*!
 * chinachu-periodic
**/

var CONFIG_FILE = __dirname + '/config.json';

// load modules
var exec     = require('child_process').exec;
var fs       = require('fs');

// configuration
var config = JSON.parse( fs.readFileSync(CONFIG_FILE, 'ascii') );

config.schedulerLog = (config.schedulerLog.match('{full}') === null) ? __dirname + config.schedulerLog : config.schedulerLog.replace('{full}', '');

// date
var isExecutable = true;

function periodic() {
	if (!isExecutable) return;
	
	var date = new Date();
	if (date.getHours() === config.checkHours) {
		isExecutable = false;
		
		exec([
			config.nodejsPath,
			__dirname + '/app-scheduler.js -fr',
			'>',
			config.schedulerLog
		].join(' '));
		
		setTimeout(function() {
			isExecutable = true;
		}, 1000 * 60 * 60);//60 minutes
	}
}

setInterval(periodic, 1000 * 60 * 15);// 15 minutes
periodic();
