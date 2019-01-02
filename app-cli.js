/*!
 *  Chinachu SubCLI (chinachu-cli)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://chinachu.akkar.in/
**/

var CONFIG_FILE         = __dirname + '/config.json';
var RULES_FILE          = __dirname + '/rules.json';
var RESERVES_DATA_FILE  = __dirname + '/data/reserves.json';
var SCHEDULE_DATA_FILE  = __dirname + '/data/schedule.json';
var RECORDING_DATA_FILE = __dirname + '/data/recording.json';
var RECORDED_DATA_FILE  = __dirname + '/data/recorded.json';

// 標準モジュールのロード
var fs            = require('fs');
var util          = require('util');
var net           = require('net');
var child_process = require('child_process');

// ディレクトリチェック
if (!fs.existsSync('./data/') || !fs.existsSync('./log/') || !fs.existsSync('./web/')) {
	util.error('必要なディレクトリが存在しないか、カレントワーキングディレクトリが不正です。');
	process.exit(1);
}

// 追加モジュールのロード
var chinachu   = require('chinachu-common');
var opts       = require('opts');
var dateFormat = require('dateformat');
var Table      = require('easy-table');

// 引数
opts.parse([
	{
		short      : 'mode',
		long       : 'mode',
		value      : true,
		required   : true
	},
	{
		short      : 's',
		long       : 'simulation',
		description: 'シミュレーション。実際には保存されません',
		value      : false,
		required   : false
	},
	{
		short      : 'en',
		long       : 'enable',
		description: '有効化',
		value      : false,
		required   : false
	},
	{
		short      : 'dis',
		long       : 'disable',
		description: '無効化',
		value      : false,
		required   : false
	},
	{
		short      : 'rm',
		long       : 'remove',
		description: '削除',
		value      : false,
		required   : false
	},
	{
		short      : 'simple',
		long       : 'simple',
		description: '簡略表示',
		value      : false,
		required   : false
	},
	{
		short      : 'detail',
		long       : 'detail',
		description: '詳細',
		value      : false,
		required   : false
	},
	{
		short      : 'n',
		long       : 'num',
		description: '番号',
		value      : true,
		required   : false
	},
	{
		short      : 'now',
		long       : 'now',
		description: '現在',
		value      : false,
		required   : false
	},
	{
		short      : 'today',
		long       : 'today',
		description: '今日',
		value      : false,
		required   : false
	},
	{
		short      : 'tomorrow',
		long       : 'tomorrow',
		description: '明日',
		value      : false,
		required   : false
	},
	{
		short      : 'id',
		long       : 'id',
		description: 'ID',
		value      : true,
		required   : false
	},
	{
		short      : 'type',
		long       : 'type',
		description: 'タイプ',
		value      : true,
		required   : false
	},
	{
		short      : 'ch',
		long       : 'channel',
		description: 'チャンネル',
		value      : true,
		required   : false
	},
	{
		short      : '^ch',
		long       : 'ignore-channels',
		description: '無視チャンネル',
		value      : true,
		required   : false
	},
	{
		short      : 'sid',
		long       : 'service-id',
		description: 'Service ID',
		value      : true,
		required   : false
	},
	{
		short      : 'cat',
		long       : 'category',
		description: 'カテゴリー',
		value      : true,
		required   : false
	},
	{
		short      : 'start',
		long       : 'start',
		description: '時間範囲開始(時)',
		value      : true,
		required   : false
	},
	{
		short      : 'end',
		long       : 'end',
		description: '時間範囲終了(時)',
		value      : true,
		required   : false
	},
	{
		short      : 'mini',
		long       : 'minimum',
		description: '最低放送時間(秒)',
		value      : true,
		required   : false
	},
	{
		short      : 'maxi',
		long       : 'maximum',
		description: '最大放送時間(秒)',
		value      : true,
		required   : false
	},
	{
		short      : 'title',
		long       : 'titles',
		description: 'タイトル',
		value      : true,
		required   : false
	},
	{
		short      : '^title',
		long       : 'ignore-titles',
		description: '無視タイトル',
		value      : true,
		required   : false
	},
	{
		short      : 'desc',
		long       : 'descriptions',
		description: '説明',
		value      : true,
		required   : false
	},
	{
		short      : '^desc',
		long       : 'ignore-descriptions',
		description: '無視説明',
		value      : true,
		required   : false
	},
	{
		short      : 'flag',
		long       : 'flags',
		description: 'フラグ',
		value      : true,
		required   : false
	},
	{
		short      : '^flag',
		long       : 'ignore-flags',
		description: '無視フラグ',
		value      : true,
		required   : false
	},
	{
		short      : 'host',
		long       : 'host',
		description: 'host',
		value      : true,
		required   : false
	},
	{
		short      : 'port',
		long       : 'port',
		description: 'port',
		value      : true,
		required   : false
	},
	{
		short      : 'nick',
		long       : 'nick',
		description: 'nick',
		value      : true,
		required   : false
	},
	{
		short      : '1seg',
		long       : '1seg',
		description: 'ワンセグ録画',
		value      : false,
		required   : false
	}
].reverse(), true);

// 設定の読み込み
var config    = require(CONFIG_FILE);
var rules     = JSON.parse( fs.readFileSync(RULES_FILE,          { encoding: 'utf8' }) || '[]' );
var schedule  = JSON.parse( fs.readFileSync(SCHEDULE_DATA_FILE,  { encoding: 'utf8' }) || '[]' );
var reserves  = JSON.parse( fs.readFileSync(RESERVES_DATA_FILE,  { encoding: 'utf8' }) || '[]' );
var recording = JSON.parse( fs.readFileSync(RECORDING_DATA_FILE, { encoding: 'utf8' }) || '[]' );
var recorded  = JSON.parse( fs.readFileSync(RECORDED_DATA_FILE,  { encoding: 'utf8' }) || '[]' );

var clock     = new Date().getTime();

// ルール
var rule = {};

if (opts.get('start') || opts.get('end')) {
	rule.hour = {
		start: parseInt(opts.get('start') || 0, 10),
		end  : parseInt(opts.get('end')   || 24, 10)
	};
}

if (opts.get('mini') || opts.get('maxi')) {
	rule.duration = {
		min: parseInt(opts.get('mini') || 0, 10),
		max: parseInt(opts.get('maxi') || 99999999, 10)
	};
}

if (opts.get('sid'))    rule.sid                  = Number(opts.get('sid'));
if (opts.get('type'))   rule.types                = opts.get('type').split(',');
if (opts.get('ch'))     rule.channels             = opts.get('ch').split(',');
if (opts.get('^ch'))    rule.ignore_channels      = opts.get('^ch').split(',');
if (opts.get('cat'))    rule.categories           = opts.get('cat').split(',');
if (opts.get('title'))  rule.reserve_titles       = opts.get('title').split(',');
if (opts.get('^title')) rule.ignore_titles        = opts.get('^title').split(',');
if (opts.get('desc'))   rule.reserve_descriptions = opts.get('desc').split(',');
if (opts.get('^desc'))  rule.ignore_descriptions  = opts.get('^desc').split(',');
if (opts.get('flag'))   rule.reserve_flags        = opts.get('flag').split(',');
if (opts.get('^flag'))  rule.ignore_flags         = opts.get('^flag').split(',');

// 動作モード
switch (opts.get('mode')) {
	// 検索
	case 'search':
		chinachuSearch();
		break;
	// 予約
	case 'reserve':
		chinachuReserve();
		break;
	// 予約解除
	case 'unreserve':
		chinachuUnreserve();
		break;
	// スキップ
	case 'skip':
		chinachuSkip();
		break;
	// スキップ解除
	case 'unskip':
		chinachuUnskip();
		break;
	// 録画中止
	case 'stop':
		chinachuStop();
		break;
	// Rule
	case 'rule':
		chinachuRule();
		break;
	// Rule List
	case 'rules':
		chinachuRuleList();
		break;
	// Program List
	case 'reserves':
	case 'recording':
	case 'recorded':
		chinachuProgramList(eval(opts.get('mode')));
		break;
	// Clean-up
	case 'cleanup':
		chinachuCleanup();
		break;
	// IRC bot
	case 'ircbot':
		chinachuIrcbot();
		break;
	default:
		process.exit(1);
		break;
}

// 検索
function chinachuSearch() {
	// matching
	var matches = [];

	schedule.forEach(function(ch) {
		ch.programs.forEach(function(p) {
			if (isMatchedProgram(p)) {
				matches.push(p);
			}
		});
	});

	// sort
	matches.sort(function(a, b) {
		return a.start - b.start;
	});

	// table
	var t = new Table;

	// output
	matches.forEach(function(a, i) {
		if (opts.get('num')) {
			if (i !== parseInt(opts.get('num'), 10)) {
				return;
			}
		}

		t.cell('#', i);
		if (!opts.get('simple') || opts.get('detail')) t.cell('Program ID', a.id);
		t.cell('Type:CH', a.channel.type + ':' + a.channel.channel);
		if (opts.get('detail')) t.cell('SID', a.channel.sid);
		t.cell('Cat', a.category);
		if (opts.get('simple')) {
			t.cell('Datetime', dateFormat(new Date(a.start), 'dd HH:MM'));
		} else {
			t.cell('Datetime', dateFormat(new Date(a.start), 'yy/mm/dd HH:MM'));
		}
		t.cell('Dur', (a.seconds / 60) + 'm');
		t.cell('Title', a.title);
		if (opts.get('detail')) t.cell('Description', a.detail);

		t.newRow();
	});

	if (matches.length === 0) {
		console.log('見つかりません');
	} else {
		if (opts.get('simple')) {
			console.log(t.print().trim());
		} else {
			console.log(t.toString().trim());
		}
	}

	process.exit(0);
}

// 予約
function chinachuReserve() {
	var target = chinachu.getProgramById(opts.get('id'), schedule);

	if (target === null) {
		util.error('見つかりません');
		process.exit(1);
	}

	if (chinachu.getProgramById(opts.get('id'), reserves) !== null) {
		util.error('既に予約されています');
		process.exit(1);
	}

	target.isManualReserved = true;

	if (opts.get('1seg')) {
		target['1seg'] = true;
	}

	reserves.push(target);
	reserves.sort(function(a, b) {
		return a.start - b.start;
	});

	if (opts.get('simulation')) {
		console.log('[simulation] reserve:');
		console.log(JSON.stringify(target, null, '  '));
	} else {
		console.log('reserve:');
		console.log(JSON.stringify(target, null, '  '));

		fs.writeFileSync(RESERVES_DATA_FILE, JSON.stringify(reserves));

		console.log('予約しました。 スケジューラーを実行して競合を確認することをお勧めします');
	}

	process.exit(0);
}

// 予約解除
function chinachuUnreserve() {
	var target = chinachu.getProgramById(opts.get('id'), reserves);

	if (target === null) {
		util.error('見つかりません');
		process.exit(1);
	}

	if (!target.isManualReserved) {
		util.error('自動予約された番組は解除できません。自動予約ルールを編集してください');
		process.exit(1);
	}

	for (var i = 0; reserves.length > i; i++) {
		if (target.id === reserves[i].id) {
			reserves.splice(i, 1);
			break;
		}
	}

	if (opts.get('simulation')) {
		console.log('[simulation] unreserve:');
		console.log(JSON.stringify(target, null, '  '));
	} else {
		console.log('unreserve:');
		console.log(JSON.stringify(target, null, '  '));

		fs.writeFileSync(RESERVES_DATA_FILE, JSON.stringify(reserves));

		console.log('予約を解除しました。 ');
	}

	process.exit(0);
}

// スキップ
function chinachuSkip() {
	var target = chinachu.getProgramById(opts.get('id'), reserves);

	if (target === null) {
		util.error('見つかりません');
		process.exit(1);
	}

	if (target.isManualReserved) {
		util.error('手動予約された番組はスキップできません。予約を解除してください。');
		process.exit(1);
	}

	if (target.isSkip) {
		util.error('既にスキップが有効になっています');
		process.exit(1);
	}

	for (var i = 0, l = reserves.length; i < l; i++) {
		if (target.id === reserves[i].id) {
			reserves[i].isSkip = true;
			break;
		}
	}

	if (opts.get('simulation')) {
		console.log('[simulation] skip:');
		console.log(JSON.stringify(target, null, '  '));
	} else {
		console.log('skip:');
		console.log(JSON.stringify(target, null, '  '));

		fs.writeFileSync(RESERVES_DATA_FILE, JSON.stringify(reserves));

		console.log('スキップを有効にしました');
	}

	process.exit(0);
}

// スキップ解除
function chinachuUnskip() {
	var target = chinachu.getProgramById(opts.get('id'), reserves);

	if (target === null) {
		util.error('見つかりません');
		process.exit(1);
	}

	if (!target.isSkip) {
		util.error('既にスキップは解除されています');
		process.exit(1);
	}

	for (var i = 0, l = reserves.length; i < l; i++) {
		if (target.id === reserves[i].id) {
			delete reserves[i].isSkip;
			break;
		}
	}

	if (opts.get('simulation')) {
		console.log('[simulation] skip:');
		console.log(JSON.stringify(target, null, '  '));
	} else {
		console.log('skip:');
		console.log(JSON.stringify(target, null, '  '));

		fs.writeFileSync(RESERVES_DATA_FILE, JSON.stringify(reserves));

		console.log('スキップを解除しました');
	}

	process.exit(0);
}

// 録画中止
function chinachuStop() {
	var target = chinachu.getProgramById(opts.get('id'), recording);

	if (target === null) {
		util.error('見つかりません');
		process.exit(1);
	}

	target.abort = true;

	if (opts.get('simulation')) {
		console.log('[simulation] stop:');
		console.log(JSON.stringify(target, null, '  '));
	} else {
		console.log('stop:');
		console.log(JSON.stringify(target, null, '  '));

		if (!target.isManualReserved) {
			const rp  = chinachu.getProgramById(target.id, reserves);
			if (rp) {
				rp.isSkip = true;
				fs.writeFileSync(RESERVES_DATA_FILE, JSON.stringify(reserves));
			}
		}

		fs.writeFileSync(RECORDING_DATA_FILE, JSON.stringify(recording));

		console.log('録画を停止しました。 ');
	}

	process.exit(0);
}

// Rule
function chinachuRule() {
	var r = {};

	if (opts.get('n')) {
		r = rules[parseInt(opts.get('n'), 10)] || {};
	}

	for (var i in rule) {
		r[i] = rule[i];
	}

	for (var i in r) {
		if ((typeof r[i] === 'string') && (r[i] === 'null')) {
			delete r[i];
		} else if ((typeof r[i] === 'object') && !!r[i].length && (r[i].length === 1) && (r[i][0] === 'null')) {
			delete r[i];
		} else if ((typeof r[i] === 'object') && !r[i].length) {
			for (var j in r[i]) {
				if ((typeof r[i][j] === 'string') && (r[i][j] === 'null')) {
					delete r[i][j];
				} else if ((typeof r[i][j] === 'number') && (r[i][j] === -1)) {
					delete r[i][j];
				}
			}

			if (i === 'hour' && (typeof r[i].start === 'undefined' || typeof r[i].end === 'undefined')) {
				delete r[i];
			}

			if (i === 'duration' && (typeof r[i].min === 'undefined' || typeof r[i].max === 'undefined')) {
				delete r[i];
			}
		}
	}

	if (JSON.stringify(r) === '{}') {
		if (opts.get('enable') || opts.get('disable') || opts.get('remove')) {
			util.error('見つかりません');
		} else {
			util.error('ルールが空です。一つ以上の条件が必要です。');
		}
		process.exit(1);
	}

	if (opts.get('enable')) {
		if (r.isDisabled) {
			delete r.isDisabled;
		}
	}

	if (opts.get('disable')) {
		r.isDisabled = true;
	}

	if (opts.get('n')) {
		if (opts.get('remove')) {
			rules.splice(parseInt(opts.get('n'), 10), 1);
		} else {
			rules[parseInt(opts.get('n'), 10)] = r;
		}
	} else {
		rules.push(r);
	}

	if (opts.get('simulation')) {
		if (opts.get('remove')) {
			console.log('[simulation] ルールを削除します');
		} else {
			console.log('[simulation] Rule config:');
			console.log(JSON.stringify(r, null, '  '));
		}
	} else {
		if (opts.get('remove')) {
			console.log('ルールを削除します');
		} else {
			console.log('Rule config:');
			console.log(JSON.stringify(r, null, '  '));
		}
		fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, '  '));
	}

	process.exit(0);
}

// Rule List
function chinachuRuleList() {
	// table
	var t = new Table;

	// keys
	var keys = [
		'types', 'categories', 'channels', 'ignore_channels', 'reserve_flags',
		'ignore_flags', 'hour', 'duration', 'reserve_titles', 'ignore_titles',
		'reserve_descriptions', 'ignore_descriptions'
	];

	// output
	var cnt = 0;

	rules.forEach(function(a, i) {
		if (opts.get('num')) {
			if (i !== parseInt(opts.get('num'), 10)) {
				return;
			}
		}

		t.cell('#', i);

		keys.forEach(function(b) {
			switch (typeof a[b]) {
				case 'object':
					if (
						!opts.get('detail') && (
							(b.indexOf('titles') !== -1) ||
							(b.indexOf('descriptions') !== -1)
						)
					) {
						t.cell(b, '[' + Object.keys(a[b]).length + ']');
					} else {
						var val = [];
						Object.keys(a[b]).forEach(function(c, j) {
							val[j] = a[b][c];
						});
						t.cell(b, val.join(', '), null, (val.join(', ').length > 20) ? 20 : null);
					}
					break;

				case 'string':
					t.cell(b, a[b]);
					break;

				case 'undefined':
					t.cell(b, '-');
					break;
			}
		});

		t.newRow();
		++cnt;
	});

	if (cnt === 0) {
		console.log('見つかりません');
	} else if (cnt === 1) {
		console.log(t.printTransposed().trim());
	} else {
		if (opts.get('simple')) {
			console.log(t.print().trim());
		} else {
			console.log(t.toString().trim());
		}
	}

	process.exit(0);
}

// Program List
function chinachuProgramList(target) {
	// matching
	var matches = [];

	target.forEach(function(p) {
		if (isMatchedProgram(p)) {
			matches.push(p);
		}
	});

	// sort
	matches.sort(function(a, b) {
		return a.start - b.start;
	});

	// table
	var t = new Table;

	// output
	matches.forEach(function(a, i) {
		if (opts.get('num')) {
			if (i !== parseInt(opts.get('num'), 10)) {
				return;
			}
		}

		t.cell('#', i);
		if (!opts.get('simple') || opts.get('detail')) t.cell('Program ID', a.id);
		t.cell('Type:CH', a.channel.type + ':' + a.channel.channel);
		if (opts.get('detail')) t.cell('SID', a.channel.sid);
		t.cell('Cat', a.category);
		if (opts.get('simple')) {
			t.cell('Datetime', dateFormat(new Date(a.start), 'dd HH:MM'));
		} else {
			// TODO: isConflict を見る
			t.cell('By', a.isManualReserved ? 'user' : 'rule');
			t.cell('Datetime', dateFormat(new Date(a.start), 'yy/mm/dd HH:MM'));
		}
		t.cell('Dur', (a.seconds / 60) + 'm');
		t.cell('Title', a.title);
		if (opts.get('detail')) t.cell('Description', a.detail);

		t.newRow();
	});

	if (matches.length === 0) {
		console.log('見つかりません');
	} else {
		if (opts.get('simple')) {
			console.log(t.print().trim());
		} else {
			console.log(t.toString().trim());
		}
	}

	process.exit(0);
}

// Clean-up
function chinachuCleanup() {
	var t = new Table;

	recorded = (function() {
		var array = [];

		recorded.forEach(function(a) {
			if (fs.existsSync(a.recorded)) {
				array.push(a);

				t.cell('action', 'exist');
			} else {
				if (opts.get('simulation')) {
					t.cell('action', '[simulation] removed');
				} else {
					t.cell('action', 'removed');
				}
			}

			t.cell('Program ID', a.id);
			t.cell('Recorded', a.recorded);

			t.newRow();
		});

		return array;
	})();

	if (!opts.get('simulation')) {
		fs.writeFileSync(RECORDED_DATA_FILE, JSON.stringify(recorded));
	}

	console.log(t.print().trim());

	process.exit(0);
}

// IRC bot
function chinachuIrcbot() {
	if (!opts.get('host') || !opts.get('ch')) {
		util.error('require: -host, -ch');
		util.error('option : -port');
		process.exit(1);
	}

	var irc = {
		host: opts.get('host'),
		port: parseInt(opts.get('port') || 6667, 10),
		ch  : opts.get('ch'),
		nick: opts.get('nick') || 'chinachu_bot'
	};

	irc.socket = new net.Socket();

	irc.socket.on('connect', function() {
		util.log('接続されました...');
		setTimeout(function() {
			irc.raw('NICK ' + irc.nick);
			irc.raw('USER chinachu 8 * :Chinachu IRC bot (Node)');
			irc.raw('JOIN ' + irc.ch);
		}, 1000);
	});

	irc.socket.on('data', function(data) {
		data = data.split('\n');
		for (var i = 0; i < data.length; i++) {
			if (data[i] !== '') {
				//util.log(data[i]);
				irc.handle(data[i].slice(0, -1));
			}
		}
	});

	irc.handle = function(data) {
		var info;
		for (var i = 0; i < irc.listeners.length; i++) {
			info = irc.listeners[i][0].exec(data);
			if (info) {
				irc.listeners[i][1](info, data);
				if (irc.listeners[i][2]) {
					irc.listeners.splice(i, 1);
				}
			}
		}
	};

	irc.listeners = [];

	irc.on = function(data, callback) {
		irc.listeners.push([data, callback, false])
	};

	irc.once = function(data, callback) {
		irc.listeners.push([data, callback, true]);
	};

	irc.raw = function(data) {
		irc.socket.write(data + '\n', 'utf-8', function() {
			util.log('SENT -' + data);
		});
	};

	irc.on(/^PING :(.+)$/i, function(info) {
		irc.raw('PONG :' + info[1]);
	});

	irc.on(/^:.+ PRIVMSG .+ :chinachu (.+)$/i, function(msg) {
		util.log('CHII -' + msg[1]);

		var args = msg[1].split(' ');

		switch (args[0]) {
			case 'search':
			case 'rules':
			case 'reserves':
			case 'recording':
			case 'recorded':
				break;
			default:
				irc.notice(irc.ch, '無効なコマンド');
				return;
		}

		args.push('-simple');

		var c = child_process.spawn('./chinachu', args);

		c.stdout.on('data', function(data) {
			var arr = (data + '').split('\n');

			if (arr.length > 20) {
				irc.notice(irc.ch, '結果が多すぎ');
			} else {
				arr.forEach(function(line, i) {
					if (line) {
						setTimeout(function() {
							irc.notice(irc.ch, line);
						}, 250 * i);
					}
				});
			}
		});
	});

	irc.join = function(chan, callback) {
		if (callback !== undefined) {
			irc.once(new RegExp('^:' + irc.info.nick + '![^@]+@[^ ]+ JOIN :' + chan), callback);
		}
		irc.info.names[chan] = {};
		irc.raw('JOIN ' + chan);
	};

	irc.msg = function(chan, msg) {
		var max_length = 500 - chan.length;

		var msgs = msg.match(new RegExp('.{1,' + max_length + '}', 'g'));

		var interval = setInterval(function() {
			irc.raw('PRIVMSG ' + chan + ' :' + msgs[0]);
			msgs.splice(0, 1);
			if (msgs.length === 0) {
				clearInterval(interval);
			}
		}, 1000);
	};

	irc.notice = function(chan, msg) {
		var max_length = 500 - chan.length;

		var msgs = msg.match(new RegExp('.{1,' + max_length + '}', 'g'));

		var interval = setInterval(function() {
			irc.raw('NOTICE ' + chan + ' :' + msgs[0]);
			msgs.splice(0, 1);
			if (msgs.length === 0) {
				clearInterval(interval);
			}
		}, 1000);
	};

	irc.socket.setEncoding('utf-8');
	irc.socket.setNoDelay();
	irc.socket.connect(irc.port, irc.host);
}

// (function) rule checker
function isMatchedProgram(program) {
	var result = false;
	var nf = config.normalizationForm;

	// -id, --id
	if (opts.get('id') && (opts.get('id') === program.id)) {
		return true;
	}
	if (opts.get('id') && (opts.get('id') !== program.id)) {
		return false;
	}

	(function _check() {

		// sid
		if (rule.sid && rule.sid !== program.channel.sid) return;

		// types
		if (rule.types) {
			if (rule.types.indexOf(program.channel.type) === -1) return;
		}

		// channels
		if (rule.channels) {
			if (rule.channels.indexOf(program.channel.channel) === -1) return;
		}

		// ignore_channels
		if (rule.ignore_channels) {
			if (rule.ignore_channels.indexOf(program.channel.channel) !== -1) return;
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
			var progEndMinute = new Date(program.end).getMinutes();

			if (progStart > progEnd) {
				progEnd += 24;
			}
			if (progEndMinute === 0 ) {
				progEnd -= 1;
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

		var title_norm, detail_norm;
		if (nf) {
			title_norm = program.title.normalize(nf);
			if (program.detail) {
				detail_norm = program.detail.normalize(nf);
			}
		}
		// ignore_titles
		if (rule.ignore_titles) {
			for (var i = 0; i < rule.ignore_titles.length; i++) {
				if (nf) {
					if (title_norm.match(new RegExp(rule.ignore_titles[i].normalize(nf))) !== null) return;
				}
				else {
					if (program.title.match(new RegExp(rule.ignore_titles[i])) !== null) return;
				}
			}
		}

		// reserve_titles
		if (rule.reserve_titles) {
			var isFound = false;

			for (var i = 0; i < rule.reserve_titles.length; i++) {
				if (nf) {
					if (title_norm.match(new RegExp(rule.reserve_titles[i].normalize(nf))) !== null) isFound = true;
				}
				else {
					if (program.title.match(new RegExp(rule.reserve_titles[i])) !== null) isFound = true;
				}
			}

			if (!isFound) return;
		}

		// ignore_descriptions
		if (rule.ignore_descriptions) {
			if (!program.detail) return;

			for (var i = 0; i < rule.ignore_descriptions.length; i++) {
				if (nf) {
					if (detail_norm.match(new RegExp(rule.ignore_descriptions[i].normalize(nf))) !== null) return;
				}
				else {
					if (program.detail.match(new RegExp(rule.ignore_descriptions[i])) !== null) return;
				}
			}
		}

		// reserve_descriptions
		if (rule.reserve_descriptions) {
			if (!program.detail) return;

			var isFound = false;

			for (var i = 0; i < rule.reserve_descriptions.length; i++) {
				if (nf) {
					if (detail_norm.match(new RegExp(rule.reserve_descriptions[i].normalize(nf))) !== null) isFound = true;
				}
				else {
					if (program.detail.match(new RegExp(rule.reserve_descriptions[i])) !== null) isFound = true;
				}
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

	})();

	// -now, --now
	if (opts.get('now')) {
		if ((clock < program.start) || (clock > program.end)) return false;
	}

	// -today, --today
	if (opts.get('today')) {
		if (new Date(clock).getDate() !== new Date(program.start).getDate()) return false;
	}

	// -tomorrow, --tomorrow
	if (opts.get('tomorrow')) {
		if (new Date(clock).getDate() + 1 !== new Date(program.start).getDate()) return false;
	}

	return result;
}
