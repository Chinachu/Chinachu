P = Class.create(P, {

	init: function() {

		this.view.content.className = 'loading';

		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:recording', this.onNotify);
		document.observe('chinachu:recorded', this.onNotify);

		if (!this.self.query.id) {
			this.modal = new flagrate.Modal({
				title: 'チャンネルが見つかりません',
				text : 'チャンネルが見つかりません',
				buttons: [
					{
						label: 'ダッシュボード',
						color: '@pink',
						onSelect: function(e, modal) {
							window.location.hash = '!/dashboard/top/';
						}
					}
				]
			}).show();
			return this;
		}

		this.channelId = this.self.query.id;

		this.initToolbar();
		this.draw();

		return this;
	}
	,
	deinit: function() {

		if (this.video) {
			this.video.src = "";
		}

		if (this.modal) setTimeout(function() { this.modal.close(); }.bind(this), 0);

		document.stopObserving('chinachu:recording', this.onNotify);
		document.stopObserving('chinachu:recorded', this.onNotify);

		return this;
	}
	,
	refresh: function() {

		if (!this.isPlaying) this.app.pm.realizeHash(true);

		return this;
	}
	,
	initToolbar: function _initToolbar() {
		return this;
	}
	,
	draw: function() {

		this.view.content.className = 'bg-black';
		this.view.content.update();

		var titleHtml = "ライブ視聴";

		setTimeout(function() {
			this.view.title.update(titleHtml);
		}.bind(this), 0);

		var saveSettings = function (d) {
			localStorage.setItem('channel.watch.settings', JSON.stringify(d));
		};

		var set = JSON.parse(localStorage.getItem('channel.watch.settings') || '{}');

		if (!set.s) {
			set.s = '1280x720';
		}
		if (!set.ext) {
			set.ext = 'mp4';
		}
		if (!set['b:v']) {
			set['b:v'] = '1M';
		}
		if (!set['b:a']) {
			set['b:a'] = '128k';
		}

		var buttons = [];

		var video = document.createElement("video");
		var canPlayVideo = video.canPlayType('video/webm; codecs="vp8, vorbis"') === "probably";

		if (/Android|iPhone|iPad/.test(navigator.userAgent) === true || canPlayVideo === false) {
			buttons.push({
				label  : '再生 (VLC)',
				color  : '@pink',
				onSelect: function(e, modal) {

					this.form.validate(function (success) {
						if (!success) { return; }

						var d = this.d = this.form.getResult();
						saveSettings(d);

						var url = location.host + location.pathname.replace(/\/[^\/]*$/, '');

						url += '/api/channel/';
						url += this.channelId + '/watch.' + d.ext + '?' + Object.toQueryString(d);

						if (/Android/.test(navigator.userAgent) === true) {
							location.href = "intent://" + url + "#Intent;package=org.videolan.vlc;type=video;scheme=" + location.protocol.replace(':','') + ';end';
						} else {
							location.href = "vlc-x-callback://x-callback-url/stream?url=" + encodeURIComponent(location.protocol + '//' + url);
						}
					}.bind(this));
				}.bind(this)
			});
		} else {
			buttons.push({
				label  : '再生',
				color  : '@pink',
				onSelect: function(e, modal) {

					this.form.validate(function (success) {
						if (!success) { return; }

						var d = this.d = this.form.getResult();
						saveSettings(d);

						if (d.ext === 'm2ts') {
							new flagrate.Modal({
								title: 'エラー',
								text : 'MPEG-2 TSコンテナの再生はサポートしていません。'
							}).show();
							return;
						}

						modal.close();
						this.play();
					}.bind(this));
				}.bind(this)
			});

			buttons.push({
				label  : 'XSPF',
				color  : '@orange',
				onSelect: function(e, modal) {

					this.form.validate(function (success) {
						if (!success) { return; }

						var d = this.form.getResult();
						saveSettings(d);

						var url = d.prefix = location.protocol + '//' + location.host + location.pathname.replace(/\/[^\/]*$/, '');

						d.prefix += '/api/channel/' + this.channelId + '/';
						url += '/api/channel/';

						url += this.channelId + '/watch.xspf?' + Object.toQueryString(d);
						location.href = url;
					}.bind(this));
				}.bind(this)
			});
		}

		var modal = this.modal = new flagrate.Modal({
			disableCloseByMask: true,
			disableCloseButton: true,
			target: this.view.content,
			title : 'ストリーミング再生',
			buttons: buttons
		}).show();

		var exts = [];

		exts.push({
			label     : 'M2TS',
			value     : 'm2ts'
		});

		exts.push({
			label     : 'MP4',
			value     : 'mp4'
		});

		this.form = flagrate.createForm({
			fields: [
				{
					key: "ext",
					label: "コンテナ形式",
					input: {
						type: "radios",
						isRequired: true,
						val: set.ext,
						items: exts
					}
				},
				{
					pointer: "/c:v",
					label: "映像コーデック",
					input: {
						type: "radios",
						isRequired: true,
						val: set['c:v'],
						items: [
							{
								label: '無変換',
								value: 'copy'
							},
							{
								label: 'H.264',
								value: 'h264'
							},
							{
								label: 'MPEG-2',
								value: 'mpeg2video'
							}
						]
					},
					depends: [
						{ key: "ext", val: "m2ts" }
					]
				},
				{
					pointer: '/c:a',
					label: '音声コーデック',
					input: {
						type: 'radios',
						isRequired: true,
						val: set['c:a'],
						items: [
							{
								label: '無変換',
								value: 'copy'
							},
							{
								label: 'AAC',
								value: 'aac'
							},
							{
								label: 'Vorbis',
								value: 'libvorbis'
							}
						]
					},
					depends: [
						{ key: 'ext', val: 'm2ts' }
					]
				},
				{
					key: 's',
					label: 'サイズ',
					input: {
						type: 'select',
						isRequired: true,
						val: set.s,
						items: [
							{
								label: '576p (WSVGA)',
								value: '1024x576'
							},
							{
								label: '720p (HD)',
								value: '1280x720'
							},
							{
								label: '1080p (FHD)',
								value: '1920x1080'
							}
						]
					},
					depends: [
						{ pointer: '/c:v', val: 'copy', op: '!==' }
					]
				},
				{
					key: 'b:v',
					label: '映像ビットレート',
					input: {
						type: 'radios',
						isRequired: true,
						val: set['b:v'],
						items: [
							{
								label: '256kbps',
								value: '256k'
							},
							{
								label: '512kbps',
								value: '512k'
							},
							{
								label: '1Mbps',
								value: '1M'
							},
							{
								label: '2Mbps',
								value: '2M'
							},
							{
								label: '3Mbps',
								value: '3M'
							}
						]
					},
					depends: [
						{ pointer: '/c:v', val: 'copy', op: '!==' }
					]
				},
				{
					key: 'b:a',
					label: '音声ビットレート',
					input: {
						type: 'radios',
						isRequired: true,
						val: set['b:a'],
						items: [
							{
								label: '64kbps',
								value: '64k'
							},
							{
								label: '128kbps',
								value: '128k'
							},
							{
								label: '192kbps',
								value: '192k'
							}
						]
					},
					depends: [
						{ pointer: '/c:a', val: 'copy', op: '!==' }
					]
				}
			]
		});

		this.form.insertTo(modal.content);

		return this;
	},
	play: function() {
		this.isPlaying = true;
		var d = this.d;

		d.ss = d.ss || 0;

		// if (p._isRecording) d.ss = '';

		var getRequestURI = function() {

			var r = window.location.protocol + '//' + window.location.host + window.location.pathname.replace(/\/[^\/]*$/, '');
			r += '/api/channel/' + this.channelId + '/watch.' + d.ext;
			var q = Object.toQueryString(d);

			return r + '?' + q;
		}.bind(this);

		// create video view

		var videoContainer = new flagrate.Element('div', {
			'class': 'video-container'
		}).insertTo(this.view.content);

		var video = this.video = new flagrate.Element('video', {
			src: getRequestURI(),
			autoplay: true,
			controls: false
		}).insertTo(videoContainer);

		// debug
		window.video = video;

		video.onloadstart = function () {
			control.getElementByKey("status").update("Loading...");
		};

		video.onpause = function () {
			control.getElementByKey("status").update("Stopped");
		};

		video.onplay = function () {
			control.getElementByKey("status").update("Live");
		};

		video.volume = 1;

		// create control view

		var control = new flagrate.Toolbar({
			className: 'video-control',
			items: [
				{
					key: "status",
					element: new flagrate.Element("span").insert("...")
				},
				{
					key    : 'vol',
					element: new flagrate.Slider({ value: 10, max: 10 })
				}
			]
		}).insertTo(this.view.content);

		control.getElementByKey('vol').addEventListener('slide', function() {

			var vol = control.getElementByKey('vol');

			video.volume = vol.getValue() / 10;
		});

		return this;
	}
});
