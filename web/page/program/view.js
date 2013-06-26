P = Class.create(P, {
	
	init: function() {
		
		this.view.content.className = 'loading';
		
		this.program = chinachu.util.getProgramById(this.self.query.id);
		
		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:reserves', this.onNotify);
		document.observe('chinachu:recording', this.onNotify);
		document.observe('chinachu:recorded', this.onNotify);
		document.observe('chinachu:schedule', this.onNotify);
		
		if (this.program === null) {
			return this;
		}
		
		this.initToolbar();
		this.draw();
		
		return this;
	}
	,
	deinit: function() {
		
		document.stopObserving('chinachu:reserves', this.onNotify);
		document.stopObserving('chinachu:recording', this.onNotify);
		document.stopObserving('chinachu:recorded', this.onNotify);
		document.stopObserving('chinachu:schedule', this.onNotify);
		
		this.app.view.mainBody.entity.style.backgroundImage = '';
		
		return this;
	}
	,
	refresh: function() {
		
		this.app.pm.realizeHash(true);
		
		return this;
	}
	,
	initToolbar: function _initToolbar() {
		
		
		
		return this;
	}
	,
	draw: function() {
		
		console.log(this.program);
		
		var program = this.program;
		
		this.view.content.className = 'bg-fog';
		this.view.content.update();
		
		var titleHtml = program.flags.invoke('sub', /.+/, '<span class="flag #{0}">#{0}</span>').join('') + program.title;
		if (typeof program.episode !== 'undefined' && program.episode !== null) {
			titleHtml += '<span class="episode">#' + program.episode + '</span>';
		}
		titleHtml += '<span class="id">#' + program.id + '</span>';
		
		if (program.isManualReserved) {
			titleHtml = '<span class="flag manual">手動</span>' + titleHtml;
		}
		
		setTimeout(function() {
			this.view.title.update(titleHtml);
		}.bind(this), 0);
		
		if (program._isReserves) {
			new sakura.ui.Alert({
				title       : '予約済',
				type        : 'blue',
				body        : 'この番組は録画予約済みです',
				disableClose: true
			}).render(this.view.content);
		}
		
		if (program._isRecording) {
			new sakura.ui.Alert({
				title       : '録画中',
				type        : 'red',
				body        : program.recorded,
				disableClose: true
			}).render(this.view.content);
		}
		
		if (program._isRecorded) {
			new sakura.ui.Alert({
				title       : '録画済',
				type        : 'green',
				body        : program.recorded,
				disableClose: true
			}).render(this.view.content);
		}
		
		var meta = new flagrate.Element('div', { 'class': 'program-meta' }).update(
			' &ndash; ' +
			dateFormat(new Date(program.end), 'HH:MM') +
			' (' + (program.seconds / 60) + '分間)<br>' + 
			'<small><span class="bg-cat-' + program.category + '">' + program.category + '</span> / ' + program.channel.type + ': ' + 
			'<a href="#!/search/top/skip=1&chid=' + program.channel.id + '/">' + program.channel.name + '</a>' +
			'</small>'
		).insertTo(this.view.content);
		
		meta.insert({ top: 
			new chinachu.ui.DynamicTime({
				tagName: 'span',
				type   : 'full',
				time   : program.start
			}).entity
		});
		
		new flagrate.Element('div', { 'class': 'program-detail' }).update(
			program.detail
		).insertTo(this.view.content);
		
		if (program.command) {
			new sakura.ui.Alert({
				title       : '録画コマンド',
				type        : 'white',
				body        : program.command,
				disableClose: true
			}).render(this.view.content);
		}
		
		if (program._isRecording) {
			new sakura.ui.Alert({
				title       : 'プロセスID',
				type        : 'white',
				body        : program.pid,
				disableClose: true
			}).render(this.view.content);
		}
		
		if (program.tuner) {
			new sakura.ui.Alert({
				title       : 'チューナー(番号)',
				type        : 'white',
				body        : program.tuner.name + ' (' + program.tuner.n + ')',
				disableClose: true
			}).render(this.view.content);
		}
		
		/* new sakura.ui.Alert({
			title       : 'EPG/理題',
			type        : 'white',
			body        : (
				'<br>タイトル: "' + program.fullTitle + '", 概要: "' + program.detail + '"<br>' +
				'∴<br>' +
				'主題: "' + program.title + '", 副題: "' + program.subTitle + '", 話数: ' + (program.episode || 'n')
			),
			disableClose: true
		}).render(this.view.content); */
		
		if (program._isRecorded) {
			new Ajax.Request('./api/recorded/' + program.id + '/file.json', {
				method: 'get',
				onSuccess: function(t) {
					
					if (this.app.pm.p.id !== this.id) return;
					
					if (global.chinachu.status.feature.filer) {
						//programViewSub.insert(
						//	'<a onclick="new app.ui.RemoveRecordedFile(\'' + program.id + '\')">録画ファイルの削除</a>'
						//);
					}
					
					if (global.chinachu.status.feature.streamer && !program.tuner.isScrambling) {
						//programViewSub.insert(
						//	'<a onclick="new app.ui.Streamer(\'' + program.id + '\')">ストリーミング再生</a>'
						//);
					}
					
					new sakura.ui.Alert({
						title       : 'ファイルサイズ',
						type        : 'white',
						body        : (t.responseJSON.size / 1024 / 1024 / 1024 / 1).toFixed(2) + 'GB',
						disableClose: true
					}).render(this.view.content);
					
				}.bind(this),
				onFailure: function(t) {
					
					if (this.app.pm.p.id !== this.id) return;
					
					if (t.status === 410) {
						new sakura.ui.Alert({
							type        : 'red',
							body        : 'この番組の録画ファイルは移動または削除されています',
							disableClose: true
						}).render(this.view.content);
					}
				}.bind(this)
			});
		}
		
		if (global.chinachu.status.feature.previewer && program._isRecorded) {
			new Ajax.Request('./api/recorded/' + program.id + '/preview.txt', {
				method    : 'get',
				parameters: {width: 640, height: 360, pos: 32},
				onSuccess : function(t) {
					
					if (this.app.pm.p.id !== this.id) return;
					
					this.app.view.mainBody.entity.style.backgroundImage = 'url(' + t.responseText + ')';
				}.bind(this)
			});
		}
		
		return this;
	}
});