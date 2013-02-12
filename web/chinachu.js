(function _chinachu() {
	
	"use strict";
	
	console.log('----', 'launched', '----');
	
	// notify
	app.notify = new Hypernotifier(null, {
		desktopNotify: false,
		hMargin      : (10 + 25)
	});
	
	// apiクライアントの初期化
	app.api = new chinachu.api.Client({
		apiRoot: app.def.apiRoot
	});
	
	// エラートラップ
	window.onerror = function _errorTrap(mes, file, num) {
		console.error('[!] ERROR:', mes, file, num);
		
		app.notify.create({
			title  : 'ERROR: ' + file + ':' + num,
			message: mes,
			timeout: 0,
			onClick: function() {
				window.location.reload();
			}
		});
	};
	
	app.socket = io.connect(window.location.protocol + '//' + window.location.host, {
		connectTimeout: 3000
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
			app.view.header.one(app.pm.category).select();
			
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
		app.view.sideHead.add({
			key: 'reload',
			ui : new sakura.ui.Button({
				label    : '&nbsp;',
				icon     : './icons/arrow-circle-315.png',
				onClick  : function() {
					app.pm.realizeHash(true);
				}
			})
		});
		
		/* //todo
		app.view.sideHead.add({
			key: 'shortcut-on',
			ui : new sakura.ui.Button({
				label    : '&nbsp;',
				icon     : './icons/keyboard-smiley.png',
				onClick  : function() {
					
				}
			}).hide()
		});
		
		app.view.sideHead.add({
			key: 'shortcut-off',
			ui : new sakura.ui.Button({
				label    : '&nbsp;',
				icon     : './icons/keyboard-space.png',
				onClick  : function() {
					
				}
			}).hide()
		});
		
		if (!!localStorage.getItem(app.api.apiRoot + '::pref/shortcut/on')) {
			app.view.sideHead.one('shortcut-on').show();
		} else {
			app.view.sideHead.one('shortcut-off').show();
		}
		*/
		
		app.view.sideHead.add({
			key: 'collapse',
			ui : new sakura.ui.Button({
				label    : '&nbsp;',
				icon     : './icons/application-sidebar-collapse.png',
				onClick  : function() {
					app.view.sideHead.one('collapse').hide();
					app.view.sideHead.one('expand').show();
					app.view.middle.entity.addClassName('extend');
				}
			})
		});
		
		app.view.sideHead.add({
			key: 'expand',
			ui : new sakura.ui.Button({
				label    : '&nbsp;',
				icon     : './icons/application-sidebar-expand.png',
				onClick  : function() {
					app.view.sideHead.one('collapse').show();
					app.view.sideHead.one('expand').hide();
					app.view.middle.entity.removeClassName('extend');
				}
			}).hide()
		});
		
		app.view.sideHead.one('collapse').hide();
		app.view.sideHead.one('expand').show();
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
				icon   : './icons/status-offline.png',
				style  : { 'float': 'right' },
				onClick: function() {
					new Hypermodal({
						title: 'Chinachu WebUI Client Application v3',
						description: (
							'chinachu-wui-client/beta, sakurapanel/' + sakura.version +
							', Prototype/' + Prototype.Version
						),
						content: 'ABSOLUTELY NO WARRANTY.',
						buttons: [
							{
								color: '@blue',
								label: 'CLOSE'.__(),
								onClick: function (e, btn, modal) {
									modal.close();
								}
							},
							{
								color: '@pink',
								label: 'chinachu.akkar.in',
								onClick: function (e, btn, modal) {
									window.open('http://chinachu.akkar.in/', 'chinachu-project-website');
								}
							}
						]
					}).render();
				}
			})
		});
		
		// タブシステム(仮)
		if (!app.tab) app.f.initTabSystem();
		app.f.drawTabSystem();
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
	
	// タブシステム初期化
	app.f.initTabSystem = function _initTabSystem() {
		app.tab = {
			current: 0,
			items: []
		};
		app.tab.items.push({
			key  : 'tab-id-0',
			label: '...',
			icon : './icons/dummy.png',
			stat : Object.clone(app.stat),
			url  : window.location.href
		});
		
		if (window.sessionStorage.getItem(app.api.apiRoot + '::tab')) {
			app.tab = window.sessionStorage.getItem(app.api.apiRoot + '::tab').evalJSON();
		}
		
		clearInterval(app.timer.intervalTabSystemUpdater);
		app.timer.intervalTabSystemUpdater = setInterval(app.f.updateTabSystem, 3000);
		
		document.stopObserving('sakurapanel:pm:load', app.f.updateTabSystem);
		document.observe('sakurapanel:pm:load', app.f.updateTabSystem);
	};
	
	// タブシステム更新
	app.f.updateTabSystem = function _updateTabSystem() {
		if (app.tab.items[app.tab.current].label !== app.pm.title.textContent) app.f.drawTabSystem.defer();
		if (app.tab.items[app.tab.current].icon !== app.pm.index.category[app.pm.category].icon) app.f.drawTabSystem.defer();
		
		app.tab.items[app.tab.current].label = app.pm.title.textContent;
		app.tab.items[app.tab.current].icon  = app.pm.index.category[app.pm.category].icon || null;
		app.tab.items[app.tab.current].url   = window.location.href;
		app.tab.items[app.tab.current].stat  = Object.clone(app.stat);
		
		window.sessionStorage.setItem(app.api.apiRoot + '::tab', Object.toJSON(app.tab))
	};
	
	// タブシステム描画
	app.f.drawTabSystem = function _drawTabSystem() {
		app.tab.items.each(function(a, i) {
			app.view.footer.remove(a.key);
			
			app.view.footer.add({
				key: a.key,
				ui : new sakura.ui.Button({
					isRemovableByUser: (i !== 0),
					label  : a.label.escapeHTML(),
					icon   : a.icon,
					onClick: function() {
						app.tab.current = i;
						window.location.href = a.url;
						app.stat = Object.clone(a.stat);
						//app.f.drawTabSystem();
						app.f.enterControlView();
					},
					onRemove: function() {
						app.tab.items = app.tab.items.without(a);
						
						app.tab.current = 0;
						window.location.href = app.tab.items.first().url;
						app.stat = Object.clone(app.tab.items.first().stat);
						app.f.enterControlView();
					}
				})
			});
			
			if (app.tab.current === i) app.view.footer.one(a.key).select();
		});
		
		app.view.footer.remove('tab-add');
		
		app.view.footer.add({
			key: 'tab-add',
			ui : new sakura.ui.Button({
				label  : '&#x2b;',
				onClick: function() {
					app.tab.current = app.tab.items.length;
					
					var newTab = Object.clone(app.tab.items.last());
					newTab.key = 'tab-id-' + new Date().getTime();
					
					app.tab.items.push(newTab);
					
					app.f.drawTabSystem();
				}
			})
		});
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
		
		app.view.footer.one('chinachu').entity.style.backgroundImage = 'url(./icons/status.png)';
		
		app.notify.create({ title: 'Chinachu', message: 'CONNECTED'.__() });
	};
	
	var socketOnDisconnect = function _socketOnDisconnect() {
		app.view.loadingMask.show();
		
		document.fire('chinachu:disconnect');
		
		app.view.footer.one('chinachu').entity.style.backgroundImage = 'url(./icons/status-offline.png)';
		
		app.notify.create({ title: 'Chinachu', message: 'DISCONNECTED'.__() });
	};
	
	var socketOnStatus = function _socketOnStatus(data) {
		app.chinachu.status = data;
		document.fire('chinachu:status', app.chinachu.status);
		
		app.view.footer.remove('count');
		
		app.view.footer.add({
			key: 'count',
			ui : new sakura.ui.Button({
				style: { 'float': 'right', 'cursor': 'default' },
				label: data.connectedCount,
				icon : './icons/user-medium-silhouette.png'
			})
		});
	};
	
	var socketOnRules = function _socketOnRules(data) {
		app.chinachu.rules = data;
		document.fire('chinachu:rules', app.chinachu.rules);
		
		app.view.header.one('rules').badge.update(data.length.toString(10));
	};
	
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
		
		app.view.header.one('reserves').badge.update(data.length.toString(10));
	};
	
	var socketOnSchedule = function _socketOnSchedule(data) {
		app.chinachu.schedule = data;
		document.fire('chinachu:schedule', app.chinachu.schedule);
	};
	
	var socketOnRecording = function _socketOnRecording(data) {
		app.chinachu.recording = data;
		document.fire('chinachu:recording', app.chinachu.recording);
		
		app.view.header.one('recording').badge.update(data.length.toString(10));
		
		if (data.length === 0) {
			$('favicon').href = './favicon.ico';
		} else {
			$('favicon').href = './favicon-active.ico';
		}
		
		setTimeout(socketOnReserves, 0, app.chinachu.reserves);
	};
	
	var socketOnRecorded = function _socketOnRecorded(data) {
		data = data.reverse();
		
		app.chinachu.recorded = data;
		document.fire('chinachu:recorded', app.chinachu.recorded);
		
		app.view.header.one('recorded').badge.update(data.length.toString(10));
	};
	
	app.socket.on('connect'   , socketOnConnect);
	app.socket.on('disconnect', socketOnDisconnect);
	
	app.socket.on('status'    , socketOnStatus);
	app.socket.on('rules'     , socketOnRules);
	app.socket.on('reserves'  , socketOnReserves);
	app.socket.on('schedule'  , socketOnSchedule);
	app.socket.on('recording' , socketOnRecording);
	app.socket.on('recorded'  , socketOnRecorded);
	
	// go
	app.f.enterControlView();
	
})();