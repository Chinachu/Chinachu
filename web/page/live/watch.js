P = Class.create(P, {
	
	init: function() {
		
		this.view.content.className = 'loading';
		this.channel = this.self.query.id;
		
		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:recording', this.onNotify);
		document.observe('chinachu:recorded', this.onNotify);
		
		if (this.channel === null) {
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
		
		//var program = this.program;
		
		this.view.content.className = 'bg-black';
		this.view.content.update();
		
		var titleHtml = this.channel;
		// if (typeof program.episode !== 'undefined' && program.episode !== null) {
		// 	titleHtml += '<span class="episode">#' + program.episode + '</span>';
		// }
		// titleHtml += '<span class="id">#' + program.id + '</span>';
		
		// if (program.isManualReserved) {
		// 	titleHtml = '<span class="flag manual">手動</span>' + titleHtml;
		// }
		
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
						
						// if (d.format === 'm2ts') {
						// 	new flagrate.Modal({
						// 		title: 'エラー',
						// 		text : 'MPEG-2 TSコンテナの再生は未サポートです。XSPFが利用できます。'
						// 	}).show();
						// 	return;
						// }
						
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
	},
	play: function() {
		this.isPlaying = true;
		var d = this.d;
		var c = this.channel;
		var query = this.self.query;
		
		d.ss = d.ss || 0;
		
		// if (p._isRecording) d.ss = '';
		
		var getRequestURI = function() {
			
			var r = './api/live/' + c + '/watch.' + d.ext;
			var q = Object.toQueryString(d) + '&' + Object.toQueryString(query);
			
			return r + '?' + q;
		};
		
		var togglePlay = function() {
			if (d.ext === 'webm' || d.ext === 'm3u8') {
				if (video.paused) {
					video.play();
				} else {
					video.pause();
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
					key    : 'played',
					element: new flagrate.Element('span').insertText('00:00')
				},
				{
					key    : 'duration',
					element: new flagrate.Element('span').insertText(
						"-"
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
		
		control.getElementByKey('vol').addEventListener('slide', function() {
			
			var vol = control.getElementByKey('vol');
			
			if (d.ext === 'webm' || d.ext === 'm3u8') {
				video.volume = vol.getValue() / 10;
			}
		});
		
		var updateTime = function() {
			
			if (seek.isEnabled() === false) return;
			
			var current = 0;
			
			if (d.ext === 'webm' || d.ext === 'm3u8') {
				current = video.currentTime;
			}
			
			current += d.ss;
			
			current = Math.floor(current);
			
			control.getElementByKey('played').updateText(
				Math.floor(current / 60).toPaddedString(2) + ':' + (current % 60).toPaddedString(2)
			);
			seek.setValue(current);
		};
		
		var updateLiveTime = function() {
			
			var current = (new Date().getTime() -0) / 1000;
			
			current = Math.floor(current);
			
			control.getElementByKey('played').updateText(
				Math.floor(current / 60).toPaddedString(2) + ':' + (current % 60).toPaddedString(2)
			);
			seek.setValue(current);
		}.bind(this);
		
		return this;
	}
});