/*!
 *  Chinachu Common Module (node-chinachu-common)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://chinachu.akkar.in/
**/
/*jslint node:true, nomen:true, plusplus:true, regexp:true, vars:true, continue:true */
'use strict';

var fs         = require('fs');
var crypto     = require('crypto');
var dateFormat = require('dateformat');
var child_process = require('child_process');
var string = require('@chezearth/string');

var execSync   = function (command) {
	try {
		return child_process.execSync(command, { encoding: 'utf8' });
	} catch (e) {
	}
};

exports.jsonWatcher = function (filepath, callback, option) {
	if (typeof option === 'undefined') { option = {}; }

	option.wait = option.wait || 1000;

	if (!fs.existsSync(filepath)) {
		if (option.create) {
			fs.writeFileSync(filepath, JSON.stringify(option.create));
		} else {
			callback('FATAL: `' + filepath + '` is not exists.', null, null);
			return;
		}
	}

	var data = null;

	var parse = function (err, json) {
		if (err) {
			callback('WARN: Failed to read `' + filepath + '`. (' + err + ')', null, null);
		} else {
			data = null;

			try {
				data = JSON.parse(json);
				callback(null, data, 'READ: `' + filepath + '` is updated.');
			} catch (e) {
				callback('WARN: `' + filepath + '` is invalid. (' + e + ')', null, null);
			}
		}
	};

	var timer = null;

	var read = function () {
		timer = null;

		fs.readFile(filepath, { encoding: 'utf8' }, parse);
	};

	if (option.now) { read(); }

	var onUpdated = function () {
		if (timer !== null) { clearTimeout(timer); }
		timer = setTimeout(read, option.wait);
	};
	fs.watch(filepath, onUpdated);
};

exports.getProgramById = function (id, array) {
	if (!array || array.length === 0) {
		return null;
	}

	if (array[0].programs) {
		array = (function () {
			var programs = [];

			array.forEach(function (ch) {
				programs = programs.concat(ch.programs);
			});

			return programs;
		}());
	}

	return (function () {
		var x = null;

		array.forEach(function (a) {
			if (a.id === id) { x = a; }
		});

		return x;
	}());
};

exports.existsTuner = function (tuners, type, callback) {
	console.error("existsTuner() has no longer used.");
	callback(false);
};

exports.existsTunerSync = function (tuners, type) {
	console.error("existsTunerSync() has no longer used.");
	return false;
};

exports.getFreeTunerSync = function (tuners, type, isEpg, priority) {
	console.error("getFreeTunerSync() has no longer used.");
	return null;
};

exports.lockTunerSync = function (tuner, priority) {
	console.error("lockTunerSync() has no longer used.");
};

exports.unlockTuner = function (tuner, callback) {
	console.error("unlockTuner() has no longer used.");
	callback();
};

exports.unlockTunerSync = function (tuner, safe) {
	console.error("unlockTunerSync() has no longer used.");
};

exports.writeTunerPidSync = function (tuner, pid, priority) {
	console.error("writeTunerPidSync() has no longer used.");
};

var Countdown = function (count, callback) {
	this.c = count;
	this.f = callback;
};

Countdown.prototype = {
	tick: function () {

		--this.c;

		if (this.c === 0) {
			this.f();
		}

		return this;
	}
};

exports.createCountdown = function (a, b) {
	return new Countdown(a, b);
};

exports.createTimeout = function (a, b) {
	return function () {
		return setTimeout(a, b);
	};
};

exports.formatRecordedName = function (program, name) {
	name = name.replace(/<([^>]+)>/g, function (z, a) {

		// date:
		if (a.match(/^date:.+$/) !== null) { return dateFormat(new Date(program.start), a.match(/:(.+)$/)[1]); }

		// id
		if (a.match(/^id$/) !== null) { return program.id; }

		// type
		if (a.match(/^type$/) !== null) { return program.channel.type; }

		// channel
		if (a.match(/^channel$/) !== null) { return program.channel.channel; }

		// channel-id
		if (a.match(/^channel-id$/) !== null) { return program.channel.id; }

		// channel-sid
		if (a.match(/^channel-sid$/) !== null) { return program.channel.sid; }

		// channel-name
		if (a.match(/^channel-name$/) !== null) { return exports.stripFilename(program.channel.name); }

		// tuner
		if (a.match(/^tuner$/) !== null) { return program.tuner.name; }

		// title
		if (a.match(/^title$/) !== null) { return exports.stripFilename(program.title); }

		// fulltitle
		if (a.match(/^fulltitle$/) !== null) { return exports.stripFilename(program.fullTitle || ''); }

		// subtitle
		if (a.match(/^subtitle$/) !== null) { return exports.stripFilename(program.subTitle || ''); }

		// episode (zero-padded)
		if (a.match(/^episode:\d+$/) !== null) {
			var digit = a.match(/\d+/)[0];
			if (isNaN(digit)) {
				digit = 1;
			}
			return program.episode === null ? 'n' : string(program.episode.toString(10)).padLeft(digit, '0').s;
		}

		// episode
		if (a.match(/^episode$/) !== null) { return program.episode || 'n'; }

		// category
		if (a.match(/^category$/) !== null) { return program.category; }
	});

	return name;
};

// strip
exports.stripFilename = function (a) {

	a = a.replace(/\//g, '／').replace(/\\/g, '＼').replace(/:/g, '：').replace(/\*/g, '＊').replace(/\?/g, '？');
	a = a.replace(/"/g, '”').replace(/</g, '＜').replace(/>/g, '＞').replace(/\|/g, '｜').replace(/≫/g, '＞＞');
	a = a.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');

	return a;
};

// 全ルールとのマッチ判定
exports.isMatchedProgram = function (rules, program, nf) {
	var i;

	// fullTitle, detailを正規化しておく。
	var fullTitle_norm, detail_norm;
	if (nf) {
		fullTitle_norm = program.fullTitle.normalize(nf);
		if (program.detail) {
			detail_norm = program.detail.normalize(nf);
		}
	}
	else {
		fullTitle_norm = program.fullTitle;
		if (program.detail) {
			detail_norm = program.detail;
		}
	}
	for (i = 0; i < rules.length; i++) {
		if (exports.programMatchesRule(rules[i], program, nf, fullTitle_norm, detail_norm)) {
			return true;
		}
	}

	return false;
};

// 単体のルールとのマッチ判定
exports.programMatchesRule = function (rule, program, nf, fullTitle_norm, detail_norm) {
	var i, j, l, m, isFound;

	// 引数に互換性を持たせるため、追加した分はチェック
	// タイトル、詳細
	if (nf) {
		if (!fullTitle_norm) {
			fullTitle_norm = program.fullTitle.normalize(nf);
		}
		if (!detail_norm) {
			detail_norm = program.detail.normalize(nf);
		}
	}

	// isDisabled
	if (rule.isDisabled) { return false; }

	// sid
	if (rule.sid && rule.sid !== program.channel.sid) { return false; }

	// types
	if (rule.types) {
		if (rule.types.indexOf(program.channel.type) === -1) { return false; }
	}

	// channels
	if (rule.channels) {
		if (rule.channels.indexOf(program.channel.id) === -1) {
			if (rule.channels.indexOf(program.channel.channel) === -1) {
				if (rule.channels.indexOf(program.channel.type+'_'+program.channel.sid) === -1) {
					return false;
				}
			}
		}
	}

	// ignore_channels
	if (rule.ignore_channels) {
		if (rule.ignore_channels.indexOf(program.channel.id) !== -1) {
			return false;
		}
		if (rule.ignore_channels.indexOf(program.channel.channel) !== -1) {
			return false;
		}
		if (rule.ignore_channels.indexOf(program.channel.type+'_'+program.channel.sid) !== -1) {
			return false;
		}
	}

	// category
	if (rule.category && rule.category !== program.category) { return false; }

	// categories
	if (rule.categories) {
		if (rule.categories.indexOf(program.category) === -1) { return false; }
	}

	// hour
	if (rule.hour && (typeof rule.hour.start === 'number') && (typeof rule.hour.end === 'number') && !(rule.hour.start === 0 && rule.hour.end === 24)) {
		var ruleStart = rule.hour.start;
		var ruleEnd   = rule.hour.end;

		var progStart = new Date(program.start).getHours();
		var progEnd   = new Date(program.end).getHours();
		var progEndMinute = new Date(program.end).getMinutes();

		if (progStart > progEnd) {
			progEnd += 24;
		}
		if (progEndMinute === 0) {
			progEnd -= 1;
		}

		if (ruleStart > ruleEnd) {
			if ((ruleStart > progStart) && (ruleEnd < progEnd)) { return false; }
		} else {
			if ((ruleStart > progStart) || (ruleEnd < progEnd)) { return false; }
		}
	}

	// duration
	if (rule.duration && (typeof rule.duration.min !== 'undefined') && (typeof rule.duration.max !== 'undefined')) {
		if ((rule.duration.min > program.seconds) || (rule.duration.max < program.seconds)) { return false; }
	}

	// reserve_titles
	if (rule.reserve_titles) {
		isFound = false;

		for (i = 0; i < rule.reserve_titles.length; i++) {
			if (fullTitle_norm === null) {
				console.log("program: " + JSON.stringify(program));
			}
			if (nf) {
				if (fullTitle_norm.match(rule.reserve_titles[i].normalize(nf)) !== null) { isFound = true; }
			}
			else {
				if (program.fullTitle.match(rule.reserve_titles[i]) !== null) { isFound = true; }
			}
		}

		if (!isFound) { return false; }
	}

	// ignore_titles
	if (rule.ignore_titles) {
		for (i = 0; i < rule.ignore_titles.length; i++) {
			if (nf) {
				if (fullTitle_norm.match(rule.ignore_titles[i].normalize(nf)) !== null) { return false; }
			}
			else {
				if (program.fullTitle.match(rule.ignore_titles[i]) !== null) { return false; }
			}
		}
	}

	// reserve_descriptions
	if (rule.reserve_descriptions) {
		if (!program.detail) { return false; }

		isFound = false;

		for (i = 0; i < rule.reserve_descriptions.length; i++) {
			if (nf) {
				if (detail_norm.match(rule.reserve_descriptions[i].normalize(nf)) !== null) { isFound = true; }
			}
			else {
				if (program.detail.match(rule.reserve_descriptions[i]) !== null) { isFound = true; }
			}
		}

		if (!isFound) { return false; }
	}

	// ignore_descriptions
	if (rule.ignore_descriptions && program.detail) {
		for (i = 0; i < rule.ignore_descriptions.length; i++) {
			if (nf) {
				if (detail_norm.match(rule.ignore_descriptions[i].normalize(nf)) !== null) { return false; }
			}
			else {
				if (program.detail.match(rule.ignore_descriptions[i]) !== null) { return false; }
			}
		}
	}

	// ignore_flags
	if (rule.ignore_flags) {
		for (i = 0; i < rule.ignore_flags.length; i++) {
			for (j = 0; j < program.flags.length; j++) {
				if (rule.ignore_flags[i] === program.flags[j]) { return false; }
			}
		}
	}

	// reserve_flags
	if (rule.reserve_flags) {
		if (!program.flags) { return false; }

		isFound = false;

		for (i = 0; i < rule.reserve_flags.length; i++) {
			for (j = 0; j < program.flags.length; j++) {
				if (rule.reserve_flags[i] === program.flags[j]) { isFound = true; }
			}
		}

		if (!isFound) { return false; }
	}

	return true;
};
