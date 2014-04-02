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
		
		var modal = this.modal = new flagrate.Modal({
			disableCloseByMask: true,
			disableCloseButton: true,
			target: this.view.content,
			title : 'ストリーミング再生',
			buttons: [
				{
					label  : '再生',
					color  : '@pink',
					onSelect: function(e, modal) {
						if (this.form.validate() === false) { return; }
						
						var d = this.d = this.form.result();
						
						/*if ((d.format === 'm2ts') && (!window.navigator.plugins['VLC Web Plugin'])) {
							new flagrate.Modal({
								title: 'エラー',
								text : 'MPEG-2 TSコンテナの再生にはVLC Web Pluginが必要です。'
							}).show();
							return;
						}*/
						
						if (d.format === 'm2ts') {
							new flagrate.Modal({
								title: 'エラー',
								text : 'MPEG-2 TSコンテナの再生は未サポートです。XSPFが利用できます。'
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
						
						if (program._isRecording) {
							d.prefix = window.location.protocol + '//' + window.location.host + '/api/recording/' + program.id + '/';
							window.open('./api/recording/' + program.id + '/watch.xspf?' + Object.toQueryString(d));
						} else {
							d.prefix = window.location.protocol + '//' + window.location.host + '/api/recorded/' + program.id + '/';
							window.open('./api/recorded/' + program.id + '/watch.xspf?' + Object.toQueryString(d));
						}
					}.bind(this)
				}
			]
		}).show();
		
		if (Prototype.Browser.MobileSafari) {
			modal.buttons[1].disable();
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
						items     : []
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
								isSelected: true
							},
							{
								label     : 'H.264',
								value     : 'libx264'
							},
							{
								label     : 'MPEG-2',
								value     : 'mpeg2video'
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
								isSelected: true
							},
							{
								label     : 'AAC',
								value     : 'libfdk_aac'
							},
							{
								label     : 'Vorbis',
								value     : 'libvorbis'
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
					key  : 'c:a',
					label: '音声コーデック',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'AAC',
								value     : 'libfdk_aac',
								isSelected: true
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'mp4' }
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
								label     : 'AAC',
								value     : 'libfdk_aac',
								isSelected: true
							}
						]
					},
					depends: [
						{ key: 'ext', value: 'flv' }
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
								label     : '320x180 (16:9)',
								value     : '320x180'
							},
							{
								label     : '640x360 (HVGAW/16:9)',
								value     : '640x360'
							},/*
							{
								label     : '640x480 (VGA/4:3)',
								value     : '640x480'
							},*/
							{
								label     : '960x540 (qHD/16:9)',
								value     : '960x540'
							},
							{
								label     : '1024x576 (WSVGA/16:9)',
								value     : '1024x576'
							},
							{
								label     : '1280x720 (HD/16:9)',
								value     : '1280x720',
								isSelected: true
							},
							{
								label     : '1920x1080 (FHD/16:9)',
								value     : '1920x1080'
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
								value     : '256k'
							},
							{
								label     : '512kbps',
								value     : '512k'
							},
							{
								label     : '1Mbps',
								value     : '1M',
								isSelected: true
							},
							{
								label     : '2Mbps',
								value     : '2M'
							},
							{
								label     : '3Mbps',
								value     : '3M'
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
								value     : '32k'
							},
							{
								label     : '64kbps',
								value     : '64k'
							},
							{
								label     : '96kbps',
								value     : '96k',
								isSelected: true
							},
							{
								label     : '128kbps',
								value     : '128k'
							},
							{
								label     : '192kbps',
								value     : '192k'
							}
						]
					},
					depends: [
						{ key: 'c:a', value: 'copy', operator: '!==' }
					]
				}
			]
		});
		
		if (Prototype.Browser.MobileSafari) {
			this.form.fields[0].input.items.push({
				label     : 'HLS (MPEG-2 TS)',
				value     : 'm3u8',
				isSelected: true
			});
		}
		
		if (!Prototype.Browser.MobileSafari) {
			this.form.fields[0].input.items.push({
				label     : 'M2TS',
				value     : 'm2ts'
			});
			
			this.form.fields[0].input.items.push({
				label     : 'WebM',
				value     : 'webm',
				isSelected: true
			});
			
			/* this.form.fields[0].input.items.push({
				label     : 'FLV',
				value     : 'flv'
			}); */
		}
		
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
			
			var r = window.location.protocol + '//' + window.location.host;
			r += '/api/' + (!!p._isRecording ? 'recording' : 'recorded') + '/' + p.id + '/watch.' + d.ext;
			var q = Object.toQueryString(d);
			
			return r + '?' + q;
		};
		
		var togglePlay = function() {
			
			if (p._isRecording) return;
			
			if (d.ext === 'webm' || d.ext === 'm3u8') {
				if (video.paused) {
					video.play();
					control.getElementByKey('play').setLabel('Pause');
				} else {
					video.pause();
					control.getElementByKey('play').setLabel('Play');
				}
			} else {
				if (vlc.playlist.isPlaying) {
					vlc.playlist.pause();
					control.getElementByKey('play').setLabel('Pause');
				} else {
					vlc.playlist.play();
					control.getElementByKey('play').setLabel('Play');
				}
			}
		};
		
		// create video view
		
		var videoContainer = new flagrate.Element('div', {
			'class': 'video-container'
		}).insertTo(this.view.content);
		
		if (d.ext === 'webm' || d.ext === 'm3u8') {
			var video = new flagrate.Element('video', {
				src     : getRequestURI(),
				autoplay: true
			}).insertTo(videoContainer);
			
			video.addEventListener('click', togglePlay);
			
			//video.load();
			video.volume = 1;
		} else {
			var vlc = flagrate.createElement('embed', {
				type: 'application/x-vlc-plugin',
				pluginspage: 'http://www.videolan.org',
				width: '100%',
				height: '100%',
				target: getRequestURI(),
				autoplay: 'true',
				controls: 'false'
			}).insertTo(videoContainer);
			
			flagrate.createElement('object', {
				classid: 'clsid:9BE31822-FDAD-461B-AD51-BE1D1C159921',
				codebase: 'http://download.videolan.org/pub/videolan/vlc/last/win32/axvlc.cab'
			}).insertTo(videoContainer);
			
			vlc.audio.volume = 100;
			vlc.currentTime = 0;
		}
		
		// create control view
		
		var control = new flagrate.Toolbar({
			className: 'video-control',
			items: [
				{
					key    : 'play',
					element: new flagrate.Button({ label: 'Play / Pause', onSelect: togglePlay})
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
			
			if (d.ext === 'webm') {
				video.src = uri;
			} else {
				vlc.playlist.playItem(vlc.playlist.add(uri));
			}
			
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
			
			if (d.ext === 'webm' || d.ext === 'm3u8') {
				video.volume = vol.getValue() / 10;
			} else {
				vlc.audio.volume = vol.getValue() * 10;
			}
		});
		
		seek.addEventListener('slide', seekSlideEvent);
		
		var updateTime = function() {
			
			if (seek.isEnabled() === false) return;
			
			var current = 0;
			
			if (d.ext === 'webm' || d.ext === 'm3u8') {
				current = video.currentTime;
			} else {
				if (vlc.playlist.isPlaying) {
					vlc.currentTime += 250;
				}
				current = vlc.currentTime / 1000;
			}
			
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