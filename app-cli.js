/*!
 *  Chinachu SubCLI (chinachu-cli)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://akkar.in/projects/chinachu/
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

// ディレクトリチェック
if (!fs.existsSync('./data/') || !fs.existsSync('./log/') || !fs.existsSync('./web/')) {
	util.error('必要なディレクトリが存在しないか、カレントワーキングディレクトリが不正です。');
	process.exit(1);
}

// 追加モジュールのロード
var opts       = require('opts');
var dateFormat = require('dateformat');
var Table      = require('easy-table');

// 引数
opts.parse([
	{
		short      : 'mode',
		long       : 'mode',
		description: '動作モード',
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
		short      : 'd',
		long       : 'detail',
		description: '詳細',
		value      : false,
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
		short      : '^flag',
		long       : 'ignore-flags',
		description: '無視フラグ',
		value      : true,
		required   : false
	}
].reverse(), true);

// 設定の読み込み
var config    = JSON.parse( fs.readFileSync(CONFIG_FILE, 'ascii') );
var rules     = JSON.parse( fs.readFileSync(RULES_FILE, 'ascii') || '[]' );
var schedule  = JSON.parse( fs.readFileSync(SCHEDULE_DATA_FILE, 'ascii') || '[]' );
var reserves  = JSON.parse( fs.readFileSync(RESERVES_DATA_FILE, 'ascii') || '[]' );
var recording = JSON.parse( fs.readFileSync(RECORDING_DATA_FILE, 'ascii') || '[]' );
var recorded  = JSON.parse( fs.readFileSync(RECORDED_DATA_FILE, 'ascii') || '[]' );
var channels  = JSON.parse( JSON.stringify(config.channels) );

var clock     = new Date().getTime();

// ルール
var rule = {
	sid: opts.get('sid') || null,
	hour: {
		start: parseInt(opts.get('start') || 0, 10),
		end  : parseInt(opts.get('end')   || 24, 10)
	},
	duration: {
		min: parseInt(opts.get('mini') || 0, 10),
		max: parseInt(opts.get('maxi') || 99999999, 10)
	}
};

if (opts.get('type'))   rule.types                = opts.get('type').split(',');
if (opts.get('ch'))     rule.channels             = opts.get('ch').split(',');
if (opts.get('^ch'))    rule.ignore_channels      = opts.get('^ch').split(',');
if (opts.get('cat'))    rule.categories           = opts.get('cat').split(',');
if (opts.get('title'))  rule.reserve_titles       = opts.get('title').split(',');
if (opts.get('^title')) rule.ignore_titles        = opts.get('^title').split(',');
if (opts.get('desc'))   rule.reserve_descriptions = opts.get('desc').split(',');
if (opts.get('^desc'))  rule.ignore_descriptions  = opts.get('^desc').split(',');
if (opts.get('^flag'))  rule.ignore_flags         = opts.get('^flag').split(',');

// 動作モード
switch (opts.get('mode')) {
	// 検索
	case 'search':
		chinachuSearch();
		break;
	default:
		break;
}

process.exit(0);

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
		t.cell('#', i);
		t.cell('Program ID', a.id);
		t.cell('Type:CH', a.channel.type + ':' + a.channel.channel);
		if (opts.get('detail')) t.cell('SID', a.channel.sid);
		t.cell('Cat', a.category);
		t.cell('Datetime', dateFormat(new Date(a.start), 'yy/mm/dd HH:MM').replace('T', ' '));
		t.cell('Dur', (a.seconds / 60) + 'm');
		t.cell('Title', a.title);
		if (opts.get('detail')) t.cell('Description', a.detail);
		
		t.newRow();
	});
	
	if (matches.length === 0) {
		util.puts('見つかりません');
	} else {
		util.puts(t.toString().trim());
	}
}

// (function) rule checker
function isMatchedProgram(program) {
	var result = false;
	
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
			for (var i = 0; i < rule.ignore_descriptions.length; i++) {
				if (program.detail.match(rule.ignore_descriptions[i]) !== null) return;
			}
		}
		
		// reserve_descriptions
		if (rule.reserve_descriptions) {
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