'use strict';

var should = require('should');
var chinachu = require('chinachu-common');

describe('convertPrograms', function() {
	// この番組情報を元にテストデータを作成する
	var baseProgram = {
		$: { start: '20150101000000 +0900', stop: '20150101003000 +0900', channel: 'GR_11111', event_id: '12345' },
		title: [
			{ $: { lang: 'ja_JP' }, _: 'タイトル' },
		],
		desc: [
			{ $: { lang: 'ja_JP' }, _: '説明文' },
		],
		category: [
			{ $: { lang: 'ja_JP' },  _: 'アニメ／特撮' },
			{ $: { lang: 'en' },  _: 'anime' },
		],
	};
	var ch = {
		type: 'GR',
		channel: '11',
		name: '放送局名',
		id: 'GR_11111',
		sid: '10000',
	};

	function clone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}

	it('番組情報をパースする', function() {
        var c = clone(baseProgram);

        var programs = chinachu.convertPrograms([c], ch);

		should.deepEqual(programs[0], {
			id: 'gr11111-9ix',
			channel: {
				type: 'GR',
				channel: '11',
				name: '放送局名',
				id: 'GR_11111',
				sid: '10000',
			},
			category: 'anime',
			title: 'タイトル',
			subTitle: '',
			fullTitle: 'タイトル',
			detail: '説明文',
			episode: null,
			start: new Date('2015-01-01 00:00:00').getTime(),
			end: new Date('2015-01-01 00:30:00').getTime(),
			seconds: 30 * 60,
			flags: [],
		});
	});

	function parseEpisodeNumber(episodeNumberStr) {
		var c = clone(baseProgram);
		c.desc = [
			{ $: { lang: 'ja_JP' }, _: episodeNumberStr },
		];

		var programs = chinachu.convertPrograms([c], ch);
		return programs[0].episode;
	}

	describe('話数のパース', function() {
		it('算用数字をパースする', function() {
			var testPatterns = [
				['＃０', 0], ['＃１', 1], ['＃２', 2], ['＃３', 3], ['＃４', 4],
				['＃５', 5], ['＃６', 6], ['＃７', 7], ['＃８', 8], ['＃９', 9],

				['＃００', 0], ['＃０１', 1], ['＃０２', 2], ['＃０３', 3], ['＃０４', 4],
				['＃０５', 5], ['＃０６', 6], ['＃０７', 7], ['＃０８', 8], ['＃０９', 9],
				['＃１０', 10], ['＃１１', 11], ['＃１２', 12], ['＃１３', 13], ['＃１４', 14],
				['＃１５', 15], ['＃１６', 16], ['＃１７', 17], ['＃１８', 18], ['＃１９', 19],
				['＃２０', 20], ['＃２１', 21], ['＃２２', 22], ['＃２３', 23], ['＃２４', 24],

				['#1', 1], ['#01', 1], ['♯1', 1], ['♯01', 1],
				['第1回', 1], ['第１回', 1], ['第1話', 1], ['第１話', 1],
			];

			testPatterns.forEach(function(pattern) {
				var episodeNumberStr = pattern[0];
				var expected = pattern[1];

				should.strictEqual(parseEpisodeNumber(episodeNumberStr), expected, episodeNumberStr);
			});
		});

		it('漢数字をパースする', function() {
			var testPatterns = [
				['第零話', 0],
				['第一話', 1], ['第壱話', 1], ['第壹話', 1], ['第弌話', 1],
				['第二話', 2], ['第弐話', 2], ['第貮話', 2], ['第貳話', 2],
				['第三話', 3], ['第参話', 3], ['第參話', 3], ['第弎話', 3],
				['第四話', 4], ['第肆話', 4],
				['第五話', 5], ['第伍話', 5],
				['第六話', 6], ['第陸話', 6],
				['第七話', 7], ['第柒話', 7], ['第漆話', 7],
				['第八話', 8], ['第捌話', 8],
				['第九話', 9], ['第玖話', 9],

				['第十話', 10], ['第十一話', 11], ['第十二話', 12], ['第十三話', 13], ['第十四話', 14],
				['第十五話', 15], ['第十六話', 16], ['第十七話', 17], ['第十八話', 18], ['第十九話', 19],
				['第二十話', 20], ['第二十一話', 21], ['第二十二話', 22], ['第二十三話', 23], ['第二十四話', 24],

				// 「十」を含まないパターン
				['第二一話', 21], ['第二二話', 22], ['第二三話', 23], ['第二四話', 24],

				// 大字 (Issue #246)
				// 10 話以上の話数で 壱, 弐, 参, 伍, 拾 以外の大字を使う作品は見つからなかったので考慮していない
				['第拾話', 10], ['第拾壱話', 11], ['第拾弐話', 12], ['第壱参話', 13], ['第壱四話', 14],
				['第壱伍話', 15], ['第壱六話', 16], ['第壱七話', 17], ['第壱八話', 18], ['第壱九話', 19],
				['第弐拾話', 20], ['第弐拾壱話', 21], ['第弐拾弐話', 22], ['第弐拾参話', 23], ['第弐拾四話', 24],
			];

			testPatterns.forEach(function(pattern) {
				var episodeNumberStr = pattern[0];
				var expected = pattern[1];

				should.strictEqual(parseEpisodeNumber(episodeNumberStr), expected, episodeNumberStr);
			});
		});

		// Issue #242
		it('タイトル（第ｎ話）の形式の話数をパースする', function() {
			var c = clone(baseProgram);
			c.title = [
				{ $: { lang: 'ja_JP' }, _: 'タイトル（第１０話）' },
			];

			var programs = chinachu.convertPrograms([c], ch);
			should.strictEqual(programs[0].title, 'タイトル');
			should.strictEqual(programs[0].episode, 10);
		});

		// Issue #242
		it('タイトル（ｎ）の形式の話数をパースする', function() {
			var c = clone(baseProgram);
			c.title = [
				{ $: { lang: 'ja_JP' }, _: 'タイトル（１０）' },
			];

			var programs = chinachu.convertPrograms([c], ch);
			should.strictEqual(programs[0].title, 'タイトル');
			should.strictEqual(programs[0].episode, 10);
		});

		// Issue #242
		it('タイトル「ｎ話」の形式の話数をパースする', function() {
			var c = clone(baseProgram);
			c.title = [
				{ $: { lang: 'ja_JP' }, _: 'タイトル「１０話」' },
			];

			var programs = chinachu.convertPrograms([c], ch);
			should.strictEqual(programs[0].title, 'タイトル');
			should.strictEqual(programs[0].episode, 10);
		});
	});

	context('title に話数とサブタイトルが含まれている場合', function() {
		var c = clone(baseProgram);
		c.title = [
			{ $: { lang: 'ja_JP' }, _: 'タイトル　＃１「サブタイトル」' },
		];
		c.desc = [
			{ $: { lang: 'ja_JP' }, _: '' },
		];

		var programs = chinachu.convertPrograms([c], ch);

		it('episode には title から抽出した話数が入る', function() {
			should.strictEqual(programs[0].episode, 1);
		});
		it('subTitle には title から抽出したサブタイトルが入る', function() {
			should.strictEqual(programs[0].subTitle, 'サブタイトル');
		});
		it('title から話数を除去し、サブタイトルは残す', function() {
			should.strictEqual(programs[0].title, 'タイトル　「サブタイトル」');
		});
	});

	context('title に話数が、desc にサブタイトルが含まれている場合', function() {
		var c = clone(baseProgram);
		c.title = [
			{ $: { lang: 'ja_JP' }, _: 'タイトル　＃１' },
		];
		c.desc = [
			{ $: { lang: 'ja_JP' }, _: '「サブタイトル」' },
		];

		var programs = chinachu.convertPrograms([c], ch);

		it('episode には title から抽出した話数が入る', function() {
			should.strictEqual(programs[0].episode, 1);
		});
		it('subTitle には desc から抽出したサブタイトルが入る', function() {
			should.strictEqual(programs[0].subTitle, 'サブタイトル');
		});
		it('title から話数を除去する', function() {
			should.strictEqual(programs[0].title, 'タイトル');
		});
	});

	context('desc に話数とサブタイトルが含まれている場合', function() {
		var c = clone(baseProgram);
		c.title = [
			{ $: { lang: 'ja_JP' }, _: 'タイトル' },
		];
		c.desc = [
			{ $: { lang: 'ja_JP' }, _: '＃１「サブタイトル」' },
		];

		var programs = chinachu.convertPrograms([c], ch);

		it('episode には desc から抽出した話数が入る', function() {
			should.strictEqual(programs[0].episode, 1);
		});
		it('subTitle には desc から抽出したサブタイトルが入る', function() {
			should.strictEqual(programs[0].subTitle, 'サブタイトル');
		});
		it('title は変化しない', function() {
			should.strictEqual(programs[0].title, 'タイトル');
		});
	});

	describe('サブタイトル誤爆対策', function() {
		// Issue #184
		context('TVアニメ「〜」', function() {
			var c = clone(baseProgram);
			c.title = [
				{ $: { lang: 'ja_JP' }, _: 'TVアニメ「アニメのタイトル」' },
			];
			c.desc = [
				{ $: { lang: 'ja_JP' }, _: '＃１「サブタイトル」' },
			];

			var programs = chinachu.convertPrograms([c], ch);

			it('「TVアニメ」をタイトルに含めない', function() {
				should.strictEqual(programs[0].title, 'アニメのタイトル');
			});
			it('desc にサブタイトルや話数があればそれを使う', function() {
				should.strictEqual(programs[0].subTitle, 'サブタイトル');
				should.strictEqual(programs[0].episode, 1);
			});
		});

		// Issue #28
		context('劇場版「〜」', function() {
			var c = clone(baseProgram);
			c.title = [
				{ $: { lang: 'ja_JP' }, _: '劇場版「魔女っ娘ミラクるん」' },
			];
			c.desc = [
				{ $: { lang: 'ja_JP' }, _: '＃１「サブタイトル」' },
			];

			var programs = chinachu.convertPrograms([c], ch);

			it('劇場版とその後に続く鉤括弧の内容も含めてタイトルとして扱う', function() {
				should.strictEqual(programs[0].title, '劇場版「魔女っ娘ミラクるん」');
			});
			it('desc にサブタイトルや話数があればそれを使う', function() {
				should.strictEqual(programs[0].subTitle, 'サブタイトル');
				should.strictEqual(programs[0].episode, 1);
			});
		});

		// Issue #242
		context('タイトル「１０話」', function() {
			var c = clone(baseProgram);
			c.title = [
				{ $: { lang: 'ja_JP' }, _: 'タイトル「１０話」' },
			];
			c.desc = [
				{ $: { lang: 'ja_JP' }, _: '「サブタイトル」' },
			];

			var programs = chinachu.convertPrograms([c], ch);

			it('「１０話」の部分はタイトルに含めない', function() {
				should.strictEqual(programs[0].title, 'タイトル');
			});
			it('「１０話」の部分は話数として扱う', function() {
				should.strictEqual(programs[0].episode, 10);
			});
			it('desc にサブタイトルがあればそれを使う', function() {
				should.strictEqual(programs[0].subTitle, 'サブタイトル');
			});
		});
	});
});
