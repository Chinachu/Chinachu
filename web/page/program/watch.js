P = Class.create(P, {

	init: function() {

		this.view.content.className = 'loading';

		this.program = chinachu.util.getProgramById(this.self.query.id);

		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:recording', this.onNotify);
		document.observe('chinachu:recorded', this.onNotify);

		if (this.program === null) {
			this.modal = new flagrate.Modal({
				title: '番組が見つかりません',
				text : '番組が見つかりません',
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

		this.initToolbar();
		this.draw();

		return this;
	}
	,
	deinit: function() {

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

		var program = this.program;

		this.view.toolbar.add({
			key: 'streaming',
			ui : new sakura.ui.Button({
				label  : '番組詳細',
				icon   : './icons/film.png',
				onClick: function() {
					window.location.hash = '!/program/view/id=' + program.id + '/';
				}
			})
		});

		return this;
	}
	,
	draw: function() {

		var program = this.program;

		this.view.content.className = 'bg-black';
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

		var saveSettings = function (d) {
			localStorage.setItem('program.watch.settings', JSON.stringify(d));
		};

		var set = JSON.parse(localStorage.getItem('program.watch.settings') || '{}');

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
			set['b:a'] = '96k';
		}

		var buttons = [
			{
				label  : '再生',
				color  : '@pink',
				onSelect: function(e, modal) {
					if (this.form.validate() === false) { return; }

					var d = this.d = this.form.result();

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
				}.bind(this)
			},
			{
				label  : 'XSPF',
				color  : '@orange',
				onSelect: function(e, modal) {
					if (this.form.validate() === false) { return; }

					var d = this.form.result();

					saveSettings(d);

					if (program._isRecording) {
						d.prefix = window.location.protocol + '//' + window.location.host;
						d.prefix += window.location.pathname.replace(/\/[^\/]*$/, '') + '/api/recording/' + program.id + '/';
						window.open('./api/recording/' + program.id + '/watch.xspf?' + Object.toQueryString(d));
					} else {
						d.prefix = window.location.protocol + '//' + window.location.host;
						d.prefix += window.location.pathname.replace(/\/[^\/]*$/, '') + '/api/recorded/' + program.id + '/';
						window.open('./api/recorded/' + program.id + '/watch.xspf?' + Object.toQueryString(d));
					}
				}.bind(this)
			}
		];
		if (! program._isRecording) {
			buttons.push({
				label: 'ダウンロード',
				color: '@blue',
				onSelect: function(e, model) {

					if (this.form.validate() === false) { return; }

					var d = this.form.result();

					saveSettings(d);

					d.prefix = window.location.protocol + '//' + window.location.host + '/api/recording/' + program.id + '/';
					d.mode = 'download';
					location.href = './api/recorded/' + program.id + '/watch.' + d.ext + '?' + Object.toQueryString(d);
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

		if (Prototype.Browser.MobileSafari) {
			modal.buttons[1].disable();
		}

		var exts = [];

		exts.push({
			label     : 'M2TS',
			value     : 'm2ts',
			isSelected: set.ext === 'm2ts'
		});

		exts.push({
			label     : 'MP4',
			value     : 'mp4',
			isSelected: set.ext === 'mp4'
		});

		if (/Trident/.test(navigator.userAgent) === false) {
			exts.push({
				label     : 'WebM',
				value     : 'webm',
				isSelected: set.ext === 'webm'
			});
		}

		this.form = new Hyperform({
			formWidth  : '100%',
			labelWidth : '100px',
			labelAlign : 'right',
			fields     : [
				{
					key  : 'ext',
					label: 'コンテナ',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : exts
					}
				},
				{
					key  : 'c:v',
					label: '映像コーデック',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : '無変換',
								value     : 'copy',
								isSelected: set['c:v'] === 'copy'
							},
							{
								label     : 'H.264',
								value     : 'libx264',
								isSelected: set['c:v'] === 'libx264'
							},
							{
								label     : 'MPEG-2',
								value     : 'mpeg2video',
								isSelected: set['c:v'] === 'mpeg2video'
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'm2ts' }
					]
				},
				{
					key  : 'c:v',
					label: '映像コーデック',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'VP8',
								value     : 'libvpx',
								isSelected: true
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'webm' }
					]
				},
				{
					key  : 'c:v',
					label: '映像コーデック',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'H.264',
								value     : 'libx264',
								isSelected: true
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'mp4' }
					]
				},
				{
					key  : 'c:v',
					label: '映像コーデック',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'H.264',
								value     : 'libx264',
								isSelected: true
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'flv' }
					]
				},
				{
					key  : 'c:a',
					label: '音声コーデック',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : '無変換',
								value     : 'copy',
								isSelected: set['c:a'] === 'copy'
							},
							{
								label     : 'AAC',
								value     : 'aac',
								isSelected: set['c:a'] === 'aac'
							},
							{
								label     : 'Vorbis',
								value     : 'libvorbis',
								isSelected: set['c:a'] === 'libvorbis'
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'm2ts' }
					]
				},
				{
					key  : 'c:a',
					label: '音声コーデック',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'Vorbis',
								value     : 'libvorbis',
								isSelected: true
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'webm' }
					]
				},
				{
					key  : 's',
					label: 'サイズ',
					input: {
						type      : 'slider',
						isRequired: true,
						items     : [
							{
								label     : '960x540 (qHD/16:9)',
								value     : '960x540',
								isSelected: set['s'] === '960x540'
							},
							{
								label     : '1024x576 (WSVGA/16:9)',
								value     : '1024x576',
								isSelected: set['s'] === '1024x576'
							},
							{
								label     : '1280x720 (HD/16:9)',
								value     : '1280x720',
								isSelected: set['s'] === '1280x720'
							},
							{
								label     : '1920x1080 (FHD/16:9)',
								value     : '1920x1080',
								isSelected: set['s'] === '1920x1080'
							}
						]
					},
					depends: [
						{ key: 'c:v', value: 'copy', operator: '!==' }
					]
				},
				{
					key  : 'b:v',
					label: '映像ビットレート',
					input: {
						type      : 'slider',
						isRequired: true,
						items     : [
							{
								label     : '256kbps',
								value     : '256k',
								isSelected: set['b:v'] === '256k'
							},
							{
								label     : '512kbps',
								value     : '512k',
								isSelected: set['b:v'] === '512k'
							},
							{
								label     : '1Mbps',
								value     : '1M',
								isSelected: set['b:v'] === '1M'
							},
							{
								label     : '2Mbps',
								value     : '2M',
								isSelected: set['b:v'] === '2M'
							},
							{
								label     : '3Mbps',
								value     : '3M',
								isSelected: set['b:v'] === '3M'
							}
						]
					},
					depends: [
						{ key: 'c:v', value: 'copy', operator: '!==' }
					]
				},
				{
					key  : 'b:a',
					label: '音声ビットレート',
					input: {
						type      : 'slider',
						isRequired: true,
						items     : [
							{
								label     : '32kbps',
								value     : '32k',
								isSelected: set['b:a'] === '32k'
							},
							{
								label     : '64kbps',
								value     : '64k',
								isSelected: set['b:a'] === '64k'
							},
							{
								label     : '96kbps',
								value     : '96k',
								isSelected: set['b:a'] === '96k'
							},
							{
								label     : '128kbps',
								value     : '128k',
								isSelected: set['b:a'] === '128k'
							},
							{
								label     : '192kbps',
								value     : '192k',
								isSelected: set['b:a'] === '192k'
							}
						]
					},
					depends: [
						{ key: 'c:a', value: 'copy', operator: '!==' }
					]
				}
			]
		});

		this.form.render(modal.content);

		return this;
	}
	,
	play: function() {

		this.isPlaying = true;

		var p = this.program;
		var d = this.d;

		d.ss = d.ss || 0;

		if (p._isRecording) d.ss = '';

		var getRequestURI = function() {

			var r = window.location.protocol + '//' + window.location.host + window.location.pathname.replace(/\/[^\/]*$/, '');
			r += '/api/' + (!!p._isRecording ? 'recording' : 'recorded') + '/' + p.id + '/watch.' + d.ext;
			var q = Object.toQueryString(d);

			return r + '?' + q;
		};

		var togglePlay = function() {

			if (p._isRecording) return;

			if (video.paused) {
				video.play();
				control.getElementByKey('play').setLabel('Pause');
			} else {
				video.pause();
				control.getElementByKey('play').setLabel('Play');
			}
		};

		// create video view

		var videoContainer = new flagrate.Element('div', {
			'class': 'video-container'
		}).insertTo(this.view.content);

		var video = new flagrate.Element('video', {
			autoplay: true,
			controls: true
		}).insertTo(videoContainer);

		new flagrate.Element('source', {
			src     : getRequestURI(),
			type    : 'video/' + d.ext
		}).insertTo(video);

		video.addEventListener('click', togglePlay);

		video.volume = 1;

		video.play();

		// create control view

		var control = new flagrate.Toolbar({
			className: 'video-control',
			items: [
				{
					key    : 'play',
					element: new flagrate.Button({ label: 'Pause', onSelect: togglePlay})
				},
				'--',
				{
					key    : 'fast-rewind',
					element: new flagrate.Button({ label: '<<'})
				},
				{
					key    : 'fast-forward',
					element: new flagrate.Button({ label: '>>'})
				},
				'--',
				{
					key    : 'played',
					element: new flagrate.Element('span').insertText('00:00')
				},
				{
					key    : 'seek',
					element: new flagrate.Slider({ value: 0, max: p.seconds, className: 'seek' })
				},
				{
					key    : 'duration',
					element: new flagrate.Element('span').insertText(
						Math.floor(p.seconds / 60).toPaddedString(2) + ':' + (p.seconds % 60).toPaddedString(2)
					)
				},
				'--',
				{
					key    : 'vol',
					element: new flagrate.Slider({ value: 10, max: 10 })
				}
			]
		}).insertTo(this.view.content);

		var seek = control.getElementByKey('seek');

		var seekSlideEvent = function() {
			var value = seek.getValue();

			d.ss = value;
			var uri = getRequestURI();

			seek.disable();
			fastForward.disable();
			fastRewind.disable();

			video.src = uri;
			video.play();

			setTimeout(function() {
				seek.enable();
				fastForward.enable();
				fastRewind.enable();
			}, 1000);
		};

		var seekValue = function(value) {
			var sec = seek.getValue() + value;
			if(sec < 0) sec = 0;
			else if(sec > p.seconds) sec = p.seconds;
			seek.setValue(sec);
			seekSlideEvent();
		};

		var fastForward = control.getElementByKey('fast-forward');
		fastForward.addEventListener('click', function() {
			seekValue(15);
		});

		var fastRewind = control.getElementByKey('fast-rewind')
		fastRewind.addEventListener('click', function() {
			seekValue(-15);
		});


		if (p._isRecording) {
			seek.disable();
			control.getElementByKey('play').updateText('Live');
			control.getElementByKey('play').disable();
		}

		control.getElementByKey('vol').addEventListener('slide', function() {

			var vol = control.getElementByKey('vol');

			video.volume = vol.getValue() / 10;
		});

		seek.addEventListener('slide', seekSlideEvent);

		var updateTime = function() {

			if (seek.isEnabled() === false) return;

			var current = 0;

			current = video.currentTime;

			current += d.ss;

			current = Math.floor(current);

			control.getElementByKey('played').updateText(
				Math.floor(current / 60).toPaddedString(2) + ':' + (current % 60).toPaddedString(2)
			);
			seek.setValue(current);
		};

		var updateLiveTime = function() {

			var current = (new Date().getTime() - p.start) / 1000;

			current = Math.floor(current);

			if (current > p.seconds) {
				this.app.pm.realizeHash(true);
			}

			control.getElementByKey('played').updateText(
				Math.floor(current / 60).toPaddedString(2) + ':' + (current % 60).toPaddedString(2)
			);
			seek.setValue(current);
		}.bind(this);

		if (p._isRecording) {
			this.timer.updateLiveTime = setInterval(updateLiveTime, 250);
		} else {
			this.timer.updateTime = setInterval(updateTime, 250);
		}

		return this;
	}
});
