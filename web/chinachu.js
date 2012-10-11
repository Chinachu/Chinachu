/*!
 *  Chinachu WebUI Client Application (chinachu-wui-client)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://akkar.in/projects/chinachu/
**/

var app = {
	router: null,
	socket: null,
	notify: null,
	query : {},
	chinachu: {
		status   : {},
		rules    : [],
		reserves : [],
		schedule : [],
		recording: [],
		recorded : []
	},
	ui: {},
	f : {}
};

YUI().use('get', 'node-load', 'router', function _initYUI(Y) {
	window.Y = Y;
	
	app.router = new Y.Router({
		html5: false,
		routes: [
			{
				path: /.*/,
				callback: function _cbRouterRoot(a) {
					var path = a.path;
					
					app.query = a.query;
					
					if (path === '/') { path = '/dashboard'; }
					
					document.fire('chinachu:reload');
					
					Y.Node.one('section#content').load('./page' + path + '.html', function() {
						Y.Get.js('./page' + path + '.js', function(err) {
							if (err) {
								app.router.save('/');
							}
						});
					});
					
					Y.Node.all('header > div > ul > li > a').removeClass('selected');
					Y.Node.all('header > div > ul > li > a[href="#' + path + '"]').addClass('selected');
				}
			}
		]
	});
	
	app.router.save(window.location.hash.replace('#', ''));
});

Event.observe(window, 'load', function _init() {
	app.socket = io.connect(window.location.protocol + '//' + window.location.host, {
		connectTimeout: 3000
	});
	
	app.socket.on('connect', socketOnConnect);
	app.socket.on('disconnect', socketOnDisconnect);
	
	app.socket.on('status', socketOnStatus);
	app.socket.on('rules', socketOnRules);
	app.socket.on('reserves', socketOnReserves);
	app.socket.on('schedule', socketOnSchedule);
	app.socket.on('recording', socketOnRecording);
	app.socket.on('recorded', socketOnRecorded);
	
	app.notify = new Hypernotifier(null, {
		hMargin: 30,
		timeout: 3
	});
});

function socketOnConnect() {
	$('loading').hide();
	document.fire('chinachu:connect');
	
	app.notify.create({ title: 'Chinachu', message: '接続されました' });
}

function socketOnDisconnect() {
	$('loading').show();
	document.fire('chinachu:disconnect');
	
	$('footer-status').update('<span class="color-red">切断</span>');
	app.notify.create({ title: 'Chinachu', message: '切断されました' });
}

function socketOnStatus(data) {
	app.chinachu.status = data;
	document.fire('chinachu:status');
	
	$('footer-status').update('<span class="color-green">接続済</span>(' + data.connectedCount + ')');
}

function socketOnRules(data) {
	app.chinachu.rules = data;
	document.fire('chinachu:rules');
	
	$('rules-count').update(data.length.toString(10));
}

function socketOnReserves(data) {
	var dt = new Date().getTime();
	data.each(function(program, i) {
		if (program.start - dt < 0) {
			delete data[i];
		}
	});
	data = data.compact();
	
	app.chinachu.reserves = data;
	document.fire('chinachu:reserves');
	
	$('reserves-count').update(data.length.toString(10));
}

function socketOnSchedule(data) {
	app.chinachu.schedule = data;
	document.fire('chinachu:schedule');
}

function socketOnRecording(data) {
	app.chinachu.recording = data;
	document.fire('chinachu:recording');
	
	$('recording-count').update(data.length.toString(10));
	
	if (data.length === 0) {
		$('favicon').href = './favicon.ico';
	} else {
		$('favicon').href = './favicon-active.ico';
	}
}

function socketOnRecorded(data) {
	data = data.reverse();
	
	app.chinachu.recorded = data;
	document.fire('chinachu:recorded');
	
	$('recorded-count').update(data.length.toString(10));
}

app.f.getProgramById = function _getProgramById(id) {
	for (var i = 0; i < app.chinachu.recording.length; i++) {
		if ((app.chinachu.recording[i].id === id) && (app.chinachu.recording[i].pid)) {
			app.chinachu.recording[i]._isRecording = true;
			return app.chinachu.recording[i];
		}
	}
	
	for (var i = 0; i < app.chinachu.recorded.length; i++) {
		if (app.chinachu.recorded[i].id === id) {
			app.chinachu.recorded[i]._isRecorded = true;
			return app.chinachu.recorded[i];
		}
	}
	
	for (var i = 0; i < app.chinachu.reserves.length; i++) {
		if (app.chinachu.reserves[i].id === id) {
			app.chinachu.reserves[i]._isReserves = true;
			return app.chinachu.reserves[i];
		}
	}
	
	for (var i = 0; i < app.chinachu.schedule.length; i++) {
		for (var j = 0; j < app.chinachu.schedule[i].programs.length; j++) {
			if (app.chinachu.schedule[i].programs[j].id === id) {
				return app.chinachu.schedule[i].programs[j];
			}
		}
	}
	
	return null;
};

app.ui.ContentLoading = Class.create({
	initialize: function _init(opt) {
		if (!opt) { var opt = {}; }
		
		this.progress   = 0;
		this.target     = $('content');
		this.onComplete = opt.onComplete || function _empty() {};
		
		this.create();
		
		return this;
	},
	create: function _draw() {
		this.entity = {
			container: new Element('div', {id: 'content-loading'}),
			frame    : new Element('div'),
			bar      : new Element('div')
		};
		
		this.entity.container.insert(this.entity.frame);
		this.entity.frame.insert(this.entity.bar);
		
		this.redraw();
		
		return this;
	},
	update: function _update(num) {
		if (num >= 100) {
			setTimeout(this.onComplete, 0);
			
			num = 100;
		}
		
		this.progress = num;
		
		this.redraw();
		
		return this;
	},
	redraw: function _redraw() {
		this.entity.bar.setStyle({width: this.progress.toString(10) + '%'});
		
		return this;
	},
	render: function _render() {
		this.target.insert({top: this.entity.container});
		
		return this;
	},
	remove: function _remove() {
		this.entity.bar.remove();
		this.entity.frame.remove();
		this.entity.container.remove();
		
		this.entity.bar       = null;
		this.entity.frame     = null;
		this.entity.container = null;
		
		delete this.entity;
		delete this.target;
		delete this.progress;
		delete this;
		
		return true;
	}
});

app.ui.StopRecord = Class.create({
	initialize: function _init(id) {
		this.program = app.f.getProgramById(id);
		
		this.create();
		
		return this;
	},
	create: function _create() {
		if (this.program === null) {
			this.modal = new Hypermodal({
				title  : 'エラー',
				content: '番組が見つかりませんでした'
			});
		} else {
			this.modal = new Hypermodal({
				title  : '録画中止',
				description: this.program.title + ' #' + this.program.id,
				content: '本当によろしいですか？',
				buttons: [
					{
						label  : '録画中止',
						color  : '@red',
						onClick: function(e, btn, modal) {
							btn.disable();
							
							new Ajax.Request('./api/recording/' + this.program.id + '.json', {
								method    : 'get',
								parameters: { method: 'DELETE' },
								onComplete: function() {
									modal.close();
								},
								onSuccess: function() {
									app.router.save(window.location.hash.replace('#', ''));
									
									new Hypermodal({
										title  : '成功',
										content: '録画中止に成功しました'
									}).render();
								},
								onFailure: function(t) {
									new Hypermodal({
										title  : '失敗',
										content: '録画中止に失敗しました (' + t.status + ')'
									}).render();
								}
							});
						}.bind(this)
					},
					{
						label  : 'キャンセル',
						onClick: function(e, btn, modal) {
							modal.close();
						}
					}
				]
			});
		}
		
		this.modal.render();
		
		return this;
	}
});

app.ui.RemoveRecordedProgram = Class.create({
	initialize: function _init(id) {
		this.program = app.f.getProgramById(id);
		
		this.create();
		
		return this;
	},
	create: function _create() {
		if (this.program === null) {
			this.modal = new Hypermodal({
				title  : 'エラー',
				content: '番組が見つかりませんでした'
			});
		} else {
			this.modal = new Hypermodal({
				title  : '録画履歴の削除',
				description: this.program.title + ' #' + this.program.id,
				content: '本当によろしいですか？<br>システムはこの録画ファイルを見失います。',

				buttons: [
					{
						label  : '削除',
						color  : '@red',
						onClick: function(e, btn, modal) {
							btn.disable();
							
							new Ajax.Request('./api/recorded/' + this.program.id + '.json', {
								method    : 'get',
								parameters: { method: 'DELETE' },
								onComplete: function() {
									modal.close();
								},
								onSuccess: function() {
									app.router.save(window.location.hash.replace('#', ''));
									
									new Hypermodal({
										title  : '成功',
										content: '録画履歴の削除に成功しました'
									}).render();
								},
								onFailure: function(t) {
									new Hypermodal({
										title  : '失敗',
										content: '録画履歴の削除に失敗しました (' + t.status + ')'
									}).render();
								}
							});
						}.bind(this)
					},
					{
						label  : 'キャンセル',
						onClick: function(e, btn, modal) {
							modal.close();
						}
					}
				]
			});
		}
		
		this.modal.render();
		
		return this;
	}
});

app.ui.RemoveRecordedFile = Class.create({
	initialize: function _init(id) {
		this.program = app.f.getProgramById(id);
		
		this.create();
		
		return this;
	},
	create: function _create() {
		if (this.program === null) {
			this.modal = new Hypermodal({
				title  : 'エラー',
				content: '番組が見つかりませんでした'
			});
		} else {
			this.modal = new Hypermodal({
				title  : '録画ファイルの削除',
				description: this.program.title + ' #' + this.program.id,
				content: '本当によろしいですか？<br>一度削除された録画ファイルは復元できません。',
				buttons: [
					{
						label  : '削除',
						color  : '@red',
						onClick: function(e, btn, modal) {
							btn.disable();
							
							new Ajax.Request('./api/recorded/' + this.program.id + '/file.json', {
								method    : 'get',
								parameters: { method: 'DELETE' },
								onComplete: function() {
									modal.close();
								},
								onSuccess: function() {
									app.router.save(window.location.hash.replace('#', ''));
									
									new Hypermodal({
										title  : '成功',
										content: '録画ファイルの削除に成功しました'
									}).render();
								},
								onFailure: function(t) {
									new Hypermodal({
										title  : '失敗',
										content: '録画ファイルの削除に失敗しました (' + t.status + ')'
									}).render();
								}
							});
						}.bind(this)
					},
					{
						label  : 'キャンセル',
						onClick: function(e, btn, modal) {
							modal.close();
						}
					}
				]
			});
		}
		
		this.modal.render();
		
		return this;
	}
});

app.ui.Cleanup = Class.create({
	initialize: function _init() {
		this.create();
		
		return this;
	},
	create: function _create() {
		this.modal = new Hypermodal({
			title  : 'クリーンアップ',
			content: '本当によろしいですか？<br>全ての録画履歴から録画ファイルを見失った項目を削除します。',
			buttons: [
				{
					label  : 'クリーンアップ',
					color  : '@red',
					onClick: function(e, btn, modal) {
						btn.disable();
						
						new Ajax.Request('./api/recorded.json', {
							method    : 'get',
							parameters: { method: 'PUT' },
							onComplete: function() {
								modal.close();
							},
							onSuccess: function() {
								app.router.save(window.location.hash.replace('#', ''));
								
								new Hypermodal({
									title  : '成功',
									content: 'クリーンアップに成功しました'
								}).render();
							},
							onFailure: function(t) {
								new Hypermodal({
									title  : '失敗',
									content: 'クリーンアップに失敗しました (' + t.status + ')'
								}).render();
							}
						});
					}.bind(this)
				},
				{
					label  : 'キャンセル',
					onClick: function(e, btn, modal) {
						modal.close();
					}
				}
			]
		});
		
		this.modal.render();
		
		return this;
	}
});

app.ui.ProgramViewer = Class.create({
	initialize: function _init(id) {
		this.program = app.f.getProgramById(id);
		this.target  = $('content');
		
		this.create();
		this.render();
		
		return this;
	},
	create: function _create() {
		this.entity = {
			container: new Element('div', {className: 'program-viewer-container'}),
			content  : new Element('div', {className: 'main'}),
			control  : new Element('div', {className: 'sub'}),
			closeBtn : new Element('a', {className: 'program-viewer-close-button'}).insert('&times;')
		};
		
		this.entity.closeBtn.observe('click', this.remove.bind(this));
		
		this.entity.container.insert(this.entity.closeBtn);
		this.entity.container.insert(this.entity.content);
		this.entity.container.insert(this.entity.control);
		
		this.redraw();
		
		this.entity.container.observe('contextmenu', function(e) {
			e.stop();
			this.remove();
		}.bind(this));
		
		return this;
	},
	redraw: function _redraw() {
		if (this.program === null) {
			this.entity.content.insert('<h1>番組が見つかりませんでした</h1>');
			this.entity.content.insert('<div class="meta">&times; をクリックするとこの画面を閉じます</div>');
			return this;
		}
		
		this.entity.content.insert('<h1>' + this.program.title + '</h1>');
		this.entity.content.insert(
			'<div class="meta">' +
			dateFormat(new Date(this.program.start), 'yyyy/mm/dd HH:MM') + ' &ndash; ' +
			dateFormat(new Date(this.program.end), 'HH:MM') +
			' (' + (this.program.seconds / 60) + '分間) #' + this.program.id +
			'<br><small>' + this.program.category + ' / [' + this.program.channel.type + '] ' + this.program.channel.name +
			'</small>' +
			'</div>'
		);
		this.entity.content.insert('<p class="detail">' + (this.program.detail || '説明なし') + '</p>');
		
		this.entity.control.insert('<a onclick="new app.ui.CreateRuleByProgram(\'' + this.program.id + '\')">ルールを作成</a>');
		
		if (this.program._isRecording) {
			this.entity.content.insert('<h2>この番組は現在録画中です</h2>');
			this.entity.content.insert(
				'<dl>' +
				'<dt>プロセスID</dt><dd>' + this.program.pid + '</dd>' +
				'<dt>コマンド</dt><dd>' + this.program.command + '</dd>' +
				'<dt>保存先パス</dt><dd>' + this.program.recorded + '</dd>' +
				'<dt>チューナー名 (番号)</dt><dd>' + this.program.tuner.name + ' (' + this.program.tuner.n + ')</dd>' +
				'<dt>スクランブル</dt><dd>' + (this.program.tuner.isScrambling ? 'はい' : 'いいえ') + '</dd>' +
				'</dl>'
			);
		}
		
		if (this.program._isRecording) {
			this.entity.control.insert('<a onclick="new app.ui.StopRecord(\'' + this.program.id + '\')">録画中止</a>');
		}
		
		if (!this.program._isReserves && !this.program._isRecorded && !this.program._isRecording) {
			this.entity.control.insert('<a onclick="new app.ui.Reserve(\'' + this.program.id + '\')">一時予約</a>');
		}
		
		if (this.program._isReserves && !this.program._isRecorded && this.program.isManualReserve) {
			this.entity.control.insert('<a onclick="new app.ui.Unreserve(\'' + this.program.id + '\')">一時予約の取消</a>');
		}
		
		if (this.program._isReserves) {
			this.entity.content.insert('<h2>この番組は予約済みです</h2>');
		}
		
		if (this.program._isRecorded) {
			this.entity.content.insert('<h2>この番組は録画済みです</h2>');
			this.entity.content.insert(
				'<dl>' +
				'<dt>コマンド</dt><dd>' + this.program.command + '</dd>' +
				'<dt>保存先パス</dt><dd>' + this.program.recorded + '</dd>' +
				'<dt>チューナー名 (番号)</dt><dd>' + this.program.tuner.name + ' (' + this.program.tuner.n + ')</dd>' +
				'<dt>スクランブル</dt><dd>' + (this.program.tuner.isScrambling ? 'はい' : 'いいえ') + '</dd>' +
				'</dl>'
			);
			this.entity.content.insert(
				'<p><small>この番組情報は録画履歴に保存されています。' +
				'削除するには、<a onclick="new app.ui.Cleanup()">クリーンアップ</a>か' +
				'個別に<a onclick="new app.ui.RemoveRecordedProgram(\'' + this.program.id + '\')">録画履歴の削除</a>' +
				'を実行してください。</small></p>'
			);
			
			this.entity.control.insert('<a onclick="new app.ui.RemoveRecordedProgram(\'' + this.program.id + '\')">録画履歴の削除</a>');
		}
		
		if (app.chinachu.status.feature.streamer && this.program._isRecording && !this.program.tuner.isScrambling) {
			this.entity.control.insert(
				'<a onclick="new app.ui.Streamer(\'' + this.program.id + '\')">ストリーミング再生</a>'
			);
		}
		
		if (this.program._isRecorded) {
			new Ajax.Request('./api/recorded/' + this.program.id + '.json', {
				method: 'get',
				onSuccess: function(t) {
					if (t.responseJSON.isRemoved) {
						this.entity.content.insert(
							'<p class="color-red">※この番組の録画ファイルは移動または削除されています。</p>'
						);
					} else {
						if (app.chinachu.status.feature.filer) {
							this.entity.control.insert(
								'<a onclick="new app.ui.RemoveRecordedFile(\'' + this.program.id + '\')">録画ファイルの削除</a>'
							);
						}
						
						if (app.chinachu.status.feature.streamer && !this.program.tuner.isScrambling) {
							this.entity.control.insert(
								'<a onclick="new app.ui.Streamer(\'' + this.program.id + '\')">ストリーミング再生</a>'
							);
						}
					}
				}.bind(this)
			});
		}
		
		return this;
	},
	render: function _render() {
		this.entity.container.style.opacity = '0';
		setTimeout(function() {
			this.entity.container.style.opacity = '1';
		}.bind(this), 0);
		
		this.target.insert({top: this.entity.container});
		
		document.observe('chinachu:reload', function() {
			document.stopObserving('chinachu:reload', arguments.callee);
			this.remove();
		}.bind(this));
		
		return this;
	},
	remove: function _remove() {
		try {
			this.entity.container.style.opacity = '0';
			
			setTimeout(function() {
				this.entity.content.remove();
				this.entity.container.remove();
				
				this.entity.content   = null;
				this.entity.container = null;
				
				delete this.program;
				delete this.entity;
				delete this.target;
			}.bind(this), 200);
		} catch (e) { /* has been removed */ }
		
		return true;
	}
});

app.ui.Streamer = Class.create({
	initialize: function _init(id) {
		this.program = app.f.getProgramById(id);
		
		this.create();
		
		return this;
	},
	create: function _create() {
		if (this.program === null) {
			this.modal = new Hypermodal({
				title  : 'エラー',
				content: '番組が見つかりませんでした'
			});
			
			return this;
		}
		
		this.formContainer = new Element('div');
		
		this.form = new Hyperform({
			formWidth  : '100%',
			labelWidth : '100px',
			labelAlign : 'right',
			fields     : [
				{
					key  : 'start',
					label: '開始位置',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : []
					}
				},
				{
					key  : 'format',
					label: 'コンテナ',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : []
					}
				},
				{
					key  : 'vcodec',
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
						{ key: 'format', value: 'm2ts' }
					]
				},
				{
					key  : 'vcodec',
					label: '映像コーデック',
					input: {
						type      : 'radio',
						isRequired: true,
						items     : [
							{
								label     : 'H.264',
								value     : 'libx264',
								isSelected: true
							}/*,
							{
								label     : 'Sorenson H.263 (FLV1)',
								value     : 'flv'
							}*/
						]
					},
					depends: [
						{ key: 'format', value: 'f4v' }
					]
				},
				{
					key  : 'acodec',
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
								value     : 'libfaac'
							},
							{
								label     : 'MP3',
								value     : 'libmp3lame'
							}
						]
					},
					depends: [
						{ key: 'format', value: 'm2ts' }
					]
				},
				{
					key  : 'acodec',
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
								value     : 'libfaac'
							},
							{
								label     : 'MP3',
								value     : 'libmp3lame'
							}
						]
					},
					depends: [
						{ key: 'format', value: 'f4v' }
					]
				},
				{
					key  : 'size',
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
							},
							{
								label     : '640x480 (VGA/4:3)',
								value     : '640x480'
							},
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
						{ key: 'vcodec', value: 'copy', operator: '!==' }
					]
				},
				{
					key  : 'bitrate',
					label: 'ビットレート',
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
						{ key: 'vcodec', value: 'copy', operator: '!==' }
					]
				},
				{
					key  : 'ab',
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
								value     : '96k'
							},
							{
								label     : '128kbps',
								value     : '128k',
								isSelected: true
							},
							{
								label     : '192kbps',
								value     : '192k'
							}
						]
					},
					depends: [
						{ key: 'acodec', value: 'copy', operator: '!==' }
					]
				}
			]
		});
		
		if (this.program._isRecording) {
			this.form.fields[0].input.items.push({
				label     : 'ライブ',
				value     : 'live',
				isSelected: true
			},
			{
				label     : '最初から',
				value     : '0'
			});
		} else {
			this.form.fields[0].input.items.push({
				label     : '最初から',
				value     : '0',
				isSelected: true
			});
		}
		
		if (Prototype.Browser.MobileSafari) {
			this.form.fields[1].input.items.push({
				label     : 'HLS (MPEG-2 TS)',
				value     : 'm3u8',
				isSelected: true
			});
		}
		
		if (!Prototype.Browser.MobileSafari) {
			this.form.fields[1].input.items.push({
				label     : 'MPEG-2 TS',
				value     : 'm2ts',
				isSelected: true
			});
			
			this.form.fields[1].input.items.push({
				label     : 'Flash Video',
				value     : 'f4v'
			});
			
			this.form.fields[1].input.items.push({
				label     : 'WebM (VP8,Vorbis)',
				value     : 'webm'
			});
		}
		
		this.form.render(this.formContainer);
		
		this.modal = new Hypermodal({
			title  : 'ストリーミング再生',
			description: this.program.title + ' #' + this.program.id,
			content: this.formContainer,
			buttons: [
				{
					label  : '再生',
					color  : '@pink',
					onClick: function(e, btn, modal) {
						if (this.form.validate() === false) { return; }
						
						var d = this.form.result();
						
						/*if ((d.format === 'm2ts') && (!window.navigator.plugins['VLC Web Plugin'])) {
							new Hypermodal({
								title  : 'エラー',
								content: 'MPEG-2 TSコンテナの再生にはVLC Web Pluginが必要です。'
							}).render();
							return;
						}*/
						
						if (d.format === 'm2ts') {
							new Hypermodal({
								title  : 'エラー',
								content: 'MPEG-2 TSコンテナの再生は未サポートです。XSPFが利用できます。'
							}).render();
							return;
						}
						
						modal.close();
						
						new app.ui.StreamerPlayer(this.program.id, d);
					}.bind(this)
				},
				{
					label  : 'XSPF',
					color  : '@orange',
					onClick: function(e, btn, modal) {
						if (this.form.validate() === false) { return; }
						
						var d = this.form.result();
						
						if (this.program._isRecording) {
							d.prefix = window.location.protocol + '//' + window.location.host + '/api/recording/' + this.program.id + '/';
							window.open('./api/recording/' + this.program.id + '/watch.xspf?' + Object.toQueryString(d));
						} else {
							d.prefix = window.location.protocol + '//' + window.location.host + '/api/recorded/' + this.program.id + '/';
							window.open('./api/recorded/' + this.program.id + '/watch.xspf?' + Object.toQueryString(d));
						}
					}.bind(this)
				},
				{
					label  : 'キャンセル',
					onClick: function(e, btn, modal) {
						modal.close();
					}
				}
			]
		}).render();
		
		if (Prototype.Browser.MobileSafari) {
			this.modal.buttons[1].disable();
		}
		
		return this;
	}
});

app.ui.StreamerPlayer = Class.create({
	initialize: function _init(id, d) {
		this.program = app.f.getProgramById(id);
		this.target  = $('content');
		this.d       = d;
		
		this.create();
		this.render();
		
		return this;
	},
	create: function _create() {
		this.entity = {
			container: new Element('div', {className: 'program-viewer-container black'}),
			content  : new Element('div', {className: 'main'}),
			info     : new Element('div', {className: 'sub'}),
			closeBtn : new Element('a', {className: 'program-viewer-close-button'}).insert('&times;')
		};
		
		this.entity.closeBtn.observe('click', this.remove.bind(this));
		
		this.entity.container.insert(this.entity.closeBtn);
		this.entity.container.insert(this.entity.content);
		this.entity.container.insert(this.entity.info);
		
		this.entity.content.setStyle({
			overflow: 'hidden'
		});
		
		this.redraw();
		
		return this;
	},
	redraw: function _redraw() {
		if (this.program === null) {
			this.entity.content.insert('<h1>番組が見つかりませんでした</h1>');
			this.entity.content.insert('<div class="meta">&times; をクリックするとこの画面を閉じます</div>');
			return this;
		}
		
		this.entity.info.insert('<h2>' + this.program.title + '</h2>');
		this.entity.info.insert(
			'<div class="meta">' +
			dateFormat(new Date(this.program.start), 'yyyy/mm/dd HH:MM') + ' &ndash; ' +
			dateFormat(new Date(this.program.end), 'HH:MM') +
			' (' + (this.program.seconds / 60) + '分間) #' + this.program.id +
			'<br><small>' + this.program.category + ' / [' + this.program.channel.type + '] ' + this.program.channel.name +
			'</small>' +
			'</div>'
		);
		this.entity.info.insert('<p class="detail">' + (this.program.detail || '説明なし') + '</p>');
		
		if (this.program._isRecording) {
			var video = window.location.protocol + '//' + window.location.host + '/api/recording/' + this.program.id + '/watch.' + this.d.format + '?' + Object.toQueryString(this.d);
			var thumb = window.location.protocol + '//' + window.location.host + '/api/recording/' + this.program.id + '/preview.jpg?width=1280&height=720';
		} else {
			var video = window.location.protocol + '//' + window.location.host + '/api/recorded/' + this.program.id + '/watch.' + this.d.format + '?' + Object.toQueryString(this.d);
			var thumb = window.location.protocol + '//' + window.location.host + '/api/recorded/' + this.program.id + '/preview.jpg?width=1280&height=720';
		}
		
		if ((this.d.format === 'm3u8') || this.d.format === 'webm') {
			this.entity.content.insert(
				'<video poster="' + thumb + '" src="' + video + '" width="100%" height="100%" controls autoplay></video>'
			);
		} else {
			this.entity.content.insert(
				'<object width="100%" height="100%" type="application/x-shockwave-flash" data="./lib/f4player/player.swf">' +
				'<param name="movie" value="./lib/f4player/player.swf" />' +
				'<param name="quality" value="high" />' +
				'<param name="scale" value="noscale" />' +
				'<param name="allowfullscreen" value="true" />' +
				'<param name="flashvars" value="skin=./lib/f4player/skins/mySkin.swf&autoplay=1&thumbnail=' + encodeURIComponent(thumb) + '&video=' + encodeURIComponent(video) + '" />' +
				'</object>'
			);
		}
		
		return this;
	},
	render: function _render() {
		this.target.update('<div id="content-body" class="bg-chinachu"></div>');
		this.target.insert({top: this.entity.container});
		
		document.observe('chinachu:reload', this.remove.bind(this));
		document.observe('chinachu:reload', function() {
			document.stopObserving('chinachu:reload', arguments.callee);
			document.stopObserving('chinachu:reload', this.remove);
		});
		
		return this;
	},
	remove: function _remove() {
		try {
			this.entity.content.remove();
			this.entity.container.remove();
			
			this.entity.content   = null;
			this.entity.container = null;
			
			delete this.program;
			delete this.entity;
			delete this.target;
			
			app.router.save(window.location.hash.replace('#', ''));
		} catch (e) { /* has been removed */ }
		
		return true;
	}
});