/*!
 *  Chinachu Task Scheduler (chinachu-scheduler)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://akkar.in/projects/chinachu/
**/

var CONFIG_FILE         = __dirname + '/config.json';
var RULES_FILE          = __dirname + '/rules.json';
var RESERVES_DATA_FILE  = __dirname + '/data/reserves.json';
var SCHEDULE_DATA_FILE  = __dirname + '/data/schedule.json';

// 標準モジュールのロード
var path          = require('path');
var fs            = require('fs');
var util          = require('util');
var child_process = require('child_process');

// ディレクトリチェック
if (!fs.existsSync('./data/') || !fs.existsSync('./log/') || !fs.existsSync('./web/')) {
	util.error('必要なディレクトリが存在しないか、カレントワーキングディレクトリが不正です。');
	process.exit(1);
}

// 追加モジュールのロード
var opts       = require('opts');
var xml2js     = require('xml2js');
var xmlParser  = new xml2js.Parser();
var dateFormat = require('dateformat');

// 引数
opts.parse([
	{
		short      : 'f',
		long       : 'force',
		description: '全てのデータを破棄して再取得します',
		value      : false,
		required   : false
	},
	{
		short      : 's',
		long       : 'simulation',
		description: 'シミュレーション。実際には保存されません',
		value      : false,
		required   : false
	}
], true);

// 設定の読み込み
var config   = JSON.parse( fs.readFileSync(CONFIG_FILE, 'ascii') );
var rules    = JSON.parse( fs.readFileSync(RULES_FILE, 'ascii') || '[]' );
var reserves = JSON.parse( fs.readFileSync(RESERVES_DATA_FILE, 'ascii') || '[]' );

// チャンネルリストと番組表
var channels = JSON.parse(JSON.stringify(config.channels));
var schedule = [];

// EPGデータを取得または番組表を読み込む
if (opts.get('f') || !fs.existsSync(SCHEDULE_DATA_FILE)) {
	getEpg();
} else {
	schedule = JSON.parse( fs.readFileSync(SCHEDULE_DATA_FILE, 'ascii'));
	scheduler();
}

// EPGデータを取得
function getEpg() {
	var i = 0;
	var c = 0;
	(function _loop() {
		var self = arguments.callee;
		
		function retry() {
			++c;
			setTimeout(self, 3000);
			util.log('-- (retry)');
		}
		
		function turn() {
			++i;
			c = 0;
			setTimeout(self, 3000);
			util.log('--');
		}
		
		function end() {
			if (!opts.get('s')) {
				fs.writeFileSync(SCHEDULE_DATA_FILE, JSON.stringify(schedule));
				util.log('WRITE: ' + SCHEDULE_DATA_FILE);
			}
			
			scheduler();
		}
		
		// おわる
		if (channels.length === i) {
			end();
			return;
		}
		
		// あきらめて次へ
		if (c === 3) {
			turn();
			return;
		}
		
		var channel = channels[i];
		util.log(JSON.stringify(channel));
		
		// チェック
		switch (channel.type) {
			case 'GR':
				break;
			case 'BS':
				for (var j = 0; schedule.length > j; j++) {
					if (schedule[j].channel === channel.channel) {
						turn();
						return;
					}
				}
				break;
			case 'CS':
			case 'EX':
				for (var j = 0; schedule.length > j; j++) {
					if (
						(schedule[j].channel === channel.channel) &&
						(schedule[j].sid === channel.sid)
					) {
						turn();
						return;
					}
				}
				break;
			default:
				// todo
				turn();
				return;
		}//<-- switch
		
		// チューナーを選ぶ
		var tuner = null;
		for (var j = 0; config.tuners.length > j; j++) {
			tuner = config.tuners[j];
			tuner.n = j;
			
			if (
				(tuner.types.indexOf(channel.type) === -1) ||
				(fs.existsSync('./data/tuner.' + tuner.n.toString(10) + '.lock') === true)
			) {
				tuner = null;
				continue;
			}
			
			break;
		}
		
		// チューナーが見つからない
		if (tuner === null) {
			retry();
			return;
		}
		
		// チューナーをロック
		fs.writeFileSync('./data/tuner.' + tuner.n.toString(10) + '.lock', '');
		util.log('LOCK: ' + tuner.name + ' (n=' + tuner.n.toString(10) + ')');
		
		function unlockTuner() {
			// チューナーのロックを解除
			try {
				fs.unlinkSync('./data/tuner.' + tuner.n.toString(10) + '.lock');
				util.log('UNLOCK: ' + tuner.name + ' (n=' + tuner.n.toString(10) + ')');
			} catch(e) { }
		}
		
		function removeSignalListener() {
			process.removeListener('SIGINT', onCancel);
			process.removeListener('SIGQUIT', onCancel);
			process.removeListener('SIGTERM', onCancel);
		}
		
		// 終了シグナル時処理
		process.on('SIGINT', onCancel);
		process.on('SIGQUIT', onCancel);
		process.on('SIGTERM', onCancel);
		
		var recPath = config.temporaryDir + 'chinachu-tmp-' + new Date().getTime().toString(36) + '.m2ts';
		
		var recCmd = tuner.command.replace('<channel>', channel.channel);
		
		// recpt1用
		recCmd = recCmd.replace(' --b25', '').replace(' --strip', '').replace(/ --sid [^ ]+/, '');
		
		// 録画プロセスを生成
		var recProc = child_process.spawn(recCmd.split(' ')[0], recCmd.replace(/[^ ]+ /, '').split(' '));
		util.log('SPAWN: ' + recCmd + ' (pid=' + recProc.pid + ')');
		
		// プロセスタイムアウト
		setTimeout(function() { recProc.kill('SIGTERM'); }, 1000 * (config.schedulerEpgRecordTime || 60));
		
		// 一時ファイルへの書き込みストリームを作成
		var recFile = fs.createWriteStream(recPath);
		util.log('STREAM: ' + recPath);
		
		// ts出力
		recProc.stdout.on('data', function(data) {
			recFile.write(data);
		});
		
		// ログ出力
		recProc.stderr.on('data', function(data) {
			util.log('#' + (recCmd.split(' ')[0] + ': ' + data + '').replace(/\n/g, ' ').trim());
		});
		
		// キャンセル時
		function onCancel() {
			// シグナルリスナー解除
			removeSignalListener();
			
			// 録画プロセスを終了
			recProc.removeAllListeners('exit');
			recProc.kill('SIGTERM');
			
			// 書き込みストリームを閉じる
			recFile.end();
			
			// チューナーのロックを解除
			unlockTuner();
			
			// 一時録画ファイル削除
			fs.unlinkSync(recPath);
			util.log('UNLINK: ' + recPath);
			
			// 終了
			process.exit();
		}
		
		// プロセス終了時
		recProc.on('exit', function(code) {
			// シグナルリスナー解除
			removeSignalListener();
			
			// 書き込みストリームを閉じる
			recFile.end();
			
			// チューナーのロックを解除
			unlockTuner();
			
			// epgdump
			var epgdumpCmd = [
				config.epgdumpPath,
				(function() {
					switch (channel.type) {
						case 'GR':
							return 'none';
						case 'BS':
							return '/BS';
						case 'CS':
						case 'EX':
						default:
							return '/CS';
					}
				})(),
				recPath,
				'-'
			].join(' ');
			
			var epgdumpProc = child_process.exec(epgdumpCmd, { maxBuffer: 104857600 }, function(err, stdout, stderr) {
				// 一時録画ファイル削除
				fs.unlinkSync(recPath);
				util.log('UNLINK: ' + recPath);
				
				if (err !== null) {
					util.log('EPG: 不明なエラー');
					retry();
					return;
				}
				
				try {
					// epgdumpのXMLをパース
					xmlParser.parseString(stdout, function(err, result) {
						if (result === null) {
							util.log('EPG: パースに失敗 (result=null)');
							retry();
							return;
						}
						
						if (
							!result.tv.channel[0]['display-name'] ||
							!result.tv.channel[0]['display-name'][0] ||
							!result.tv.channel[0]['display-name'][0]['_']
						) {
							util.log('EPG: データが不正 (display-name is incorrect)');
							retry();
							return;
						}
						
						switch (channel.type) {
							case 'GR':
								result.tv.channel.forEach(function(a) {
									var ch = {
										type   : channel.type,
										channel: channel.channel,
										name   : a['display-name'][0]['_'],
										id     : a['$'].id,
										sid    : a['service_id'][0]
									};
									
									ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
									
									schedule.push(ch);
									
									util.log(
										'CHANNEL: ' + ch.type + '-' + ch.channel + ' ... ' +
										ch.id + ' (sid=' + ch.sid + ') ' +
										'(programs=' + ch.programs.length.toString(10) + ')' +
										' - ' + ch.name
									);
								});
								break;
							case 'BS':
								result.tv.channel.forEach(function(a) {
									var isFound = false;
									
									for (var j = 0; channels.length > j; j++) {
										if (
											(channels[j].type === 'BS') &&
											(channels[j].channel === a['service_id'][0])
										) {
											isFound = true;
											break;
										} else {
											continue;
										}
									}
									
									if (isFound === false) { return; }
									
									var ch = {
										type   : channel.type,
										channel: a['service_id'][0],
										name   : a['display-name'][0]['_'],
										id     : a['$'].id,
										sid    : a['service_id'][0]
									};
									
									ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
									
									schedule.push(ch);
									
									util.log(
										'CHANNEL: ' + ch.type + '-' + ch.channel + ' ... ' +
										ch.id + ' (sid=' + ch.sid + ') ' +
										'(programs=' + ch.programs.length.toString(10) + ')' +
										' - ' + ch.name
									);
								});
								break;
							case 'CS':
								result.tv.channel.forEach(function(a) {
									var isFound = false;
									
									for (var j = 0; channels.length > j; j++) {
										if (
											(channels[j].type === 'CS') &&
											(channels[j].sid === a['service_id'][0])
										) {
											isFound = true;
											break;
										} else {
											continue;
										}
									}
									
									if (isFound === false) { return; }
									
									var ch = {
										type   : channel.type,
										channel: channels[j].channel,
										name   : a['display-name'][0]['_'],
										id     : a['$'].id,
										sid    : a['service_id'][0]
									};
									
									ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
									
									schedule.push(ch);
									
									util.log(
										'CHANNEL: ' + ch.type + '-' + ch.channel + ' ... ' +
										ch.id + ' (sid=' + ch.sid + ') ' +
										'(programs=' + ch.programs.length.toString(10) + ')' +
										' - ' + ch.name
									);
								});
								break;
							case 'EX':
								result.tv.channel.forEach(function(a) {
									var isFound = false;
									
									for (var j = 0; channels.length > j; j++) {
										if (
											(channels[j].type === 'EX') &&
											(channels[j].sid === a['service_id'][0])
										) {
											isFound = true;
											break;
										} else {
											continue;
										}
									}
									
									if (isFound === false) { return; }
									
									var ch = {
										type   : channel.type,
										channel: channels[j].channel,
										name   : a['display-name'][0]['_'],
										id     : a['$'].id,
										sid    : a['service_id'][0]
									};
									
									ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
									
									schedule.push(ch);
									
									util.log(
										'CHANNEL: ' + ch.type + '-' + ch.channel + ' ... ' +
										ch.id + ' (sid=' + ch.sid + ') ' +
										'(programs=' + ch.programs.length.toString(10) + ')' +
										' - ' + ch.name
									);
								});
								break;
							default:
								// todo
						}//<-- switch
						
						turn();
					});
				} catch (e) {
					util.log('EPG: エラー (' + e + ')');
					retry();
				}
			});
			util.log('EXEC: ' + config.epgdumpPath + ' (pid=' + epgdumpProc.pid + ')');
		});//<-- recProc.on(exit, ...)
	})();//<-- _loop()
}//<-- getEpg()

// scheduler
function scheduler() {
	util.log('RUNNING SCHEDULER.');
	
	var typeNum = {};
	
	config.tuners.forEach(function(tuner) {
		tuner.types.forEach(function(type) {
			if (typeof typeNum[type] === 'undefined') {
				typeNum[type] = 1;
			} else {
				typeNum[type]++;
			}
		});
	});
	
	util.log('TUNERS: ' + JSON.stringify(typeNum));
	
	// matching
	var matches = [];
	
	schedule.forEach(function(ch) {
		ch.programs.forEach(function(p) {
			if (isMatchedProgram(p)) {
				matches.push(p);
			}
		});
	});
	
	reserves.forEach(function(reserve) {
		if (reserve.isManualReserve) matches.push(reserve);
	});
	
	// duplicates
	var duplicateCount = 0;
	for (var i = 0; i < matches.length; i++) {
		var a = matches[i];
		
		for (var j = 0; j < matches.length; j++) {
			var b = matches[j];
			
			if (b.isDuplicate) continue;
			
			if (a.id === b.id) continue;
			if (a.channel.type !== b.channel.type) continue;
			if (a.channel.channel !== b.channel.channel) continue;
			if (a.start !== b.start) continue;
			if (a.end !== b.end) continue;
			if (a.title !== b.title) continue;
			
			util.log('DUPLICATE: ' + a.id + ' ' + dateFormat(new Date(a.start), 'isoDateTime') + ' [' + a.channel.name + '] ' + a.title);
			a.isDuplicate = true;
			
			++duplicateCount;
			
			break;
		}
	}
	
	// check conflict
	var conflictCount = 0;
	for (var i = 0; i < matches.length; i++) {
		var a = matches[i];
		
		var k = 0;
		
		while (k < config.tuners.length) {
			if (config.tuners[k].types.indexOf(a.channel.type) === -1) {
				++k;
				continue;
			} else {
				break;
			}
		}
		if (k >= config.tuners.length) {
			util.log('WARNING: ' + a.channel.type + ' チューナーは存在しません');
			//continue;
		}
		
		for (var j = 0; j < matches.length; j++) {
			var b = matches[j];
			
			if (b.isConflict) continue;
			
			if (a.id === b.id) continue;
			
			if (a.end <= b.start) continue;
			if (a.start >= b.end) continue;
			
			if ((a.channel.type === 'BS') || (a.channel.type === 'CS')) {
				// todo
				if ((b.channel.type !== 'BS') && (b.channel.type !== 'CS')) {
					continue;
				}
			} else if (a.channel.type !== b.channel.type) {
				continue;
			}
			
			while (k < config.tuners.length) {
				if (config.tuners[k].types.indexOf(b.channel.type) === -1) {
					++k;
					continue;
				} else {
					++k;
					break;
				}
			}
			if (k < config.tuners.length) {
				continue;
			}
			
			util.log('CONFLICT: ' + a.id + ' ' + dateFormat(new Date(a.start), 'isoDateTime') + ' [' + a.channel.name + '] ' + a.title);
			a.isConflict = true;
			
			++conflictCount;
			
			break;
		}
	}
	
	// sort
	matches.sort(function(a, b) {
		return a.start - b.start;
	});
	
	// reserve
	reserves = [];
	var reservedCount = 0;
	for (var i = 0; i < matches.length; i++) {
		(function() {
			var a = matches[i];
			
			if (!a.isConflict && !a.isDuplicate) {
				reserves.push(a);
				util.log('RESERVE: ' + a.id + ' ' + dateFormat(new Date(a.start), 'isoDateTime') + ' [' + a.channel.name + '] ' + a.title);
				++reservedCount;
			}
		})();
	}
	
	// results
	util.log('MATCHES: ' + matches.length.toString(10));
	util.log('DUPLICATES: ' + duplicateCount.toString(10));
	util.log('CONFLICTS: ' + conflictCount.toString(10));
	util.log('RESERVES: ' + reservedCount.toString(10));
	
	if (!opts.get('s')) {
		outputReserves();
	}
}

// (function) program converter
function convertPrograms(p, ch) {
	var programs = [];
	
	for (var i = 0; i < p.length; i++) {
		var c = p[i];
		
		if (
			(c['$'].channel !== ch.id) ||
			(!c.title[0]['_'])
		) {
			continue;
		}
		
		var tcRegex   = /^(.{4})(.{2})(.{2})(.{2})(.{2})(.{2}).+$/;
		var startDate = new Date( c['$'].start.replace(tcRegex, '$1/$2/$3 $4:$5:$6') );
		var endDate   = new Date( c['$'].stop.replace(tcRegex, '$1/$2/$3 $4:$5:$6') );
		var startTime = startDate.getTime();
		var endTime   = endDate.getTime();
		
		var flags = c.title[0]['_'].match(/【(.)】/g);
		if (flags === null) {
			flags = [];
		} else {
			for (var j = 0; j < flags.length; j++) {
				flags[j] = flags[j].match(/【(.)】/)[1];
			}
		}
		
		var programData = {
			id        : ch.id.toLowerCase().replace('_', '') + '-' + (startTime / 1000).toString(32),
			channel   : ch,
			category  : c.category[1]['_'],
			title     : c.title[0]['_'],
			detail    : c.desc[0]['_'],
			start     : startTime,
			end       : endTime,
			seconds   : ((endTime - startTime) / 1000),
			flags     : flags
		};
		
		programs.push(programData);
	}
	
	return programs;
}

// (function) rule checker
function isMatchedProgram(program) {
	var result = false;
	
	rules.forEach(function(rule) {
		
		// sid
		if (rule.sid && rule.sid !== program.channel.sid) return;
		
		// types
		if (rule.types) {
			if (
				(rule.types.indexOf(program.channel.type) === -1)
			) return;
		}
		
		// channels
		if (rule.channels) {
			if (
				(rule.channels.indexOf(program.channel.id) === -1) &&
				(rule.channels.indexOf(program.channel.channel) === -1)
			) return;
		}
		
		// ignore_channels
		if (rule.ignore_channels) {
			if (
				(rule.ignore_channels.indexOf(program.channel.id) !== -1) ||
				(rule.ignore_channels.indexOf(program.channel.channel) !== -1)
			) return;
		}
		
		// category
		if (rule.category && rule.category !== program.category) return;
		
		// categories
		if (rule.categories) {
			if (rule.categories.indexOf(program.category) === -1) return;
		}
		
		// hour
		if (rule.hour && (typeof rule.hour.start !== 'undefined') && (typeof rule.hour.end !== 'undefined')) {
			var ruleStart = rule.hour.start;
			var ruleEnd   = rule.hour.end;
			
			var progStart = new Date(program.start).getHours();
			var progEnd   = new Date(program.end).getHours();
			
			if (progStart > progEnd) {
				progEnd += 24;
			}
			
			if (ruleStart > ruleEnd) {
				if ((ruleStart > progStart) && (ruleEnd < progEnd)) return;
			} else {
				if ((ruleStart > progStart) || (ruleEnd < progEnd)) return;
			}
		}
		
		// duration
		if (rule.duration && (typeof rule.duration.min !== 'undefined') && (typeof rule.duration.max !== 'undefined')) {
			if ((rule.duration.min > program.seconds) || (rule.duration.max < program.seconds)) return;
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
		
		// ignore_descriptions
		if (rule.ignore_descriptions) {
			if (!program.detail) return;
			
			for (var i = 0; i < rule.ignore_descriptions.length; i++) {
				if (program.detail.match(rule.ignore_descriptions[i]) !== null) return;
			}
		}
		
		// reserve_descriptions
		if (rule.reserve_descriptions) {
			if (!program.detail) return;
			
			var isFound = false;
			
			for (var i = 0; i < rule.reserve_descriptions.length; i++) {
				if (program.detail.match(rule.reserve_descriptions[i]) !== null) isFound = true;
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
		
		// reserve_flags
		if (rule.reserve_flags) {
			if (!program.detail) return;
			
			var isFound = false;
			
			for (var i = 0; i < rule.reserve_flags.length; i++) {
				for (var j = 0; j < program.flags.length; j++) {
					if (rule.reserve_flags[i] === program.flags[j]) isFound = true;
				}
			}
			
			if (!isFound) return;
		}
		
		result = true;
		
	});
	
	return result;
}

// (function) remake reserves
function outputReserves() {
	util.log('WRITE: ' + RESERVES_DATA_FILE);
	
	var array = [];
	
	reserves.forEach(function(reserve) {
		if (reserve.end < new Date().getTime()) return;
		
		array.push(reserve);
	});
	
	fs.writeFileSync( RESERVES_DATA_FILE, JSON.stringify(array) );
}
