(function _chinachu() {
	
	"use strict";
	
	console.log('----', 'launched', '----');
	
	// notify
	app.notify = new flagrate.Notify({
		title  : 'Chinachu',
		hMargin: (10 + 25)
	});
	
	// apiクライアントの初期化
	app.api = new chinachu.api.Client({
		apiRoot: app.def.apiRoot
	});
	
	// エラートラップ
	window.onerror = function _errorTrap(mes, file, num) {
		console.error('[!] ERROR:', mes, file, num);
		
		if (!DEBUG) {
			app.notify.create({
				title  : 'ERROR: ' + file + ':' + num,
				message: mes,
				timeout: 0,
				onClick: function() {
					window.location.reload();
				}
			});
		}
	};
	
	app.socket = io.connect(window.location.protocol + '//' + window.location.host, {
		connectTimeout: 3000,
		resource: window.location.pathname.replace(/^\/|[^\/]*$/g, '') + 'socket.io',
	});
	
	// コントロールビュー初期化
	app.f.enterControlView = function _enterControlView() {
		console.log('entering to control view');
		
		// クリーンアップ
		$$('.no-ctrl', '.header', '.middle', '.footer').each(function(ele) {
			ele.remove();
		});
		
		// リセット
		document.stopObserving('sakurapanel:pm:reload');
		document.stopObserving('sakurapanel:pm:load');
		document.stopObserving('sakurapanel:pm:complete');
		
		app.pm.category = 'status';
		
		document.observe('sakurapanel:pm:reload', function() {
			app.pm.disableHashControl();
			
			app.pm.title.update('...');
			document.title = '...';
			
			document.fire('chinachu:reload');
		});
		
		document.observe('sakurapanel:pm:unload', function() {
			app.view.sideBody.removeAll();
		});
		
		document.observe('sakurapanel:pm:load', function() {
			if (app.pm.pageData.nohead) {
				app.view.main.entity.addClassName('nohead');
			} else {
				app.view.main.entity.removeClassName('nohead');
			}
			
			if (app.pm.pageData.background) {
				app.view.mainBody.entity.style.background = app.pm.pageData.background;
			} else {
				app.view.mainBody.entity.style.background = '';
			}
			
			app.pm.title.update(app.pm.title.innerHTML.__());
			document.title = 'Chinachu: ' + [app.pm.page.__(), app.pm.category.__()].join(' - ');
			
			app.view.header.all().each(function(a) { a.unselect(); });
			try { app.view.header.one(app.pm.category).select(); } catch (e) {}
			
			app.view.sideBody.removeAll();
			
			if (app.pm.index.category[app.pm.category].pageIndex) {
				app.view.middle.entity.removeClassName('noside');
				
				app.pm.index.category[app.pm.category].pageIndex.each(function(pageName)  {
					var page = app.pm.index.category[app.pm.category].page[pageName];
					
					app.view.sideBody.add({
						key: 'page-index-' + pageName,
						ui : new sakura.ui.Button({
							label  : page.label.__(),
							icon   : page.icon || null,
							onClick: function() {
								window.location.hash = '!/' + app.pm.category + '/' + pageName + '/';
							}
						})
					});//<--app.view.sideBody.add
					
					if (pageName === app.pm.page) {
						app.view.sideBody.one('page-index-' + pageName).select();
						
						if (app.pm.pageData.background) {
							app.view.sideBody.one('page-index-' + pageName).entity.style.boxShadow = 'inset -2px 0 0 ' + app.pm.pageData.background;
						}
					}
					
					new sakura.ui.Tooltip({
						target: app.view.sideBody.one('page-index-' + pageName).entity,
						html  : page.label.__()
					}).render();
				});//<--each category
			} else {
				app.view.middle.entity.addClassName('noside');
			}
		});//<--observe sakurapanel:pm:load
		
		document.observe('sakurapanel:pm:complete', function() {
			app.pm.enableHashControl();
		});
		
		// location.hashによるロケーション制御を有効にする
		app.pm.enableHashControl(true);
		
		// 構造体
		app.view.header   = new sakura.ui.Headbar().render(app.view.body);
		app.view.middle   = new sakura.ui.Container({ className: 'middle' }).render(app.view.body);
		app.view.side     = new sakura.ui.Container({ className: 'side' }).render(app.view.middle);
		app.view.sideHead = new sakura.ui.Headbar({ className: 'side-head' }).render(app.view.side);
		app.view.sideBody = new sakura.ui.Sidebar({ className: 'side-body' }).render(app.view.side);
		app.view.main     = new sakura.ui.Container({ className: 'main' }).render(app.view.middle);
		app.view.mainHead = new sakura.ui.Container({ className: 'main-head' }).render(app.view.main);
		app.view.title    = new sakura.ui.Container({ className: 'main-head-title' }).render(app.view.mainHead).insert(app.pm.title);
		app.view.toolbar  = new sakura.ui.Container({ className: 'main-head-toolbar' }).render(app.view.mainHead).insert(app.pm.toolbar);
		app.view.mainBody = new sakura.ui.Container({ className: 'main-body' }).render(app.view.main).insert(app.pm.content);
		app.view.footer   = new sakura.ui.Navbar({ className: 'footer' }).render(app.view.body);
		
		app.view.header.add({
			key: 'reload',
			ui : new sakura.ui.Button({
				label    : '&nbsp;',
				className: 'button-reload',
				icon     : './icons/arrow-circle-315.png',
				onClick  : function() {
					app.pm.realizeHash(true);
				}
			})
		});
		
		app.pm.index.categoryIndex.each(function(categoryName, i) {
			var button = new sakura.ui.Button({
				className: 'button-dent category-' + categoryName,
				icon     : app.pm.index.category[categoryName].icon || null,
				label    : categoryName.__(),
				onClick  : function() {
					window.location.hash = '!/' + categoryName + '/' + app.pm.index.category[categoryName].defaultPage + '/';
				}
			});
			
			app.view.header.add({
				key: categoryName,
				ui : button
			});
			
			if (['rules', 'reserves', 'recording', 'recorded'].indexOf(categoryName) !== -1) {
				app.view.header.one(categoryName).badge = new sakura.ui.Element({
					tagName: 'span'
				}).render(app.view.header.one(categoryName).entity);
			}
		});
		
		//
		app.view.middle.entity.addClassName('extend');
		
		if (!Prototype.Browser.IE) {
			app.pm.content.stopObserving('scroll');
			app.pm.content.observe('scroll', app.f.contentOnScroll);
		}
		clearInterval(app.timer.intervalOverline);
		app.timer.intervalOverline = setInterval(app.f.contentOnScroll, 1000);
		
		app.view.footer.add({
			key: 'chinachu',
			ui : new sakura.ui.Button({
				label  : 'Chinachu',
				style  : { 'float': 'right' },
				icon   : './icons/information-italic.png',
				onClick: function() {
					new flagrate.Modal({
						title   : 'Chinachu',
						subtitle: 'Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors.',
						html    : '<a href="https://chinachu.moe/" target="new">Chinachu Project Website</a>, ' +
						          '<a href="https://github.com/kanreisa/Chinachu" target="new">GitHub</a>, ' +
						          '<a href="https://github.com/kanreisa/Chinachu/issues" target="new">Issues</a>'
					}).show();
				}
			})
		});
		
		app.view.footer.add({
			key: 'operator-status',
			ui : new sakura.ui.Button({
				style: { 'float': 'right', 'cursor': 'default' },
				label: 'Operator',
				icon : './icons/status-offline.png',
			})
		});
		
		app.view.footer.add({
			key: 'wui-status',
			ui : new sakura.ui.Button({
				style: { 'float': 'right', 'cursor': 'default' },
				label: 'WUI',
				icon : './icons/status-offline.png',
			})
		});
	};
	
	// オーバーラインハンドラ
	app.f.contentOnScroll = function _contentOnScroll() {
		if (app.pm.content.scrollTop > 0) {
			app.view.mainHead.entity.addClassName('overline');
		} else {
			app.view.mainHead.entity.removeClassName('overline');
		}
		
		if (app.pm.content.scrollHeight - app.pm.content.offsetHeight > app.pm.content.scrollTop) {
			app.view.mainBody.entity.addClassName('overline');
		} else {
			app.view.mainBody.entity.removeClassName('overline');
		}
	};
	
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
	
	var socketOnConnect = function _socketOnConnect() {
		app.view.loadingMask.hide();
		
		document.fire('chinachu:connect');
		
		app.view.footer.one('wui-status').entity.style.backgroundImage = 'url(./icons/status.png)';
		
		//app.notify.create({ title: 'Chinachu', message: 'CONNECTED'.__() });
	};
	
	var socketOnDisconnect = function _socketOnDisconnect() {
		app.view.loadingMask.show();
		
		document.fire('chinachu:disconnect');
		
		app.view.footer.one('wui-status').entity.style.backgroundImage = 'url(./icons/status-offline.png)';
		
		app.notify.create({ title: 'Chinachu', message: 'DISCONNECTED'.__() });
	};
	
	var socketOnStatus = function _socketOnStatus(data) {
		app.chinachu.status = data;
		document.fire('chinachu:status', app.chinachu.status);
		
		if (app.view.footer.one('operator-status')._status !== data.operator.alive) {
			if (data.operator.alive) {
				app.view.footer.one('operator-status').entity.style.backgroundImage = 'url(./icons/status.png)';
			} else {
				app.view.footer.one('operator-status').entity.style.backgroundImage = 'url(./icons/status-offline.png)';
			}
		}
		app.view.footer.one('operator-status')._status = data.operator.alive;
		
		if (app.view.footer.one('count') === null) {
			app.view.footer.add({
				key: 'count',
				ui : new sakura.ui.Button({
					style: { 'float': 'right', 'cursor': 'default' },
					label: data.connectedCount,
					icon : './icons/user-medium-silhouette.png'
				})
			});
		}
		app.view.footer.one('count').entity.update(data.connectedCount);
	};
	
	var socketOnRules = function _socketOnRules(data) {
		app.chinachu.rules = data;
		document.fire('chinachu:rules', app.chinachu.rules);
	};
	
	var socketOnNotifyRules = function () {
		new Ajax.Request('./api/rules.json', {
			method: 'get',
			onSuccess: function (t) {
				app.chinachu.rules = t.responseJSON;
				document.fire('chinachu:rules', app.chinachu.rules);
			}
		});
	};
	
	document.observe('chinachu:rules', function (e) {
		app.view.header.one('rules').badge.update(e.memo.length.toString(10));
	});
	
	var socketOnReserves = function _socketOnReserves(data) {
		var dt = new Date().getTime();
		data.each(function(program, i) {
			if (program.start - dt < 1000 * 60) {
				delete data[i];
			}
		});
		data = data.compact();
		
		app.chinachu.reserves = data;
		document.fire('chinachu:reserves', app.chinachu.reserves);
	};
	
	var socketOnNotifyReserves = function () {
		new Ajax.Request('./api/reserves.json', {
			method: 'get',
			onSuccess: function (t) {
				var data = t.responseJSON;
				
				var dt = new Date().getTime();
				data.each(function(program, i) {
					if (program.start - dt < 1000 * 60) {
						delete data[i];
					}
				});
				data = data.compact();
				
				app.chinachu.reserves = data;
				document.fire('chinachu:reserves', app.chinachu.reserves);
			}
		});
	};
	
	document.observe('chinachu:reserves', function (e) {
		app.view.header.one('reserves').badge.update(e.memo.length.toString(10));
	});
	
	var socketOnSchedule = function _socketOnSchedule(data) {
		app.chinachu.schedule = data;
		document.fire('chinachu:schedule', app.chinachu.schedule);
	};
	
	var socketOnNotifySchedule = function () {
		new Ajax.Request('./api/schedule.json', {
			method: 'get',
			onSuccess: function (t) {
				app.chinachu.schedule = t.responseJSON;
				document.fire('chinachu:schedule', app.chinachu.schedule);
			}
		});
	};
	
	var socketOnRecording = function _socketOnRecording(data) {
		app.chinachu.recording = data;
		document.fire('chinachu:recording', app.chinachu.recording);
	};
	
	var socketOnNotifyRecording = function () {
		new Ajax.Request('./api/recording.json', {
			method: 'get',
			onSuccess: function (t) {
				app.chinachu.recording = t.responseJSON;
				document.fire('chinachu:recording', app.chinachu.recording);
			}
		});
	};
	
	document.observe('chinachu:recording', function (e) {
		app.view.header.one('recording').badge.update(e.memo.length.toString(10));
		
		if (e.memo.length === 0) {
			$('favicon').href = './favicon.ico';
		} else {
			$('favicon').href = './favicon-active.ico';
		}
		
		if (app.stat.lastRecordingCount) {
			if (app.stat.lastRecordingCount < e.memo.length) {
				app.notify.create({
					text   : '録画開始: ' + e.memo.last().title,
					timeout: 10,
					onClick: function() {
						window.location.hash = '!/program/view/id=' + e.memo.last().id + '/';
					}
				});
			}
		}
		app.stat.lastRecordingCount = e.memo.length;
		
		setTimeout(socketOnNotifyReserves, 0);
	});
	
	var socketOnRecorded = function _socketOnRecorded(data) {
		data = data.reverse();
		
		app.chinachu.recorded = data;
		document.fire('chinachu:recorded', app.chinachu.recorded);
	};
	
	var socketOnNotifyRecorded = function () {
		new Ajax.Request('./api/recorded.json', {
			method: 'get',
			onSuccess: function (t) {
				app.chinachu.recorded = t.responseJSON.reverse();
				document.fire('chinachu:recorded', app.chinachu.recorded);
			}
		});
	};
	
	document.observe('chinachu:recorded', function (e) {
		app.view.header.one('recorded').badge.update(e.memo.length.toString(10));
		
		if (app.stat.lastRecordedCount) {
			if (app.stat.lastRecordedCount < e.memo.length) {
				app.notify.create({
					text   : '録画終了: ' + e.memo.first().title,
					timeout: 10,
					onClick: function() {
						window.location.hash = '!/program/view/id=' + e.memo.first().id + '/';
					}
				});
			}
		}
		app.stat.lastRecordedCount = e.memo.length;
	});
	
	app.socket.on('connect'   , socketOnConnect);
	app.socket.on('disconnect', socketOnDisconnect);
	
	app.socket.on('status'    , socketOnStatus);
	
	app.socket.on('notify-rules'    , socketOnNotifyRules);
	app.socket.on('notify-reserves' , socketOnNotifyReserves);
	app.socket.on('notify-recording', socketOnNotifyRecording);
	app.socket.on('notify-recorded' , socketOnNotifyRecorded);
	app.socket.on('notify-schedule' , socketOnNotifySchedule);
	
	// ジャンル通知
	var remindedProgramIds = [];
	var notifiedProgramIds = [];
	setInterval(function () {
		
		if (!localStorage.getItem('schedule.notify.categories')) {
			return;
		}
		
		var categories = JSON.stringify(localStorage.getItem('schedule.notify.categories') || '[]');
		
		if (categories.length === 0 || !app.chinachu.schedule || app.chinachu.schedule.length === 0) {
			return;
		}
		
		var programs = app.chinachu.schedule.pluck('programs').flatten();
		
		var i, l = programs.length, t = Date.now();
		for (i = 0; l > i; i++) {
			if (categories.indexOf(programs[i].category) === -1 || t > programs[i].end) {
				continue;
			}
			
			var text = programs[i].title + ' (' + programs[i].channel.name + ') - ';
			
			if (programs[i].start - t < 80000 && programs[i].start - t > 50000 && remindedProgramIds.indexOf(programs[i].id) === -1) {
				remindedProgramIds.push(programs[i].id);

				text = 'まもなく: ' + text;
			} else if (programs[i].start - t < 3000 && programs[i].start - t > -10000 && notifiedProgramIds.indexOf(programs[i].id) === -1) {
				notifiedProgramIds.push(programs[i].id);

				text = '放送開始: ' + text;
			} else {
				continue;
			}
			
			text += chinachu.dateToString(new Date(programs[i].start));
			
			app.notify.create({
				text   : text,
				timeout: 10,
				onClick: function() {
					location.hash = '!/program/view/id=' + programs[i].id + '/';
				}
			});
		}
	}, 10000);
	
	// go
	app.f.enterControlView();
	
})();