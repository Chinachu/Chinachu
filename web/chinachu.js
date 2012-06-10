/*!
 * chinachu-monitor-client
**/
var ui       = window.ui       = {};
var state    = window.state    = {};
var rules    = window.rules    = [];
var schedule = window.schedule = {};
var socket   = window.socket   = null;

ui = {
	lastPointer: [0, 0],
	scroll     : [0, 0],
	isScrolling: false,
	isScrollbar: false,
	date       : 0,
	timetables : [],
	channels   : []
};

Event.observe(window, 'load', function _init() {
	// ソケット初期化
	socket = io.connect(window.location.protocol + '//' + window.location.host, {
		connectTimeout: 3000
	});
	
	socket.on('connect', function _socketOnConnect() {
		$('footer-status').update('接続は確立されました');
	});
	
	socket.on('disconnect', function _socketOnDisconnect() {
		$('footer-status').update('<b>切断</b>');
	});
	
	socket.on('status',   socketOnStatus);
	socket.on('rules',    socketOnRules);
	socket.on('schedule', socketOnSchedule);
	socket.on('snapshot', socketOnSnapshot);
	
	
	// 入力イベント
	if (Prototype.Browser.MobileSafari) {
		$('schedule-list-pg').observe('touchstart', timetableOnMouseDown);
		
		$('scrollbar-y').observe('touchstart', scrollbarOnMouseDown);
		$('scrollbar-x').observe('touchstart', scrollbarOnMouseDown);
	
		Event.observe(window, 'touchmove', onMouseMove);
		Event.observe(window, 'touchend',  onMouseUp);
	} else {
		$('schedule-list-pg').observe('mousedown',  timetableOnMouseDown);
		
		$('scrollbar-y').observe('mousedown',  scrollbarOnMouseDown);
		$('scrollbar-x').observe('mousedown',  scrollbarOnMouseDown);
		
		Event.observe(window, 'mousemove', onMouseMove);
		Event.observe(window, 'mouseup',   onMouseUp);
	}
	
	if (Prototype.Browser.Gecko) {
		$('schedule-list-pg').observe('DOMMouseScroll', onMouseWheel);
	} else  {
		$('schedule-list-pg').observe('mousewheel', onMouseWheel);
	}
	
	// メニューボタン
	$('button-view-reserved').observe('click', viewReserved);
	$('button-view-rules').observe('click', viewRules);
	
	// 検索
	$('schedule-input-search').observe('change', viewSearch);
	
	// 定期処理
	if (Prototype.Browser.MobileSafari) {
		setInterval(renderTimetables, 1000 * 60 * 30);//30 minute
	} else {
		setInterval(renderTimetables, 1000 * 60 * 3);//3 minute
		setInterval(socketOnStatus, 1000 * 60);//1 minute
	}
	
	// スクロールバー
	setTimeout(updateScrollbar, 100);
});

Event.observe(window, 'resize', function _onResize() {
	updateScrollbar();
});

function socketOnStatus(a) {
	state = a || state;
	
	$('footer-status').update('接続 (' + state.connectedCount + 'クライアント)');
	
	if (state.isRecording) {
		$('footer-status').insert(' / <span class="recording">録画予約実行中</span>');
		
		if (Prototype.Browser.MobileSafari) return;
		
		$('monitor').className  = 'split';
		$('schedule').className = 'split';
		
		var p = state.recording.program;
		
		var cdt = new Date();
		var sdt = new Date(p.start);
		var edt = new Date(p.end);
		
		var percent = Math.round(((cdt.getTime() - sdt.getTime()) / 1000) / p.seconds * 100);
		
		$('monitor-recording-progress-bar').style.width = percent + '%';
		
		var infoE = (
			sdt.getHours().toPaddedString(2) + '時' + sdt.getMinutes().toPaddedString(2) + '分～' +
			edt.getHours().toPaddedString(2) + '時' + edt.getMinutes().toPaddedString(2) + '分' +
			' (' + (p.seconds / 60) + '分間)<br>' +
			'[' + p.category + '] ' + p.callsign + '<br>' +
			percent + '％ 録画済み'
		);
		
		$('monitor-recording-title').update(p.title);
		$('monitor-recording-detail').update(p.detail);
		$('monitor-recording-info').update(infoE);
	} else {
		$('footer-status').insert(' / <span class="standby">スタンバイ</span>');
		
		$('monitor').className  = 'hide';
		$('schedule').className = 'full';
	}
}

function socketOnRules(a) {
	rules = a || rules;
}

function socketOnSchedule(a) {
	schedule = a;
	
	ui.channels   = [];
	ui.timetables = [];
	
	renderChannelList();
	
	renderDayList();
	renderTimetables();
	
	selectDate(ui.date);
	
	updateScroll([0, (new Date().getHours() * 100)]);
	
	$('loading').hide();
}

function renderChannelList() {
	$('schedule-list-ch').update();
	
	schedule.each(function(ch) {
		var li = new Element('li').insert(
			'<b>' + ch.displayName + '</b>' +
			'<small>' + ch.channel + ': ' + ch.callsign + '</small>'
		);
		
		$('schedule-list-ch').insert(li);
		
		ui.channels.push({
			channel    : ch.channel,
			callsign   : ch.callsign,
			displayName: ch.displayName
		});
	});
}

function renderDayList() {
	$('schedule-list-day').update();
	
	var cd  = new Date();
	var cdt = cd.getTime();
	var lmo = -1;
	var day = ['<span class="sun">日</span>', '月', '火', '水', '木', '金', '<span class="sat">土</span>'];
	var dtm = false;
	
	(7).times(function(i) {
		var d     = new Date(cdt + (1000 * 60 * 60 * 24 * i));
		var ddate = d.getDate();
		
		var label = '';
		
		if (lmo !== d.getMonth()) {
			lmo = d.getMonth();
			label += (d.getMonth() + 1) + '月';
		}
		
		label += ddate + '日';
		
		label += '(' + day[d.getDay()] + ')';
		
		var li = new Element('li', {className: 'date-selector date-of-' + ddate}).insert('<a>' + label + '</a>');
		
		function liOnClick(e) {
			ui.date = ddate;
			selectDate(ui.date);
			e.stop();
		}
		
		if (Prototype.Browser.MobileSafari) {
			li.observe('touchstart', liOnClick);
		} else {
			li.observe('mousedown', liOnClick);
		}
		
		$('schedule-list-day').insert(li);
		
		if (ui.date === ddate) {
			dtm = true;
		}
		
		ui.timetables.push({
			date     : ddate,
			container: document.createElement('ul'),
			channels : []
		});
	});
	
	if (!dtm) ui.date = cd.getDate();
}

function renderTimetables() {
	var cd = new Date();
	
	ui.timetables.each(function(tt) {
		tt.channels = [];
		
		ui.channels.each(function(ch) {
			var c = {
				channel    : ch.channel,
				callsign   : ch.callsign,
				displayName: ch.displayName
			};
			
			schedule.each(function(sc) {
				if (ch.channel !== sc.channel) return;
				
				var ps = [];
				
				sc.programs.each(function(p) {
					if (tt.date !== new Date(p.start).getDate()) return;
					
					ps.push(p);
				});
				
				c.programs = ps;
			});
			
			tt.channels.push(c);
		});
	});
	
	var scheduleListPgC = $('schedule-list-pg');
	scheduleListPgC.update();
	
	ui.timetables.each(function(tt) {
		tt.container.update();
		
		tt.channels.each(function(ch, j) {
			var li = document.createElement('li');
			
			ch.programs.each(function(p) {
				setTimeout(function() {
					var start = new Date(p.start);
					var end   = new Date(p.end);
					var div   = document.createElement('div');
					
					div.className    = p.category;
					div.style.top    = ((start.getHours() + (start.getMinutes() / 60)) * 100 + 45) + 'px';
					div.style.left   = ((j * 165) + 5) + 'px';
					div.style.height = (Math.floor((p.seconds / 60) / 60 * 100) - 3) + 'px';
					
					if (p.isReserved) div.addClassName('reserved');
					if (p.isConflict) div.addClassName('conflict');
					if ((start.getTime() < cd.getTime()) && end.getTime() > cd.getTime()) div.addClassName('during');
					if (end.getTime() < cd.getTime()) div.addClassName('done');
					
					// ヘッド
					var titleE = (
						'<span class="title"><span class="time h' + start.getHours() + '">' +
						start.getMinutes().toPaddedString(2) +
						'</span>' +
						(function() {
							var flags = '';
							
							p.flags.each(function(flag) {
								flags += '<span class="flag flag-' + flag + '">' + flag + '</span>';
							});
							
							return flags;
						})() +
						p.title.replace(/【.】/g, '') + '</span>'
					);
					div.insert(titleE);
					
					// ボディ
					div.insert(
						'<span class="detail">' + (p.detail || '') + '</span>'
					);
					
					if (Prototype.Browser.MobileSafari) {
						div.observe('touchstart', function(e) {
							
							var onPress = function() {
								programOnClick(p, ch, titleE);
							};
							
							var pressTimer = setTimeout(onPress, 1000);
							
							div.observe('touchmove', function(e) {
								div.stopObserving('touchmove');
								clearTimeout(pressTimer);
							});
							
							div.observe('touchend', function(e) {
								div.stopObserving('touchend');
								clearTimeout(pressTimer);
							});
						});
					} else {
						div.observe('dblclick', function(e) {
							if (ui.isScrolling) return;
							
							programOnClick(p, ch, titleE);
							
							e.stop();
						});
					}
					
					li.insert(div);
				}, 0);
			});
			
			tt.container.insert(li);
		});
		
		scheduleListPgC.appendChild(tt.container);
	});
}

function programOnClick(p, ch, titleE) {
	var cdt = new Date();
	var sdt = new Date(p.start);
	var edt = new Date(p.end);
	
	var infoE = (
		sdt.getHours().toPaddedString(2) + '時' + sdt.getMinutes().toPaddedString(2) + '分～' +
		edt.getHours().toPaddedString(2) + '時' + edt.getMinutes().toPaddedString(2) + '分' +
		' (' + (p.seconds / 60) + '分間) ' +
		'[' + p.category + ']' + ch.displayName
	);
	
	var descE = p.detail || '(紹介文はありません)';
	
	if (p.isReserved) {
		infoE += ' <span class="reserved">Reserved</span>';
		
		descE += ' <div class="reserved-info"><div>保存先</div><p>' + p.filepath + '</p></div>';
	}
	
	if (p.isConflict) {
		infoE += ' <span class="conflict">Conflict</span>';
	}
	
	var buttons = [
		{
			label  : '閉じる',
			color  : '@blue',
			onClick: function(e, btn, modal) {
				modal.close();
			}
		}/*,
		{
			label  : 'ルール作成',
			color  : '@pink',
			onClick: function(e, btn, modal) {
				modal.close();
			}
		}*/
	];
	
	if (p.isManualReserved) buttons.push({
		label  : '一時予約の取り消し',
		color  : '@red',
		onClick: function(e, btn, modal) {
			modal.close();
			
			var formContainer = new Element('div');
			
			var form = new Hyperform({
				formWidth : '100%',
				labelWidth: '90px',
				fields: [
					{
						label: '番組名',
						text : p.title
					},
					{
						label: '放送情報',
						text : infoE
					},
					{
						key  : 'ctrlKey',
						label: 'コントロールキー',
						input: {
							type      : 'password-no-confirm',
							width     : 100,
							isRequired: true
						}
					}
				]
			}).render(formContainer);
			
			new Hypermodal({
				modalWidth : Prototype.Browser.MobileSafari ? '100%' : null,
				title      : 'コントロールキーを入力して続行',
				description: '一時予約の取り消し',
				content    : formContainer,
				buttons    : [
					{
						label  : '一時予約の取り消し',
						color  : '@red',
						onClick: function(e, btn, modal) {
							if (!form.validate()) return;
							
							modal.close();
							
							socket.once('manual-reserve-cancel-result', function(res) {
								if (res.isAuthFailure) {
									new Hypermodal({
										modalWidth : Prototype.Browser.MobileSafari ? '100%' : null,
										title      : '正しくないコントロールキー',
										description: '一時予約の取り消し',
										content    : '認証に失敗しました。再試行してください。',
										onClose    : function() {
											modal.render();
										}
									}).render();
									
									return;
								}
								
								if (res.isSuccess) {
									new Hypermodal({
										modalWidth : Prototype.Browser.MobileSafari ? '100%' : null,
										title      : '一時予約の取り消しに成功しました',
										description: '一時予約の取り消し',
										content    : 'この操作はスケジューラーの次回実行時に反映されます。',
										buttons    : [
											{
												label  : '閉じる',
												color  : '@blue',
												onClick: function(e, btn, modal) {
													modal.close();
												}
											},
											{
												label  : '今すぐスケジューラーを実行',
												color  : '@red',
												onClick: function(e, btn, modal) {
													modal.close();
													
													requestExecuteScheduler( form.result().ctrlKey );
												}
											}
										]
									}).render();
									
									return;
								}
							});
							
							socket.emit('manual-reserve-cancel-request', {
								ctrlKey: form.result().ctrlKey,
								channel: p.channel,
								start  : p.start
							});
						}
					},
					{
						label  : 'キャンセル',
						onClick: function(e, btn, modal2) {
							modal2.close();
							modal.render();
						}
					}
				]
			}).render();
		}
	});
	
	if (!p.isReserved) buttons.push({
		label  : '一時予約',
		color  : '@red',
		onClick: function(e, btn, modal) {
			modal.close();
			
			var formContainer = new Element('div');
			
			var form = new Hyperform({
				formWidth : '100%',
				labelWidth: '90px',
				fields: [
					{
						label: '番組名',
						text : p.title
					},
					{
						label: '放送情報',
						text : infoE
					},
					{
						key  : 'ctrlKey',
						label: 'コントロールキー',
						input: {
							type      : 'password-no-confirm',
							width     : 100,
							isRequired: true
						}
					}
				]
			}).render(formContainer);
			
			new Hypermodal({
				modalWidth : Prototype.Browser.MobileSafari ? '100%' : null,
				title      : 'コントロールキーを入力して続行',
				description: '一時予約',
				content    : formContainer,
				buttons    : [
					{
						label  : '一時予約',
						color  : '@red',
						onClick: function(e, btn, modal) {
							if (!form.validate()) return;
							
							modal.close();
							
							socket.once('manual-reserve-result', function(res) {
								if (res.isAuthFailure) {
									new Hypermodal({
										modalWidth : Prototype.Browser.MobileSafari ? '100%' : null,
										title      : '正しくないコントロールキー',
										description: '一時予約',
										content    : '認証に失敗しました。再試行してください。',
										onClose    : function() {
											modal.render();
										}
									}).render();
									
									return;
								}
								
								if (res.isSuccess) {
									new Hypermodal({
										modalWidth : Prototype.Browser.MobileSafari ? '100%' : null,
										title      : '一時予約に成功しました',
										description: '一時予約',
										content    : 'この操作はスケジューラーの次回実行時に反映されます。',
										buttons    : [
											{
												label  : '閉じる',
												color  : '@blue',
												onClick: function(e, btn, modal) {
													modal.close();
												}
											},
											{
												label  : '今すぐスケジューラーを実行',
												color  : '@red',
												onClick: function(e, btn, modal) {
													modal.close();
													
													requestExecuteScheduler( form.result().ctrlKey );
												}
											}
										]
									}).render();
									
									return;
								}
							});
							
							socket.emit('manual-reserve-request', {
								ctrlKey: form.result().ctrlKey,
								channel: p.channel,
								start  : p.start
							});
						}
					},
					{
						label  : 'キャンセル',
						onClick: function(e, btn, modal2) {
							modal2.close();
							modal.render();
						}
					}
				]
			}).render();
		}
	});
	
	new Hypermodal({
		modalWidth : Prototype.Browser.MobileSafari ? '100%' : null,
		title      : titleE,
		description: infoE,
		content    : descE,
		buttons    : buttons
	}).render();
}

function selectDate(date) {
	// intelli
	$$('li.date-selector').each(function(li) {
		li.removeClassName('selected');
	});
	
	$$('li.date-selector.date-of-' + date).first().addClassName('selected');
	
	ui.timetables.each(function(tt) {
		if (date === tt.date) {
			tt.container.show();
		} else {
			tt.container.hide();
		}
	});
}

function socketOnSnapshot(data) {
	if (!Prototype.Browser.MobileSafari) $('monitor-preview-img').src = data;
}

function timetableOnMouseDown(e) {
	ui.isScrolling = true;
	ui.isScrollbar = false;
	
	if (Prototype.Browser.MobileSafari) {
		e.screenX = e.targetTouches[0].pageX;
		e.screenY = e.targetTouches[0].pageY;
	}
	
	ui.lastPointer = [e.screenX, e.screenY];
	
	e.stop();
}

function scrollbarOnMouseDown(e) {
	ui.isScrolling = true;
	ui.isScrollbar = true;
	
	if (Prototype.Browser.MobileSafari) {
		e.screenX = e.targetTouches[0].pageX;
		e.screenY = e.targetTouches[0].pageY;
	}
	
	ui.lastPointer = [e.screenX, e.screenY];
	
	e.stop();
}

function onMouseMove(e) {
	if (!ui.isScrolling) return;
	
	if (Prototype.Browser.MobileSafari) {
		e.screenX = e.targetTouches[0].pageX;
		e.screenY = e.targetTouches[0].pageY;
	}
	
	if (ui.isScrollbar) {
		var maxpos  = [ (ui.channels.length * 165 + 35), (2450 + 120) ];
		var barsize = [ $('scrollbar-x-container').getWidth(), $('scrollbar-y-container').getHeight() ];
		
		var delta = [
			(e.screenX - ui.lastPointer[0]),
			(e.screenY - ui.lastPointer[1])
		];
		
		delta = [
			Math.round(delta[0] * maxpos[0] / barsize[0]),
			Math.round(delta[1] * maxpos[1] / barsize[1])
		];
	} else {
		var delta = [ (ui.lastPointer[0] - e.screenX), (ui.lastPointer[1] - e.screenY) ];
	}
	
	updateScroll(delta);
	
	ui.lastPointer = [e.screenX, e.screenY];
	
	e.stop();
}

function onMouseUp(e) {
	ui.isScrolling = false;
	
	e.stop();
}

function onMouseWheel(e) {
	var delta = 0;
	if (Prototype.Browser.Gecko) delta = - e.detail * 5;
	else                         delta = e.wheelDelta;
	updateScroll([0, 0 - delta]);
}

function updateScroll(delta) {
	var pos   = [ (ui.scroll[0] + delta[0]), (ui.scroll[1] + delta[1]) ];
	
	if (pos[0] < 0) pos[0] = 0;
	if (pos[1] < 0) pos[1] = 0;
	
	var maxpos = [ (ui.channels.length * 165 - $('schedule').getWidth() + 35), (2450 - $('schedule').getHeight() + 120) ];
	
	if (pos[0] > maxpos[0]) pos[0] = maxpos[0];
	if (pos[1] > maxpos[1]) pos[1] = maxpos[1];
	
	if (pos[0] < 0) pos[0] = 0;
	if (pos[1] < 0) pos[1] = 0;
	
	ui.scroll = [ pos[0], pos[1] ];
	
	$('chbar-container').style.marginLeft   = '-' + ui.scroll[0] + 'px';
	$('chbar-container').style.paddingRight = ui.scroll[0] + 'px';
	
	$('timeband-container').style.marginTop   = '-' + ui.scroll[1] + 'px';
	$('timeline-container').style.marginTop   = '-' + ui.scroll[1] + 'px';
	
	$('schedule-list-pg').style.marginLeft = '-' + ui.scroll[0] + 'px';
	$('schedule-list-pg').style.marginTop  = '-' + ui.scroll[1] + 'px';
	
	updateScrollbar();
}

function updateScrollbar() {
	var maxpos = [ (ui.channels.length * 165 + 35), (2450 + 120) ];
	
	var barsize = [ $('scrollbar-x-container').getWidth(), $('scrollbar-y-container').getHeight() ];
	
	var movsize = [
		Math.round(ui.scroll[0] * barsize[0] / maxpos[0]),
		Math.round(ui.scroll[1] * barsize[1] / maxpos[1])
	];
	
	var stksize = [
		Math.round(barsize[0] * barsize[0] / maxpos[0]),
		Math.round(barsize[1] * barsize[1] / maxpos[1])
	];
	
	if (stksize[0] < maxpos[0]) {
		$('scrollbar-x-container').show();
		$('scrollbar-x').style.width = stksize[0] + 'px';
		$('scrollbar-x').style.left  = movsize[0] + 'px';
	} else {
		$('scrollbar-x-container').hide();
	}
	
	if (stksize[1] < maxpos[1]) {
		$('scrollbar-y-container').show();
		$('scrollbar-y').style.height = stksize[1] + 'px';
		$('scrollbar-y').style.top    = movsize[1] + 'px';
	} else {
		$('scrollbar-y-container').hide();
	}
}

function requestExecuteScheduler(ctrlKey) {
	$('loading').show();
	
	socket.once('execute-scheduler-result', function(res) {
		$('loading').hide();
		
		if (res.isAuthFailure) {
			new Hypermodal({
				modalWidth : Prototype.Browser.MobileSafari ? '100%' : null,
				title      : '正しくないコントロールキー',
				description: 'スケジューラーの実行',
				content    : '認証に失敗したため、スケジューラーは実行されませんでした。'
			}).render();
			
			return;
		}
		
		if (res.isSuccess) {
			new Hypermodal({
				modalWidth : Prototype.Browser.MobileSafari ? '100%' : '720px',
				title      : 'コマンドは成功しました',
				description: 'スケジューラーの実行',
				content    : '<div class="command-result">' + res.result.replace(/\n/g, '<br>') + '</div>'
			}).render();
			
			return;
		}
	});
	
	socket.emit('execute-scheduler-request', { ctrlKey: ctrlKey, fr: false });
}

function viewReserved() {
	var container = new Element('div');
	
	new Hypermodal({
		title     : '予約一覧',
		modalWidth: Prototype.Browser.MobileSafari ? '100%' : '600px',
		content   : container
	}).render();
	
	var grid = new Hypergrid({
		tableWidth   : '100%',
		disableResize: true,
		disableSelect: true,
		disableSort  : true,
		colModel  : [
			{
				key      : 'date',
				innerHTML: '放送日時',
				width    : 95
			},
			{
				key      : 'duration',
				innerHTML: '長さ',
				width    : 25
			},
			{
				key      : 'channel',
				innerHTML: '放送局',
				width    : 90
			},
			{
				key      : 'title',
				innerHTML: '番組名'
			},
			{
				key      : 'type',
				innerHTML: '予約状態',
				width    : 50
			},
			{
				key      : 'id',
				style    : { display: 'none' }
			}
		],
		rows: []
	}).render(container);
	
	schedule.each(function(ch) {
		ch.programs.each(function(p) {
			if (!p.isReserved && !p.isConflict) return;
			
			var start = new Date(p.start);
			var end   = new Date(p.end);
			
			var dateE = (
				(start.getMonth() + 1).toPaddedString(2) + '月' +
				start.getDate().toPaddedString(2) + '日' +
				start.getHours().toPaddedString(2) + '時' +
				start.getMinutes().toPaddedString(2) + '分'
			);
			
			if (start.getDate() === new Date().getDate()) {
				dateE = '<u>' + dateE + '</u>';
			}
			
			if (end.getTime() < new Date().getTime()) {
				dateE = '<span style="color: #aaa">' + dateE + '</style>';
			} else if (start.getTime() <= new Date().getTime()) {
				dateE = '<span style="color: #ba0040">' + dateE + '</style>';
			}
			
			var titleE = (
				'<span class="title">' +
				(function() {
					var flags = '';
					
					p.flags.each(function(flag) {
						flags += '<span class="flag flag-' + flag + '">' + flag + '</span>';
					});
					
					return flags;
				})() +
				p.title.replace(/【.】/g, '') + '</span>'
			);
			
			grid.push({
				cell: {
					id: {
						innerHTML: start.getTime(),
						style    : { display: 'none' }
					},
					date: {
						innerHTML: dateE
					},
					duration: {
						innerHTML: (p.seconds / 60) + '分'
					},
					channel: {
						innerHTML: ch.displayName
					},
					title: {
						innerHTML: titleE
					},
					type: {
						innerHTML: (function() {
							if (p.isConflict) {
								if (p.isManualReserved) {
									return '一時 (衝突)';
								}
								
								return '自動 (衝突)';
							} else {
								if (p.isManualReserved) {
									return '一時';
								}
								
								return '自動';
							}
						})(),
						style : (function() {
							if (p.isConflict) {
								return { backgroundColor: '#a86100', color: '#fff' };
							} else {
								if (p.isManualReserved) {
									return { backgroundColor: '#ba0040', color: '#fff' };
								}
								
								return { backgroundColor: '#d67fae', color: '#fff' };
							}
						})()
					}
				},
				onClick: function() {
					programOnClick(p, ch, titleE);
				}
			});
		});
	});
	
	grid.sorter('id', 'asc').render();
}

function viewRules() {
	var container = new Element('div');
	
	new Hypermodal({
		title     : 'ルール一覧',
		modalWidth: Prototype.Browser.MobileSafari ? '100%' : '600px',
		content   : container
	}).render();
	
	var grid = new Hypergrid({
		tableWidth   : '100%',
		disableResize: true,
		disableSelect: true,
		disableSort  : true,
		colModel  : [
			{
				key      : 'id',
				innerHTML: '＃',
				width    : 10
			},
			{
				key      : 'category',
				innerHTML: 'カテゴリー',
				width    : 45
			},
			{
				key      : 'hour',
				innerHTML: '時間帯',
				width    : 35
			},
			{
				key      : 'duration',
				innerHTML: '長さ指定 (秒)',
				width    : 70
			},
			{
				key      : 'ignoreFlags',
				innerHTML: '無視フラグ',
				width    : 45
			},
			{
				key      : 'ignoreTitles',
				innerHTML: '無視タイトル'
			},
			{
				key      : 'reserveTitles',
				innerHTML: '予約タイトル'
			}
		],
		rows: []
	}).render(container);
	
	rules.each(function(rule, i) {
		
		var dashE = '<span style="color: #aaa">&mdash;</span>';
		
		grid.push({
			cell: {
				id: {
					innerHTML: i.toString(10)
				},
				category: {
					innerHTML: rule.category || dashE
				},
				hour: {
					innerHTML: !!rule.hour ? (
						(rule.hour.start || -1).toString(10) + ' - ' + (rule.hour.end || -1).toString(10)
					) : dashE
				},
				duration: {
					innerHTML: !!rule.duration ? (
						(rule.duration.min || -1).toString(10) + ' - ' +
						(rule.duration.max || -1).toString(10)
					) : dashE
				},
				ignoreFlags: {
					innerHTML: !!rule.ignore_flags ? rule.ignore_flags.join(',') : dashE
				},
				ignoreTitles: {
					innerHTML: !!rule.ignore_titles ? rule.ignore_titles.join(',') : dashE,
					title    : !!rule.ignore_titles ? rule.ignore_titles.join(', ') : null
				},
				reserveTitles: {
					innerHTML: !!rule.reserve_titles ? rule.reserve_titles.join(',') : dashE,
					title    : !!rule.reserve_titles ? rule.reserve_titles.join(', ') : null
				}
			}
		});
	});
	
	grid.render();
}

function viewSearch() {
	var keyword = $F(this);
	
	this.value = '';
	
	var container = new Element('div');
	
	new Hypermodal({
		title      : keyword,
		description: '番組を検索',
		modalWidth : Prototype.Browser.MobileSafari ? '100%' : '600px',
		content    : container
	}).render();
	
	var grid = new Hypergrid({
		tableWidth   : '100%',
		disableResize: true,
		disableSelect: true,
		disableSort  : true,
		colModel  : [
			{
				key      : 'date',
				innerHTML: '放送日時',
				width    : 95
			},
			{
				key      : 'duration',
				innerHTML: '長さ',
				width    : 25
			},
			{
				key      : 'channel',
				innerHTML: '放送局',
				width    : 90
			},
			{
				key      : 'title',
				innerHTML: '番組名'
			},
			{
				key      : 'type',
				innerHTML: '予約状態',
				width    : 50
			},
			{
				key      : 'id',
				style    : { display: 'none' }
			}
		],
		rows: []
	}).render(container);
	
	schedule.each(function(ch) {
		ch.programs.each(function(p) {
			if (!p.title.include(keyword) && !(p.detail || '').include(keyword)) return;
			
			var start = new Date(p.start);
			var end   = new Date(p.end);
			
			var dateE = (
				(start.getMonth() + 1).toPaddedString(2) + '月' +
				start.getDate().toPaddedString(2) + '日' +
				start.getHours().toPaddedString(2) + '時' +
				start.getMinutes().toPaddedString(2) + '分'
			);
			
			if (start.getDate() === new Date().getDate()) {
				dateE = '<u>' + dateE + '</u>';
			}
			
			if (end.getTime() < new Date().getTime()) {
				dateE = '<span style="color: #aaa">' + dateE + '</style>';
			} else if (start.getTime() <= new Date().getTime()) {
				dateE = '<span style="color: #ba0040">' + dateE + '</style>';
			}
			
			var titleE = (
				'<span class="title">' +
				(function() {
					var flags = '';
					
					p.flags.each(function(flag) {
						flags += '<span class="flag flag-' + flag + '">' + flag + '</span>';
					});
					
					return flags;
				})() +
				p.title.replace(/【.】/g, '') + '</span>'
			);
			
			grid.push({
				cell: {
					id: {
						innerHTML: start.getTime(),
						style    : { display: 'none' }
					},
					date: {
						innerHTML: dateE
					},
					duration: {
						innerHTML: (p.seconds / 60) + '分'
					},
					channel: {
						innerHTML: ch.displayName
					},
					title: {
						innerHTML: titleE
					},
					type: {
						innerHTML: (function() {
							if (p.isConflict) {
								if (p.isManualReserved) {
									return '一時 (衝突)';
								}
								
								return '自動 (衝突)';
							} else {
								if (p.isManualReserved) {
									return '一時';
								}
								
								if (p.isReserved) {
									return '自動';
								}
								
								return 'なし';
							}
						})(),
						style : (function() {
							if (p.isConflict) {
								return { backgroundColor: '#a86100', color: '#fff' };
							} else {
								if (p.isManualReserved) {
									return { backgroundColor: '#ba0040', color: '#fff' };
								}
								
								if (p.isReserved) {
									return { backgroundColor: '#d67fae', color: '#fff' };
								}
							}
						})()
					}
				},
				onClick: function() {
					programOnClick(p, ch, titleE);
				}
			});
		});
	});
	
	grid.sorter('id', 'asc').render();
}