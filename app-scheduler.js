/*!
 *  Chinachu Task Scheduler (chinachu-scheduler)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://chinachu.akkar.in/
**/
'use strict';

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
var rules    = JSON.parse( fs.readFileSync(RULES_FILE,         { encoding: 'utf8' }) || '[]' );
var reserves = JSON.parse( fs.readFileSync(RESERVES_DATA_FILE, { encoding: 'utf8' }) || '[]' );

// チャンネルリスト
var channels = JSON.parse(JSON.stringify(config.channels));

// スケジュール
var schedule = (fs.existsSync(SCHEDULE_DATA_FILE)) ? require(SCHEDULE_DATA_FILE) : [];

// EPGデータを取得または番組表を読み込む
if (opts.get('f') || schedule.length === 0) {
	getEpg();
} else {
	scheduler();
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
	
	var isFinished = false;
	
	var tick = function _tick() {
		
		// 取得すべきチャンネルリスト
		var chs = [];
		
		// 未取得のチャンネルを探す
		for (var i = 0; i < channels.length; i++) {
			var ch = channels[i];// このチャンネルは
			ch.n = i;// numbering
			
			var isTarget = true;// 対象か？
			
			// 取得済みスケジュールループ
			for (var j = 0; j < c.length; j++) {
				if (c[j] === i) {
					isTarget = false;// 違った
					break;
				}
			}
			
			if (isTarget) chs.push(ch);// 取得すべし
		}
		
		// 終わるか？
		if (chs.length === 0 && r.length === 0 && !isFinished) {
			isFinished = true;
			
			writeOut(scheduler);
			
			return;
		}
		
		// 取得開始処理
		for (var i = 0; i < chs.length; i++) {
			var ch = chs[i];
			
			if (chinachu.getFreeTunerSync(config.tuners, ch.type) === null) {
				continue;
			}
			
			if (ch.type !== 'GR') {
				var isTarget = true;
				
				for (var j = 0; j < r.length; j++) {
					if (channels[r[j]].type === ch.type) {
						isTarget = false;
						break;
					}
				}
				
				if (!isTarget) continue;
			}
			
			c.push(ch.n);
			r.push(ch.n);
			get(ch.n, retryCount, function() {
				setTimeout(function() {
					r.splice(r.indexOf(ch.n), 1);
					tick();
				}, 50);
			});
			
			if (ch.type === 'GR') {
				setTimeout(tick, 100);
			}
			
			break;
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
	process.nextTick(tick);
	
	var get = function _get(i, c, callback) {
		
		var residue = c;
		
		var reuse = function _reuse() {
			
			var chs = [];
			
			// 古いスケジュールから探してくる
			for (var j = 0; j < schedule.length; j++) {
				if (schedule[j].n === i) {
					chs.push(schedule[j]);
				}
			}
			
			// あれば使う
			if (chs.length !== 0) s = s.concat(chs);
		};
		
		var retry = function _retry() {
			
			--residue;
			
			// 取得あきらめる
			if (residue <= 0) {
				reuse();
				
				// おわり
				process.nextTick(callback);
				util.log('-- (give up)');
				
				return;
			}
			
			setTimeout(get, 3000, i, residue, callback);
			util.log('-- (retrying, residue=' + residue + ')');
		};
		
		var channel = channels[i];
		
		// ch限定
		if (opts.get('ch')) {
			if (opts.get('ch') !== channel.channel) {
				reuse();
				process.nextTick(callback);
				
				return;
			}
		}
		
		util.log(JSON.stringify(channel));
		
		// チェック
		switch (channel.type) {
			
			case 'GR':
				// 特にない
				break;
			
			case 'BS':
				for (var j = 0; s.length > j; j++) {
					if (s[j].channel === channel.channel) {
						// 取得済み
						process.nextTick(callback);
						util.log('-- (pass)');
						
						return;
					}
				}
				
				break;
			
			case 'CS':
			case 'EX':
				for (var j = 0; s.length > j; j++) {
					if (
						(s[j].channel === channel.channel) &&
						(s[j].sid === channel.sid)
					) {
						// 取得済み
						process.nextTick(callback);
						util.log('-- (pass)');
						
						return;
					}
				}
				
				break;
			
			default:
				// todo
				// 知らないタイプ
				process.nextTick(callback);
				util.log('-- (unknown)');
				
				return;
		}//<-- switch
		
		// epgdump
		var dumpEpg = function() {
			
			// epgdump
			var epgdumpCmd = [
				'epgdump',
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
				
				if (!opts.get('l')) {
					// 一時録画ファイル削除
					fs.unlinkSync(recPath);
					util.log('UNLINK: ' + recPath);
				}
				
				if (err !== null) {
					util.log('EPG: 不明なエラー');
					util.log(err);
					process.nextTick(retry);
					
					return;
				}
				
				try {
					// epgdumpのXMLをパース
					xmlParser.parseString(stdout, function(err, result) {
						
						if (err) {
							util.log('EPG: パースに失敗');
							util.log(err);
							process.nextTick(retry);
							
							return;
						}
						
						if (result === null) {
							util.log('EPG: パースに失敗 (result=null)');
							process.nextTick(retry);
							
							return;
						}
						
						if (
							!result.tv.channel[0]['display-name'] ||
							!result.tv.channel[0]['display-name'][0] ||
							!result.tv.channel[0]['display-name'][0]['_']
						) {
							util.log('EPG: データが不正 (display-name is incorrect)');
							process.nextTick(retry);
							
							return;
						}
						
						switch (channel.type) {
							
							case 'GR':
								result.tv.channel.forEach(function(a) {
									
									var ch = {
										n      : i,
										type   : channel.type,
										channel: channel.channel,
										name   : a['display-name'][0]['_'],
										id     : a['$'].id,
										sid    : a['service_id'][0]
									};
									
									ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
									
									s.push(ch);
									
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
									
									for (var k = 0; k < s.length; k++) {
										if (s[k].n === j) isFound = false;
									}
									
									if (isFound === false) { return; }
									
									var ch = {
										n      : j,
										type   : channel.type,
										channel: a['service_id'][0],
										name   : a['display-name'][0]['_'],
										id     : a['$'].id,
										sid    : a['service_id'][0]
									};
									
									ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
									
									s.push(ch);
									
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
									
									for (var k = 0; k < s.length; k++) {
										if (s[k].n === j) isFound = false;
									}
									
									if (isFound === false) { return; }
									
									var ch = {
										n      : j,
										type   : channel.type,
										channel: channels[j].channel,
										name   : a['display-name'][0]['_'],
										id     : a['$'].id,
										sid    : a['service_id'][0]
									};
									
									ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
									
									s.push(ch);
									
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
									
									for (var k = 0; k < s.length; k++) {
										if (s[k].n === j) isFound = false;
									}
									
									if (isFound === false) { return; }
									
									var ch = {
										n      : j,
										type   : channel.type,
										channel: channels[j].channel,
										name   : a['display-name'][0]['_'],
										id     : a['$'].id,
										sid    : a['service_id'][0]
									};
									
									ch.programs = convertPrograms(result.tv.programme, JSON.parse(JSON.stringify(ch)));
									
									s.push(ch);
									
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
						
						setTimeout(callback, 3000);
						util.log('-- (ok)');
					});
				} catch (e) {
					util.log('EPG: エラー (' + e + ')');
					process.nextTick(retry);
				}
			});
			util.log('EXEC: epgdump (pid=' + epgdumpProc.pid + ')');
		};//<-- dumpEpg
		
		if (opts.get('ch') && opts.get('l')) {
			var recPath = opts.get('l');
			dumpEpg();
		} else {
			// チューナーを選ぶ
			var tuner = chinachu.getFreeTunerSync(config.tuners, channel.type);
			
			// チューナーが見つからない
			if (tuner === null) {
				util.log('WARNING: 利用可能なチューナーが見つかりませんでした (存在しないかロックされています)');
				process.nextTick(retry);
				
				return;
			}
			
			// チューナーをロック
			chinachu.lockTunerSync(tuner);
			util.log('LOCK: ' + tuner.name + ' (n=' + tuner.n + ')');
			
			var unlockTuner = function _unlockTuner() {
				
				// チューナーのロックを解除
				try {
					chinachu.unlockTunerSync(tuner);
					util.log('UNLOCK: ' + tuner.name + ' (n=' + tuner.n + ')');
				} catch(e) {
					util.log(e);
				}
			};
			
			var recPath = config.temporaryDir + 'chinachu-tmp-' + new Date().getTime().toString(36) + '.m2ts';
			
			var recCmd = tuner.command.replace('<channel>', channel.channel);
			
			// recpt1用
			//recCmd = recCmd.replace(' --b25', '').replace(' --strip', '').replace(/ --sid [^ ]+/, '');
			recCmd = recCmd.replace(' --b25', '').replace('<sid>', 'epg');
			
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
			var onCancel = function _onCancel() {
				
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
				process.nextTick(process.exit);
			};
			
			var removeSignalListener = function _removeSignalListener() {
				
				process.removeListener('SIGINT', onCancel);
				process.removeListener('SIGQUIT', onCancel);
				process.removeListener('SIGTERM', onCancel);
			};
			
			// 終了シグナル時処理
			process.on('SIGINT', onCancel);
			process.on('SIGQUIT', onCancel);
			process.on('SIGTERM', onCancel);
			
			// プロセス終了時
			recProc.on('exit', function(code) {
				
				// シグナルリスナー解除
				removeSignalListener();
				
				// 書き込みストリームを閉じる
				recFile.end();
				
				// チューナーのロックを解除
				unlockTuner();
				
				dumpEpg();
			});
		}//<-- if
	};//<-- get()
	
	var writeOut = function _writeOut(callback) {
		
		schedule = s;
		
		schedule.sort(function(a, b) {
			return a.n - b.n;
		});
		
		if (!opts.get('s')) {
			fs.writeFileSync(SCHEDULE_DATA_FILE, JSON.stringify(schedule));
			util.log('WRITE: ' + SCHEDULE_DATA_FILE);
		}
		
		process.nextTick(callback);
	};
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
		if (reserve.isManualReserved) matches.push(reserve);
	});
	
	// sort
	matches.sort(function(a, b) {
		return a.start - b.start;
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
	var tunerThreads  = [];
	for (var i = 0; i < config.tuners.length; i++) {
		tunerThreads.push([]);
	}
	for (var i = 0; i < matches.length; i++) {
		var a = matches[i];
		a.isConflict = true;
		
		for (var k = 0; k < config.tuners.length; k++) {
			if (config.tuners[k].types.indexOf(a.channel.type) === -1) {
				continue;
			} else {
				var aIsConflictInTuner = false;
				for (var l = 0; l < tunerThreads[k].length; l++) {
					if (!((tunerThreads[k][l].end <= a.start)||(tunerThreads[k][l].start >= a.end))) {
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
			util.log('CONFLICT: ' + a.id + ' ' + dateFormat(new Date(a.start), 'isoDateTime') + ' [' + a.channel.name + '] ' + a.title);
			
			++conflictCount;
		}
	}
	
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
			(c.$.channel !== ch.id) ||
			(!c.title[0]._)
		) {
			continue;
		}
		
		var title = c.title[0]._
			.replace(/【.{1,2}】/g, '')
			.replace(/\[.\]/g, '')
			.replace(/([^版])「.+」/g, '$1')
			.replace(/(#[0-9]+|(＃|♯)[０１２３４５６７８９]+)/g, '')
			.replace(/第([0-9]+|[０１２３４５６７８９零一壱二弐三参四五伍六七八九十拾]+)話/g, '')
			.replace(/([0-9]+|[０１２３４５６７８９]+)品目/g, '')
			.trim();
		
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
		(c.title[0]._.match(/【(.)】/g) || []).forEach(function(a) {
			flags.push(a.match(/【(.)】/)[1]);
		});
		(c.title[0]._.match(/\[(.)\]/g) || []).forEach(function(a) {
			flags.push(a.match(/\[(.)\]/)[1]);
		});
		
		var episodeNumber = null;
		if (flags.indexOf('新') !== -1) {
			episodeNumber = 1;
		} else {
			var episodeNumberMatch = (c.title[0]._ + desc).match(/(#[0-9]+|(＃|♯)[０１２３４５６７８９]+|第([0-9]+|[０１２３４５６７８９零一二三四五六七八九十]+)話)|([0-9]+|[０１２３４５６７８９]+)品目|Episode ?[IⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫVX]+/);
			if (episodeNumberMatch !== null) {
				var episodeNumberString = episodeNumberMatch[0];
				
				episodeNumberString = episodeNumberString
					.replace('#', '')
					.replace('＃', '')
					.replace('♯', '')
					.replace('第', '')
					.replace('話', '')
					.replace('品目', '')
					.replace('Ｅｐｉｓｏｄｅ', '')
					.replace('Episode', '')
					.replace(/０/g, '0')
					.replace(/１/g, '1')
					.replace(/２/g, '2')
					.replace(/３/g, '3')
					.replace(/４/g, '4')
					.replace(/５/g, '5')
					.replace(/６/g, '6')
					.replace(/７/g, '7')
					.replace(/８/g, '8')
					.replace(/９/g, '9')
					.replace(/零/g, '0')
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
					.replace(/Ⅳ|IV|ＩＶ/g, '4')
					.replace(/Ⅷ|VIII|ＶＩＩＩ/g, '8')
					.replace(/Ⅶ|VII|ＶＩＩ/g, '7')
					.replace(/Ⅵ|VI|ＶＩ/g, '6')
					.replace(/Ⅴ/g, '5')
					.replace(/Ⅸ|IX|ＩＸ/g, '9')
					.replace(/Ⅻ|XII|ＸＩＩ/g, '12')
					.replace(/Ⅺ|XI|ＸＩ/g, '11')
					.replace(/Ⅲ|III|ＩＩＩ/g, '3')
					.replace(/Ⅱ|II|ＩＩ/g, '2')
					.replace(/Ⅰ|I|Ｉ/g, '1')
					.replace(/Ⅹ|X|Ｘ/g, '10')
					.trim();
				
				episodeNumber = parseInt(episodeNumberString, 10);
			}
		}
		
		var tcRegex   = /^(.{4})(.{2})(.{2})(.{2})(.{2})(.{2}).+$/;
		var startDate = new Date( c.$.start.replace(tcRegex, '$1/$2/$3 $4:$5:$6') );
		var endDate   = new Date( c.$.stop.replace(tcRegex, '$1/$2/$3 $4:$5:$6') );
		var startTime = startDate.getTime();
		var endTime   = endDate.getTime();
		
		var programData = {
			id        : ch.id.toLowerCase().replace('_', '') + '-' + (startTime / 1000).toString(32),
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

// (function) rule checker
function isMatchedProgram(program) {
	var result = false;
	
	rules.forEach(function(rule) {
		
		// isDisabled
		if (rule.isDisabled) return;
		
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
			if (!program.flags) return;
			
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
