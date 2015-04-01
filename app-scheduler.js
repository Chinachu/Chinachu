/*!
 *  Chinachu Task Scheduler (chinachu-scheduler)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  https://chinachu.moe/
**/
/*jslint node:true, nomen:true, plusplus:true, regexp:true, vars:true, continue:true */
'use strict';

var PID_FILE = __dirname + '/data/scheduler.pid';

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
var chinachu   = require('chinachu-common');

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
	},
	{
		short      : 'ch',
		long       : 'channel',
		description: '指定したチャンネルのみ取得します',
		value      : true,
		required   : false
	},
	{
		short      : 'l',
		long       : 'load',
		description: '指定したTSをch引数で指定したチャンネルに取り込みます',
		value      : true,
		required   : false
	}
], true);

// 設定の読み込み
var config   = require(CONFIG_FILE);
var rules    = JSON.parse(fs.readFileSync(RULES_FILE, { encoding: 'utf8' }) || '[]');
var reserves = null;//まだ読み込まない

// チャンネルリスト
var channels = JSON.parse(JSON.stringify(config.channels));

// スケジュール
var schedule = [];
if (fs.existsSync(SCHEDULE_DATA_FILE)) {
	try {
		schedule = JSON.parse(fs.readFileSync(SCHEDULE_DATA_FILE, { encoding: 'utf8' }));
		
		if (schedule instanceof Array === false) {
			util.log('WARNING: `' + SCHEDULE_DATA_FILE + '`の内容が不正です');
			schedule = [];
		}
	} catch (e) {
		util.log('WARNING: `' + SCHEDULE_DATA_FILE + '`のロードに失敗しました');
		schedule = [];
	}
}

// 録画コマンドのシリアライズ
var operRecCmdSpan  = config.operRecCmdSpan || 0;
if (operRecCmdSpan < 0) {
	operRecCmdSpan = 0;
}
var recCmdLastTime = new Date().getTime();
function execRecCmd(cmd, timeout, msg) {
	if (timeout > 0) {
		setTimeout(execRecCmd, timeout, cmd, 0, msg);
		return;
	}
	var t = operRecCmdSpan - (new Date().getTime() - recCmdLastTime);
	if (t > 0) {
		util.log(msg + ': ' + t + 'ms');
		setTimeout(execRecCmd, t, cmd, 0, msg);
		return;
	}
	cmd();
	recCmdLastTime = new Date().getTime();
}

// PID file operation
function createPidFile() {
	fs.writeFileSync(PID_FILE, process.pid);
}

function deletePidFile() {
	fs.unlinkSync(PID_FILE);
}

// scheduler is running?
function isRunning(callback) {
	
	if (fs.existsSync(PID_FILE) === true) {
		var pid = fs.readFileSync(PID_FILE, { encoding: 'utf8' });
		pid = pid.trim();
		
		child_process.exec('ps h -p ' + pid, function (err, stdout) {
			
			if (stdout === '') {
				deletePidFile();
				callback(false);
			} else {
				callback(true);
			}
		});
	} else {
		callback(false);
	}
	
	return void 0;
}

// (function) remake reserves
function outputReserves() {
	util.log('WRITE: ' + RESERVES_DATA_FILE);
	
	var array = [];
	
	reserves.forEach(function (reserve) {
		if (reserve.end < new Date().getTime()) { return; }
		
		array.push(reserve);
	});
	
	fs.writeFileSync(RESERVES_DATA_FILE, JSON.stringify(array));
}

// scheduler
function scheduler() {
	
	var i, j, k, l, a;
	
	util.log('RUNNING SCHEDULER.');
	
	// IDが重複しているかチェックするだけ
	var idMap = {};
	schedule.forEach(function (ch) {
		ch.programs.forEach(function (p) {
			if (idMap[p.id]) {
				util.log('**WARNING**: ' + p.id + ' is duplicated!');
				console.log(JSON.stringify(idMap[p.id], null, '  '), JSON.stringify(p, null, '  '));
			} else {
				idMap[p.id] = p;
			}
		});
	});
	
	reserves = JSON.parse(fs.readFileSync(RESERVES_DATA_FILE, { encoding: 'utf8' }) || '[]');//読み込む
	
	var typeNum = {};
	
	config.tuners.forEach(function (tuner) {
		tuner.types.forEach(function (type) {
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
	
	schedule.forEach(function (ch) {
		ch.programs.forEach(function (p) {
			if (chinachu.isMatchedProgram(rules, p)) {
				matches.push(p);
			}
		});
	});
	
	reserves.forEach(function (reserve) {
		if (reserve.isManualReserved) {
			if (reserve.start + 86400000 > Date.now()) {
				reserve = chinachu.getProgramById(reserve.id, schedule) || reserve;
				reserve.isManualReserved = true;
				matches.push(reserve);
			}
			return;
		}
		var i, l;
		if (reserve.isSkip) {
			for (i = 0, l = matches.length; i < l; i++) {
				if (matches[i].id === reserve.id) {
					matches[i].isSkip = true;
					break;
				}
			}
			return;
		}
	});
	
	// sort
	matches.sort(function (a, b) {
		return a.start - b.start;
	});
	
	// duplicates
	var duplicateCount = 0;
	for (i = 0; i < matches.length; i++) {
		a = matches[i];
		
		for (j = 0; j < matches.length; j++) {
			var b = matches[j];
			
			if (b.isDuplicate || b.isSkip) { continue; }
			
			if (a.id === b.id) { continue; }
			if (a.channel.type !== b.channel.type) { continue; }
			if (a.channel.channel !== b.channel.channel) { continue; }
			if (a.start !== b.start) { continue; }
			if (a.end !== b.end) { continue; }
			if (a.title !== b.title) { continue; }
			
			// 最終的にsidの若い方を選択させる
			if (parseInt(a.channel.sid, 10) < parseInt(b.channel.sid, 10)) { continue; }
			
			util.log('DUPLICATE: ' + a.id + ' ' + dateFormat(new Date(a.start), 'isoDateTime') + ' [' + a.channel.name + '] ' + a.title);
			a.isDuplicate = true;
			
			++duplicateCount;
		}
	}
	
	// check conflict
	var conflictCount = 0;
	var tunerThreads  = [];
	for (i = 0; i < config.tuners.length; i++) {
		tunerThreads.push([]);
	}
	for (i = 0; i < matches.length; i++) {
		a = matches[i];

		if (a.isDuplicate || a.isSkip) { continue; }

		a.isConflict = true;
		
		for (k = 0; k < config.tuners.length; k++) {
			if (config.tuners[k].types.indexOf(a.channel.type) !== -1) {
				var aIsConflictInTuner = false;
				for (l = 0; l < tunerThreads[k].length; l++) {
					if (!((tunerThreads[k][l].end <= a.start) || (tunerThreads[k][l].start >= a.end))) {
						aIsConflictInTuner = true;
						break;
					}
				}
				
				if (aIsConflictInTuner) {
					continue;
				} else {
					tunerThreads[k].push(a);
					a.isConflict = false;
					break;
				}
			}
		}
		
		if (!a.isConflict) {
			continue;
		} else {
			util.log('!CONFLICT: ' + a.id + ' ' + dateFormat(new Date(a.start), 'isoDateTime') + ' [' + a.channel.name + '] ' + a.title);
			
			++conflictCount;
		}
	}
	
	// reserve
	reserves = [];
	var reservedCount = 0;
	var skipCount     = 0;
	for (i = 0; i < matches.length; i++) {
		a = matches[i];
		
		if (!a.isConflict && !a.isDuplicate) {
			reserves.push(a);
			
			if (a.isSkip) {
				util.log('!!!SKIP: ' + a.id + ' ' + dateFormat(new Date(a.start), 'isoDateTime') + ' [' + a.channel.name + '] ' + a.title);
				++skipCount;
			} else {
				util.log('RESERVE: ' + a.id + ' ' + dateFormat(new Date(a.start), 'isoDateTime') + ' [' + a.channel.name + '] ' + a.title);
				++reservedCount;
			}
		}
	}
	
	// ruleにもしあればreserveにrecordedFormatを追加
	reserves.forEach(function(reserve){
		rules.forEach(function(rule){
			if(typeof(rule.recorded_format) !== 'undefined' && chinachu.programMatchesRule(rule, reserve)){
				reserve.recordedFormat = rule.recorded_format;
			}
		});
	});
	
	// results
	util.log('MATCHES: ' + matches.length.toString(10));
	util.log('DUPLICATES: ' + duplicateCount.toString(10));
	util.log('CONFLICTS: ' + conflictCount.toString(10));
	util.log('SKIPS: ' + skipCount.toString(10));
	util.log('RESERVES: ' + reservedCount.toString(10));
	
	if (!opts.get('s')) {
		outputReserves();
	}
	
	// プロセス終了
	process.exit(0);
}

// (function) program converter
function convertPrograms(p, ch) {
	var programs = [];
	
	var i, l;
	for (i = 0, l = p.length; i < l; i++) {
		var j, m;
		var c = p[i];
		
		if (c.$.channel !== ch.id || !c.title[0]._) {
			continue;
		}
		
		var title = c.title[0]._;
		
		title = title
			.replace(/【.{1,2}】/g, '')
			.replace(/\[.\]/g, '')
			.replace(/(#|＃|♯)[0-9０１２３４５６７８９]+/g, '')
			.replace(/第([0-9]+|[０１２３４５６７８９零一壱二弐三参四五伍六七八九十拾]+)(話|回)/g, '');
		
		if (c.category[1]._ === 'anime') {
			title = title.replace(/アニメ「([^「」]+)」/g, '$1');
		}
		
		title = title.trim();
		
		var desc = c.desc[0]._ || '';
		
		var subtitle = '';
		if (c.title[0]._.match(/[^版]「([^「」]+)」/) !== null) {
			subtitle = c.title[0]._.match(/[^版]「([^「」]+)」/)[1];
		} else if (desc.match(/「([^「」]+)」/) !== null) {
			subtitle = desc.match(/「([^「」]+)」/)[1];
		} else if (desc.match(/『([^『』]+)』/) !== null) {
			subtitle = desc.match(/『([^『』]+)』/)[1];
		}
		
		var flags = [];
		var flagsSource = c.title[0]._
			.replace(/【/g, '[')
			.replace(/】/g, ']')
			.replace(/\[無料\]/g, '[無]');
		var matchedFlags = (flagsSource.match(/\[(.)\]/g) || []);
		for (j = 0, m = matchedFlags.length; j < m; j++) {
			flags.push(matchedFlags[j].match(/(?:【|\[)(.)(?:】|\])/)[1]);
		}
		
		var episodeNumber = null;
		var episodeNumberMatch = (c.title[0]._ + ' ' + desc).match(/(#|＃|♯)[0-9０１２３４５６７８９]+|第([0-9]+|[０１２３４５６７８９零一二三四五六七八九十]+)(話|回)|Episode ?[IⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫVX]+/);
		if (episodeNumberMatch !== null) {
			var episodeNumberString = episodeNumberMatch[0];

			episodeNumberString = episodeNumberString
				.replace(/#|＃|♯|第|話|回/g, '')
				.replace(/０|零/g, '0')
				.replace(/４|Ⅳ|IV|ＩＶ/g, '4')
				.replace(/８|Ⅷ|VIII|ＶＩＩＩ/g, '8')
				.replace(/７|Ⅶ|VII|ＶＩＩ/g, '7')
				.replace(/６|Ⅵ|VI|ＶＩ/g, '6')
				.replace(/５|Ⅴ/g, '5')
				.replace(/９|Ⅸ|IX|ＩＸ/g, '9')
				.replace(/Ⅻ|XII|ＸＩＩ/g, '12')
				.replace(/Ⅺ|XI|ＸＩ/g, '11')
				.replace(/３|Ⅲ|III|ＩＩＩ/g, '3')
				.replace(/２|Ⅱ|II|ＩＩ/g, '2')
				.replace(/１|Ⅰ|I|Ｉ/g, '1')
				.replace(/Ⅹ|X|Ｘ/g, '10')
				.replace(/二十一/g, '21')
				.replace(/二十二/g, '22')
				.replace(/二十三/g, '23')
				.replace(/二十四/g, '24')
				.replace(/二十/g, '20')
				.replace(/十一/g, '11')
				.replace(/十二/g, '12')
				.replace(/十三/g, '13')
				.replace(/十四/g, '14')
				.replace(/十五/g, '15')
				.replace(/十六/g, '16')
				.replace(/十七/g, '17')
				.replace(/十八/g, '18')
				.replace(/十九/g, '19')
				.replace(/十/g, '10')
				.replace(/一/g, '1')
				.replace(/二/g, '2')
				.replace(/三/g, '3')
				.replace(/四/g, '4')
				.replace(/五/g, '5')
				.replace(/六/g, '6')
				.replace(/七/g, '7')
				.replace(/八/g, '8')
				.replace(/九/g, '9')
				.trim();

			episodeNumber = parseInt(episodeNumberString, 10);
		}
		if (episodeNumber === null && flags.indexOf('新') !== -1) {
			episodeNumber = 1;
		}
		
		var tcRegex   = /^(.{4})(.{2})(.{2})(.{2})(.{2})(.{2}).+$/;
		var startDate = new Date(c.$.start.replace(tcRegex, '$1/$2/$3 $4:$5:$6'));
		var endDate   = new Date(c.$.stop.replace(tcRegex, '$1/$2/$3 $4:$5:$6'));
		var startTime = startDate.getTime();
		var endTime   = endDate.getTime();
		
		// 番組ID (v1.3)
		var programId = '';
		programId += ch.id.toLowerCase().replace('_', '');
		programId += '-';
		programId += parseInt(c.$.event_id, 10).toString(36);
		
		var programData = {
			id        : programId,
			channel   : ch,
			category  : c.category[1]._,
			title     : title,
			subTitle  : subtitle,
			fullTitle : c.title[0]._,
			detail    : desc,
			episode   : episodeNumber,
			start     : startTime,
			end       : endTime,
			seconds   : ((endTime - startTime) / 1000),
			flags     : flags
		};
		
		programs.push(programData);
	}
	
	return programs;
}

// EPGデータを取得
function getEpg() {
	
	util.log('GETTING EPG.');
	
	// リトライ回数
	var retryCount = (typeof config.schedulerGetEpgRetryCount === 'undefined') ? 3 : config.schedulerGetEpgRetryCount;
	
	// 仮
	var s = [];
	var c = [];
	var r = [];
	
	var writeOut = function (callback) {
		
		schedule = s;
		
		schedule.sort(function (a, b) {
			if (a.n === b.n) {
				return a.sid - b.sid;
			} else {
				return a.n - b.n;
			}
		});
		
		if (!opts.get('s')) {
			fs.writeFileSync(SCHEDULE_DATA_FILE, JSON.stringify(schedule));
			util.log('WRITE: ' + SCHEDULE_DATA_FILE);
		}
		
		callback();
	};
	
	var get = function (i, c, callback) {
		
		var j, m;
		
		var residue = c;
		
		var reuse = function () {
			
			var chs = [];
			
			// 古いスケジュールから探してくる
			var j, m;
			for (j = 0, m = schedule.length; j < m; j++) {
				if (schedule[j].n === i) {
					chs.push(schedule[j]);
				}
			}
			
			// あれば使う
			if (chs.length !== 0) { s = s.concat(chs); }
		};
		
		var retry = function () {
			
			--residue;
			
			// 取得あきらめる
			if (residue <= 0 || opts.get('l')) {
				reuse();
				
				// おわり
				util.log('[' + i + '] -- (give up)');
				callback();
				
				return;
			}
			
			setTimeout(get, 3000, i, residue, callback);
			util.log('[' + i + '] -- (retrying, residue=' + residue + ')');
		};
		
		var channel = channels[i];
		
		util.log('[' + i + '] ' + JSON.stringify(channel));
		
		// チェック
		switch (channel.type) {
		case 'GR':
			// 特にない
			break;
		
		case 'BS':
			for (j = 0, m = s.length; m > j; j++) {
				if (s[j].channel === channel.channel) {
					// 取得済み
					util.log('[' + i + '] -- (pass)');
					callback();
					
					return;
				}
			}
			
			break;
		
		case 'CS':
		case 'EX':
			for (j = 0, m = s.length; m > j; j++) {
				if ((s[j].channel === channel.channel) && (s[j].sid === channel.sid)) {
					// 取得済み
					util.log('[' + i + '] -- (pass)');
					callback();
					
					return;
				}
			}
			
			break;
		
		default:
			// todo
			// 知らないタイプ
			util.log('[' + i + '] -- (unknown)');
			callback();
			
			return;
		}//<-- switch
		
		// ch限定
		if (opts.get('ch')) {
			if (opts.get('ch') !== channel.channel) {
				reuse();
				callback();
				
				return;
			}
		}
		
		var recPath = config.temporaryDir + 'chinachu-tmp-' + new Date().getTime().toString(36) + '.m2ts';
		
		// epgdump
		var dumpEpg = function () {
			
			// epgdump
			var epgdumpCmd = [
				'epgdump',
				(function () {
					switch (channel.type) {
					case 'GR':
						return 'none';
					case 'BS':
						return '/BS';
					//case 'CS':
					//case 'EX':
					default:
						return '/CS';
					}
				}()),
				recPath,
				'-'
			].join(' ');
			
			var epgdumpProc = child_process.exec(epgdumpCmd, { maxBuffer: 104857600 }, function (err, stdout, stderr) {
				
				// 一時録画ファイル削除
				fs.unlinkSync(recPath);
				util.log('UNLINK: ' + recPath);
				
				if (err !== null) {
					util.log('[' + i + '] EPG: 不明なエラー');
					util.log(err);
					retry();
					
					return;
				}
				
				try {
					// epgdumpのXMLをパース
					xmlParser.parseString(stdout, function (err, result) {
						
						if (err) {
							util.log('[' + i + '] EPG: パースに失敗');
							util.log(err);
							retry();
							
							return;
						}
						
						if (result === null) {
							util.log('[' + i + '] EPG: パースに失敗 (result=null)');
							retry();
							
							return;
						}

						if (result.tv.channel === undefined) {
							util.log('[' + i + '] EPG: データが空 (result.tv.channel is undefined)');
							retry();

							return;
						}
						
						if (!result.tv.channel[0]['display-name'] || !result.tv.channel[0]['display-name'][0] || !result.tv.channel[0]['display-name'][0]._) {
							util.log('[' + i + '] EPG: データが不正 (display-name is incorrect)');
							retry();
							
							return;
						}
						
						switch (channel.type) {
						case 'GR':
							result.tv.channel.forEach(function (a) {
								
								var ch = {
									n      : i,
									type   : channel.type,
									channel: channel.channel,
									name   : a['display-name'][0]._,
									id     : a.$.id,
									sid    : a.service_id[0]
								};
								
								ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
								
								s.forEach(function (c) {
									c.programs.forEach(function (p) {
										var j;
										for (j = 0; j < ch.programs.length; j++) {
											if (c.n === ch.n) {
												if (p.id.split('-')[1] === ch.programs[j].id.split('-')[1]) {
													ch.programs.splice(j, 1);
												}
											}
										}
									});
								});
								
								if (ch.programs.length !== 0) {
									s.push(ch);
								}
								
								util.log('[' + i + '] ' + 'CHANNEL: ' + ch.type + '-' + ch.channel + ' ... ' + ch.id + ' (sid=' + ch.sid + ') ' + '(programs=' + ch.programs.length.toString(10) + ')' + ' - ' + ch.name);
							});
							
							break;
						
						case 'BS':
							result.tv.channel.forEach(function (a) {
								
								var isFound = false;
								
								var j;
								for (j = 0; channels.length > j; j++) {
									if ((channels[j].type === 'BS') && (channels[j].channel === a.service_id[0])) {
										isFound = true;
										break;
									}
								}
								
								var k;
								for (k = 0; k < s.length; k++) {
									if (s[k].n === j) {
										isFound = false;
									}
								}
								
								if (isFound === false) { return; }
								
								var ch = {
									n      : j,
									type   : channel.type,
									channel: a.service_id[0],
									name   : a['display-name'][0]._,
									id     : a.$.id,
									sid    : a.service_id[0]
								};
								
								ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
								
								s.push(ch);
								
								util.log('[' + i + '] ' + 'CHANNEL: ' + ch.type + '-' + ch.channel + ' ... ' + ch.id + ' (sid=' + ch.sid + ') ' + '(programs=' + ch.programs.length.toString(10) + ')' + ' - ' + ch.name);
							});
							
							break;
						
						case 'CS':
							result.tv.channel.forEach(function (a) {
								
								var isFound = false;
								
								var j;
								for (j = 0; channels.length > j; j++) {
									if ((channels[j].type === 'CS') && (channels[j].sid === a.service_id[0])) {
										isFound = true;
										break;
									}
								}
								
								var k;
								for (k = 0; k < s.length; k++) {
									if (s[k].n === j) {
										isFound = false;
									}
								}
								
								if (isFound === false) { return; }
								
								var ch = {
									n      : j,
									type   : channel.type,
									channel: channels[j].channel,
									name   : a['display-name'][0]._,
									id     : a.$.id,
									sid    : a.service_id[0]
								};
								
								ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
								
								s.push(ch);
								
								util.log('[' + i + '] ' + 'CHANNEL: ' + ch.type + '-' + ch.channel + ' ... ' + ch.id + ' (sid=' + ch.sid + ') ' + '(programs=' + ch.programs.length.toString(10) + ')' + ' - ' + ch.name);
							});
							
							break;
						
						case 'EX':
							result.tv.channel.forEach(function (a) {
								
								var isFound = false;
								
								var j;
								for (j = 0; channels.length > j; j++) {
									if ((channels[j].type === 'EX') && (channels[j].sid === a.service_id[0])) {
										isFound = true;
										break;
									}
								}
								
								var k;
								for (k = 0; k < s.length; k++) {
									if (s[k].n === j) {
										isFound = false;
									}
								}
								
								if (isFound === false) { return; }
								
								var ch = {
									n      : j,
									type   : channel.type,
									channel: channels[j].channel,
									name   : a['display-name'][0]._,
									id     : a.$.id,
									sid    : a.service_id[0]
								};
								
								ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
								
								s.push(ch);
								
								util.log('[' + i + '] ' + 'CHANNEL: ' + ch.type + '-' + ch.channel + ' ... ' + ch.id + ' (sid=' + ch.sid + ') ' + '(programs=' + ch.programs.length.toString(10) + ')' + ' - ' + ch.name);
							});
							
							break;
						
						default:
							// todo
								
						}//<-- switch
						
						util.log('[' + i + '] -- (ok)');
						callback();
					});
				} catch (e) {
					util.log('[' + i + '] EPG: エラー (' + e + ')');
					retry();
				}
			});
			util.log('[' + i + '] EXEC: epgdump (pid=' + epgdumpProc.pid + ')');
		};//<-- dumpEpg
		
		if (opts.get('ch') && opts.get('l')) {
			var copied = false;
			
			var done = function (err) {
				if (copied === false) {
					copied = true;
					
					if (err) {
						util.log('[' + i + '] ERROR: 一時ファイルの作成に失敗しました');
						retry();
						
						return;
					}
					
					dumpEpg();
				}
			};
			
			var load  = opts.get('l');
			if (!fs.existsSync(load)) {
				util.log('[' + i + '] WARNING: 指定したファイルが見つかりません');
				retry();
				
				return;
			}
			
			var fstat = fs.statSync(load);
			
			var readStream = fs.createReadStream(load, {
				start: Math.max(fstat.size - 1000 * 1000 * 100, 0),
				end  : fstat.size
			});
			readStream.on('error', function (err) {
				done(err);
			});
			
			var writeStream = fs.createWriteStream(recPath);
			writeStream.on('error', function (err) {
				done(err);
			});
			writeStream.on('close', function () {
				done();
			});
			
			readStream.pipe(writeStream);
		} else {
			// チューナーを選ぶ
			var tuner = chinachu.getFreeTunerSync(config.tuners, channel.type, true);
			
			// チューナーが見つからない
			if (tuner === null) {
				util.log('[' + i + '] WARNING: 利用可能なチューナーが見つかりませんでした (存在しないかロックされています)');
				retry();
				
				return;
			}
			
			// チューナーをロック
			try {
				chinachu.lockTunerSync(tuner);
			} catch (e) {
				util.log('[' + i + '] WARNING: チューナー(' + tuner.n + ')のロックに失敗しました');
				retry();
				
				return;
			}
			util.log('[' + i + '] LOCK: ' + tuner.name + ' (n=' + tuner.n + ')');
			
			var unlockTuner = function () {
				
				// チューナーのロックを解除
				try {
					chinachu.unlockTunerSync(tuner, true);
					util.log('[' + i + '] UNLOCK: ' + tuner.name + ' (n=' + tuner.n + ')');
				} catch (e) {
					util.log(e);
				}
			};
			
			var recCmd = tuner.command.replace('<channel>', channel.channel);
			
			// recpt1用
			recCmd = recCmd.replace(' --b25', '').replace(' --strip', '').replace('<sid>', 'epg');

			execRecCmd(function () {
				// 録画プロセスを生成
				var recProc = child_process.spawn(recCmd.split(' ')[0], recCmd.replace(/[^ ]+ /, '').split(' '));
				chinachu.writeTunerPidSync(tuner, recProc.pid);
				util.log('[' + i + '] SPAWN: ' + recCmd + ' (pid=' + recProc.pid + ')');
			
				// 一時ファイルへの書き込みストリームを作成
				var recFile = fs.createWriteStream(recPath);
				util.log('[' + i + '] STREAM: ' + recPath);
			
				// ts出力
				recProc.stdout.pipe(recFile);
			
				// ログ出力
				recProc.stderr.on('data', function (data) {
					util.log('[' + i + '] #' + (recCmd.split(' ')[0] + ': ' + data).replace(/\n/g, ' ').trim());
				});
			
				var removeListeners;
			
				// プロセスタイムアウト
				execRecCmd(function () {
					recProc.kill('SIGTERM');
				}, 1000 * (config.schedulerEpgRecordTime || 60), '[' + i + '] KILLWAIT');
			
				// キャンセル時
				var isCancelled = false;
				var onCancel = function () {
				
					isCancelled = true;
					recProc.kill('SIGTERM');
				};
			
				removeListeners = function () {
				
					process.removeListener('exit', onCancel);
					recProc.removeAllListeners('exit');
				};
			
				// 終了シグナル時処理
				process.on('exit', onCancel);
			
				recProc.once('exit', function () {
				
					// リスナー削除
					removeListeners();

					// チューナーのロックを解除
					unlockTuner();

					if (isCancelled) {
						// 一時録画ファイル削除
						fs.unlinkSync(recPath);
					
						// 終了
						process.exit();
					} else {
						dumpEpg();
					}
				});
			}, 0, '[' + i + '] RECWAIT');
		}//<-- if
	};//<-- get()
	
	var isFinished = false;
	
	var tick = function _tick() {
		
		var i, j, l, m, ch, isTarget;
		
		// 取得すべきチャンネルリスト
		var chs = [];
		
		// 未取得のチャンネルを探す
		for (i = 0, l = channels.length; i < l; i++) {
			ch = channels[i];// このチャンネルは
			ch.n = i;// numbering
			
			isTarget = true;// 対象か？
			
			// 取得済みスケジュールループ
			for (j = 0, m = c.length; j < m; j++) {
				if (c[j] === i) {
					isTarget = false;// 違った
					break;
				}
			}
			
			if (isTarget) { chs.push(ch); }// 取得すべし
		}
		
		// 終わるか？
		if (chs.length === 0 && r.length === 0 && !isFinished) {
			isFinished = true;
			
			writeOut(scheduler);
			
			return;
		}
		
		var onGot = function (channelNumber) {
			setTimeout(function () {
				r.splice(r.indexOf(channelNumber), 1);
				tick();
			}, 250);
		};
		
		// 取得開始処理
		for (i = 0, l = chs.length; i < l; i++) {
			ch = chs[i];
			
			if (!opts.get('ch') && !opts.get('l') && chinachu.getFreeTunerSync(config.tuners, ch.type, true) === null) {
				continue;
			}
			
			if (ch.type !== 'GR') {
				isTarget = true;
				
				for (j = 0, m = r.length; j < m; j++) {
					if (channels[r[j]].type === ch.type) {
						isTarget = false;
						break;
					}
				}
				
				if (!isTarget) { continue; }
			}
			
			c.push(ch.n);
			r.push(ch.n);
			get(ch.n, retryCount, onGot.bind(null, ch.n));
			
			if (ch.type === 'GR') {
				setTimeout(tick, 200);
			}
		}
		
		util.log('STATUS: ' + util.inspect(
			{
				'completed': s.length,
				'waiting'  : chs.length,
				'worked'   : c.length,
				'running'  : r.length
			}
		));
	};
	tick();
}//<-- getEpg()

// 既に実行中か
isRunning(function (running) {
	if (running) {
		util.error('ERROR: Scheduler is already running.');
		process.exit(1);
	} else {
		createPidFile();
		
		process.on('exit', function () {
			deletePidFile();
		});
		
		// EPGデータを取得または番組表を読み込む
		if (opts.get('f') || schedule.length === 0) {
			getEpg();
		} else {
			scheduler();
		}
	}
});
