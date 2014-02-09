/*jslint browser:true, vars:true, plusplus:true, nomen:true, continue:true, regexp:true, evil:true, white:true */
/*global P:true, Prototype, Class, sakura, flagrate, $break, Ajax, $, $$, chinachu, global, dateFormat */
(function () {
	'use strict';
	
	P = Class.create(P, {
		
		init: function () {
			
			this.view.content.className = 'loading';
			
			this.time = new Date().getTime();
			
			this.initToolbar();
			this.draw();
			
			this.onNotify = this.refresh.bindAsEventListener(this);
			document.observe('chinachu:schedule', this.onNotify);
			
			return this;
		},
		
		deinit: function () {
			
			document.stopObserving('chinachu:schedule', this.onNotify);
			
			this.tick = flagrate.emptyFunction;
			this.draw = flagrate.emptyFunction;
			if (this.view.drawerDt) { this.view.drawerDt.remove(); }
			if (this.view.clock) { this.view.clock.remove(); }
			
			return this;
		},
		
		refresh: function () {
			
			document.stopObserving('chinachu:schedule', this.onNotify);
			
			this.app.pm.realizeHash(true);
			
			return this;
		},
		
		initToolbar: function () {
			
			/*
			this.view.toolbar.add({
				key: 'type-gr',
				ui : flagrate.createCheckbox({
					label: 'GR'
				}).disable()
			});
			
			this.view.toolbar.add({
				key: 'type-bs',
				ui : flagrate.createCheckbox({
					label: 'BS'
				}).disable()
			});
			
			this.view.toolbar.add({
				key: 'type-cs',
				ui : flagrate.createCheckbox({
					label: 'CS'
				}).disable()
			});
			
			this.view.toolbar.add({
				key: 'type-ex',
				ui : flagrate.createCheckbox({
					label: 'EX'
				}).disable()
			});
			
			this.view.toolbar.add({
				key: 'zoom-out',
				ui : new sakura.ui.Button({
					label  : '小さく',
					icon   : './icons/dummy.png',
					onClick: function () {
						
					}.bind(this)
				}).disable()
			});
			
			this.view.toolbar.add({
				key: 'zoom-in',
				ui : new sakura.ui.Button({
					label  : '大きく',
					icon   : './icons/dummy.png',
					onClick: function () {
						
					}.bind(this)
				}).disable()
			});
			
			this.view.toolbar.add({
				key: 'yesterday',
				ui : new sakura.ui.Button({
					label  : '前の日',
					icon   : './icons/dummy.png',
					onClick: function () {
						
					}.bind(this)
				}).disable()
			});
			
			this.view.toolbar.add({
				key: 'tomorrow',
				ui : new sakura.ui.Button({
					label  : '次の日',
					icon   : './icons/dummy.png',
					onClick: function () {
						
					}.bind(this)
				}).disable()
			});
			
			this.view.toolbar.add({
				key: 'config',
				ui : new sakura.ui.Button({
					label  : 'ビュー設定',
					icon   : './icons/wrench-screwdriver.png',
					onClick: function () {
						
					}.bind(this)
				})
			});
			*/
			
			return this;
		},
		
		draw: function () {
			
			this.view.clock = flagrate.createElement('div', {'class': 'clock'}).insertTo(this.app.view.mainHead.entity);
			
			this.view.content.className = 'fullscreen timetable';
			this.view.content.update();
			
			this.view.board = flagrate.createElement('div', {'class': 'board'}).insertTo(this.view.content);
			
			if (global.chinachu.schedule.length === 0) {
				return;
			}
			
			//this.data.scrolls     = eval(window.sessionStorage.getItem('schedule-param-scrolls') || "[0, 0]");
			var isScrolling = false;
			this.data.scrollStart = [0, 0];
			this.data.scrollEnd   = [0, 0];
			this.data.target      = null;
			
			var unitlen = this.unitlen = 50;
			var linelen      = 80;
			var types        = eval(window.localStorage.getItem('schedule-param-types') || "['GR','BS','CS','EX']");
			var categories = this.categories = eval(window.localStorage.getItem('schedule-param-categories') || "['anime', 'information', 'news', 'sports', 'variety', 'drama', 'music', 'cinema', 'etc']");
			var hideChannels = eval(window.localStorage.getItem('schedule-param-hide-channels') || "[]");
			
			var total  = 0;
			var count  = 0;
			var maxlen = 0;
			
			var piece  = this.data.piece  = {};// piece of canvas programs
			var pieces = this.data.pieces = [];// array of program pieces
			
			var k = 0;
			
			this.view.head = flagrate.createElement('div', {'class': 'head'}).insertTo(this.view.content);
			
			// ツールバー
			/*
			if (types.indexOf('GR') !== -1) { this.view.toolbar.one('type-gr').check(); }
			if (types.indexOf('BS') !== -1) { this.view.toolbar.one('type-bs').check(); }
			if (types.indexOf('CS') !== -1) { this.view.toolbar.one('type-cs').check(); }
			if (types.indexOf('EX') !== -1) { this.view.toolbar.one('type-ex').check(); }
			this.view.toolbar.one('type-gr').enable();
			this.view.toolbar.one('type-bs').enable();
			this.view.toolbar.one('type-cs').enable();
			this.view.toolbar.one('type-ex').enable();
			*/
			
			global.chinachu.schedule.forEach(function (channel, i) {
				if (channel.programs.length === 0) { return; }
				if (types.indexOf(channel.type) === -1) { return; }
				if (hideChannels.indexOf(channel.id) !== -1) { return; }
				
				var x = k;
				
				var posX   = (4 + x * (4 + linelen));
				var width  = linelen;
				
				var ch = new sakura.ui.Container({
					style: {
						left  : posX + 'px',
						width : width + 'px'
					}
				}).insert(channel.name).render(this.view.head);
	
				// ライブ視聴用コンテキストメニュー
				var contextMenuItems = [
					{
						label   : 'ライブ視聴',
						icon    : './icons/film.png',
						onSelect: function () {
							window.location.hash = '!/channel/watch/id=' + channel.id;
						}
					}
				];
				flagrate.createContextMenu({
					target: ch.entity,
					items : contextMenuItems
				});
				
				ch.entity.observe('click', function () {
					window.location.hash = '!/search/top/skip=1&chid=' + channel.id + '/';
				});
				
				channel.programs.forEach(function (program, j) {
					if ((program.end - this.time) < 0) {
						channel.programs = channel.programs.without(program);
						return;
					}
					
					var posY   = Math.floor(1 + (program.start - this.time) / 1000 / 1000 * unitlen + 100);
					var height = Math.floor(program.seconds / 1000 * unitlen - 1);
					
					if (maxlen < program.end) { maxlen = program.end; }
					
					// color: this.app.def.categoryColor[program.category] || '#ffffff'
					
					// add to piece
					piece[program.id] = {
						id     : program.id,
						program: program,
						posX   : posX,
						posY   : posY,
						width  : width,
						height : height
					};
					
					pieces.push(piece[program.id]);
				}.bind(this));
				
				++k;
				total += channel.programs.length;
			}.bind(this));
			
			global.chinachu.reserves.forEach(function (program) {
				if (typeof piece[program.id] === 'undefined') { return; }
				
				piece[program.id].isReserved = true;
				
				if (program.isManualReserved) {
					piece[program.id].isManualReserved = true;
				}
				if (program.isSkip) {
					piece[program.id].isSkip = true;
				}
			});
			
			global.chinachu.recording.forEach(function (program) {
				if (typeof piece[program.id] === 'undefined') { return; }
				
				piece[program.id].isRecording = true;
			});
			
			// 現在時刻表示線
			this.view.hand = new sakura.ui.Container({className: 'handline'}).render(this.view.board);
			this.view.hand.entity.style.top   = 100 + 'px';
			this.view.hand.entity.style.width = (5 + k * (5 + linelen)) + 'px';
			
			// スケール
			this.view.timescale = flagrate.createElement('div', {'class': 'timescale'}).insertTo(this.view.content);
			
			this.view.timescale.setStyle({'height': ((maxlen - this.time) / 1000 / 1000 * unitlen + 100) + 'px'});
			
			
			var ld  = -1;
			var lm  = -1;
			
			var i, lim;
			for (i = this.time, lim = this.time + 60000 * 12000; maxlen > i && lim > i; i += 60000) {
				var date = new Date(i);
				var d    = date.getDate();
				var m    = date.getMinutes();
				
				if ((m === 0) && (lm !== m) && (ld === d)) {
					lm = m;
					
					this.view.timescale.insert(
						flagrate.createElement('div', { 'class': 'long h' + date.getHours() }).setStyle({
							top: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
						}).insert(date.getHours() + 'h')
					);
				}
				
				if ((m === 30) && (lm !== m)) {
					lm = m;
					
					this.view.timescale.insert(
						flagrate.createElement('div', { 'class': 'middle' }).setStyle({
							top: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
						})
					);
				}
				
				if (((m === 10) || (m === 20) || (m === 40) || (m === 50)) && (lm !== m)) {
					lm = m;
					
					this.view.timescale.insert(
						flagrate.createElement('div', { 'class': 'short' }).setStyle({
							top: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
						})
					);
				}
				
				if (ld !== d) {
					ld = d;
					
					if (m === 0) {
						new sakura.ui.Container({
							className: 'cutline',
							style    : {
								top  : (150 + (i - this.time) / 1000 / 1000 * unitlen) + 'px',
								width: (5 + k * (5 + linelen)) + 'px'
							}
						}).render(this.view.board);
					}
					
					if (m === 0) {
						this.view.timescale.insert(
							flagrate.createElement('div', { 'class': 'long h' + date.getHours() + ' date' }).setStyle({
								top: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
							}).insert(d + 'd')
						);
					}
					
					if (m !== 0) {
						this.view.timescale.insert(
							flagrate.createElement('div', { 'class': 'date' }).setStyle({
								top: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
							}).insert(d + 'd')
						);
					}
				}
			}
			
			// drawer
			this.view.drawer = flagrate.createElement('div', {'class': 'drawer'});
			this.view.drawerHead = flagrate.createElement('div', {'class': 'head'}).insertTo(this.view.drawer);
			this.view.drawerBody = flagrate.createElement('div', {'class': 'body'}).insertTo(this.view.drawer);
			this.view.drawerFoot = flagrate.createElement('div', {'class': 'foot'}).insertTo(this.view.drawer);
			
			this.view.popoverDrawer = flagrate.createPopover({
				element: this.view.drawer
			});
			
			// events
			var viewDrawer = function () {
				
				if (this.data.target === null) {
					this.view.popoverDrawer.close();
					return;
				}
				
				this.view.popoverDrawer.open(this.data.piece[this.data.target.id]._rect);
				
				this.view.drawerHead.update();
				
				flagrate.createElement('div', {'class': 'date'}).insertText(
					dateFormat(this.data.target.start, 'mm/dd HH:MM')
				).insert(
					flagrate.createElement('small').insert('&plus;' + (this.data.target.seconds / 60) + 'min')
				).insertTo(this.view.drawerHead);
				
				if (this.view.drawerDt) { this.view.drawerDt.remove(); }
				
				this.view.drawerDt = new chinachu.ui.DynamicTime({
					tagName: 'span',
					type   : 'delta',
					time   : this.data.target.start
				});
				
				this.view.drawerHead.insert(this.view.drawerDt.entity);
				
				this.view.drawerHead.insert(' <span class="channel">' + this.data.target.channel.type + ': ' + this.data.target.channel.name + '</span>');
				
				this.view.drawerBody.update();
				
				this.view.drawerBody.insert('<div class="title"><span class="bg-cat-' + this.data.target.category + '">' + this.data.target.category + '</span>' + this.data.target.title + '</div>');
				this.view.drawerBody.insert('<div class="detail">' + (this.data.target.detail || '') + '</div>');
				this.view.drawerBody.insert('<div class="id">' + this.data.target.id + '</div>');
				
				this.view.drawerFoot.update(
					new flagrate.Button({
						label   : '番組詳細',
						color   : '@pink',
						onSelect: function () {
							window.location.hash = '!/program/view/id=' + this.data.target.id + '/';
						}.bind(this)
					})
				);
			}.bind(this);
			
			var onClick = function (e) {
				
				var targetId = e.target.getAttribute('rel') || (e.target.parentNode || e.target.parentElement).getAttribute('rel') || null;
				
				this.data.target = null;
				
				if (targetId === null) {
					return;
				}
				
				this.data.target = piece[targetId].program;
			}.bind(this);
			
			var onKeydown = function (e) {
				
				var deltaX = 0;
				var deltaY = 0;
				
				if (e.keyCode === 37 || e.keyCode === 65) { deltaX = 40; }
				if (e.keyCode === 38 || e.keyCode === 87) { deltaY = 40; }
				if (e.keyCode === 39 || e.keyCode === 68) { deltaX = -40; }
				if (e.keyCode === 40 || e.keyCode === 83) { deltaY = -40; }
				
				if (this.data.target !== null) {
					if (e.keyCode === 27) {
						this.data.target = null;
					}
					
					var target = null;
					
					if (e.keyCode === 38 || e.keyCode === 87) {
						target = chinachu.util.getPrevProgramById(this.data.target.id);
						if (target !== null) {
							this.data.target = target;
							deltaY = this.data.piece[this.data.target.id]._rect.getHeight() * 0.365 + 1;
						}
					}
					
					if (e.keyCode === 40 || e.keyCode === 83) {
						target = chinachu.util.getNextProgramById(this.data.target.id);
						if (target !== null) {
							this.data.target = target;
							deltaY = -(this.data.piece[this.data.target.id]._rect.getHeight() * 0.365 + 1);
						}
					}
					
					viewDrawer();
				}
				
				this.data.scrollStat  = 0;
				this.data.scrollStart = [0, 0];
				this.data.scrollEnd   = [0, 0];
				this.data.scrollDelta = [deltaX, deltaY];
				
				clearTimeout(this.timer.inertiaScroll);
				var inertiaScroll = function () {
					var x = this.data.scrollDelta[0] * 0.75;
					var y = this.data.scrollDelta[1] * 0.75;
					
					if ((x > 1 || x < -1) || (y > 1 || y < -1)) {
						this.data.scrollEnd[0] += x;
						this.data.scrollEnd[1] += y;
						this.scroller();
						this.timer.inertiaScroll = setTimeout(inertiaScroll, 30);
					}
				}.bind(this);
				inertiaScroll();
			}.bind(this);
			
			var onMousedown = function (e) {
				
				e.preventDefault();
				e.stopPropagation();
				
				this.data.scrollStat  = [e.clientX, e.clientY].join(',');
				this.data.scrollStart = this.data.scrollEnd = [e.clientX, e.clientY];
				
				document.body.addEventListener('mousemove', onMousemove);
				document.body.addEventListener('mouseup',   onMouseup);
				
				this.scroller();
			}.bind(this);
			
			var onMousemove = function (e) {
				
				e.preventDefault();
				e.stopPropagation();
				
				this.data.scrollEnd = [e.clientX, e.clientY];
				
				this.scroller();
			}.bind(this);
			
			var onMouseup = function (e) {
				
				e.preventDefault();
				e.stopPropagation();
				
				if (this.data.scrollStat === [e.clientX, e.clientY].join(',')) {
					
					if (e.button === 2 || e.which === 3) {
						this.view.popoverDrawer.close();
					} else {
						setTimeout(viewDrawer, 25);
					}
				}
				
				if (
					this.data.scrollDelta[0] !== 0 ||
					this.data.scrollDelta[1] !== 0
				) {
					clearTimeout(this.timer.inertiaScroll);
					var inertiaScroll = function () {
						var x = this.data.scrollDelta[0] * 0.75;
						var y = this.data.scrollDelta[1] * 0.75;
						
						if ((x > 1 || x < -1) || (y > 1 || y < -1)) {
							this.data.scrollEnd[0] += x;
							this.data.scrollEnd[1] += y;
							this.scroller();
							this.timer.inertiaScroll = setTimeout(inertiaScroll, 30);
						}
					}.bind(this);
					inertiaScroll();
				}
				
				document.body.removeEventListener('mousemove', onMousemove);
				document.body.removeEventListener('mouseup',   onMouseup);
			}.bind(this);
			
			var onTouchstart = function (e) {
				
				this.data.scrollStat  = 0;
				this.data.scrollStart = this.data.scrollEnd = [e.touches[0].pageX, e.touches[0].pageY];
			}.bind(this);
			
			var onTouchmove = function (e) {
				
				e.preventDefault();
				e.stopPropagation();
				
				this.data.scrollStat = 1;
				this.data.scrollEnd  = [e.touches[0].pageX, e.touches[0].pageY];
				
				this.scroller();
			}.bind(this);
			
			var onTouchend = function (e) {
				
				if (this.data.scrollStat === 0) {
					onClick(e);
					setTimeout(viewDrawer, 100);
				}
				
				if (
					this.data.scrollDelta[0] !== 0 ||
					this.data.scrollDelta[1] !== 0
				) {
					clearTimeout(this.timer.inertiaScroll);
					var inertiaScroll = function () {
						var x = this.data.scrollDelta[0] * 0.5;
						var y = this.data.scrollDelta[1] * 0.5;
						
						if ((x > 1 || x < -1) || (y > 1 || y < -1)) {
							this.data.scrollEnd[0] += x;
							this.data.scrollEnd[1] += y;
							this.scroller();
							this.timer.inertiaScroll = setTimeout(inertiaScroll, 25);
						}
					}.bind(this);
					inertiaScroll();
				}
			}.bind(this);
			
			if (Prototype.Browser.MobileSafari) {
				this.view.content.addEventListener('touchstart', onTouchstart);
				this.view.content.addEventListener('touchmove',  onTouchmove);
				this.view.content.addEventListener('touchend',   onTouchend);
			} else {
				if (Prototype.Browser.WebKit) {
					this.view.content.addEventListener('touchstart', onTouchstart);
					this.view.content.addEventListener('touchmove',  onTouchmove);
					this.view.content.addEventListener('touchend',   onTouchend);
				}
				
				this.view.content.addEventListener('click',     onClick);
				this.view.content.addEventListener('mousedown', onMousedown);
			}
			
			window.addEventListener('keydown', onKeydown);
			var removeListenerOnUnload = function () {
				
				this.view.content.removeEventListener('touchstart', onTouchstart);
				this.view.content.removeEventListener('touchmove',  onTouchmove);
				this.view.content.removeEventListener('touchend',   onTouchend);
				
				this.view.content.removeEventListener('click',     onClick);
				this.view.content.removeEventListener('mousedown', onMousedown);
				
				window.removeEventListener('keydown', onKeydown);
				document.stopObserving('sakurapanel:pm:unload', removeListenerOnUnload);
			}.bind(this);
			document.observe('sakurapanel:pm:unload', removeListenerOnUnload);
			
			// start
			this.tick();
			
			return this;
		},//<--draw
		
		scroller: function _scroller() {
			if (
				(this.data.scrollStart[0] - this.data.scrollEnd[0] !== 0) ||
				(this.data.scrollStart[1] - this.data.scrollEnd[1] !== 0)
			) {
				this.data.scrollDelta = [
					this.data.scrollEnd[0] - this.data.scrollStart[0],
					this.data.scrollEnd[1] - this.data.scrollStart[1]
				];
				
				this.view.content.scrollLeft -= this.data.scrollDelta[0];
				this.view.content.scrollTop  -= this.data.scrollDelta[1];
				
				this.data.scrollStart = [this.data.scrollEnd[0], this.data.scrollEnd[1]];
			} else {
				this.data.scrollDelta = [0, 0];
			}
			
			return this;
		},//<--scroller
		
		tick: function _tick() {
			
			// window.requestAnimationFrame
			(
				window.requestAnimationFrame || window.mozRequestAnimationFrame ||
				window.webkitRequestAnimationFrame || window.msRequestAnimationFrame
			)(
				this.tick.bind(this)
			);
			
			this.render();
			
			return this;
		},//<--tick
		
		render: function () {
			
			var left   = this.view.content.scrollLeft - 200;
			var top    = this.view.content.scrollTop;
			var right  = left + this.view.content.getWidth() + 400;
			var bottom = top + this.view.content.getHeight();
			
			this.view.timescale.style.marginLeft = (left + 200) + 'px';
			this.view.head.style.marginLeft = '-' + (left + 200) + 'px';
			
			this.data.pieces.forEach(function (a, i) {
				// 表示範囲か
				if (
					(a.posX > left) &&
					(a.posY > top || a.posY + a.height > top) &&
					(a.posX < right) &&
					(a.posY < bottom || a.posY + a.height < bottom)
				) {
					if (typeof a._rect === 'undefined') {
						a._rect              = flagrate.createElement('div');
						a._rect.className    = 'rect bg-cat-' + a.program.category + ((this.categories.indexOf(a.program.category) === -1) ? ' muted' : '');
						a._rect.style.left   = a.posX + 'px';
						a._rect.style.top    = a.posY + 'px';
						a._rect.style.width  = a.width + 'px';
						a._rect.style.height = a.height + 'px';
						
						a._label = flagrate.createElement('div').insertText(a.program.title).insertTo(a._rect);
						
						a._rect.title = a.program.fullTitle;
						
						a._rect.setAttribute('rel', a.id);
						
						if (a.isReserved)  { a._rect.addClassName('reserved'); }
						if (a.isRecording) { a._rect.addClassName('recording'); }
						
						if (Prototype.Browser.MobileSafari) {
							clearTimeout(this.timer['appendChild_' + a.id]);
							this.timer['appendChild_' + a.id] = setTimeout(function () {
								this.view.board.appendChild(a._rect);
							}.bind(this), 100);
						} else {
							this.view.board.appendChild(a._rect);
							
							var contextMenuItems = [
								{
									label   : 'ルール作成...',
									icon    : './icons/regular-expression.png',
									onSelect: function () {
										new chinachu.ui.CreateRuleByProgram(a.program.id);
									}
								},
								'------------------------------------------',
								{
									label   : 'ツイート...',
									icon    : 'https://abs.twimg.com/favicons/favicon.ico',
									onSelect: function () {
										var left = (screen.width - 640) / 2;
										var top  = (screen.height - 265) / 2;
										
										var tweetWindow = window.open(
											'https://twitter.com/share?url=&text=' + encodeURIComponent(chinachu.util.scotify(a.program)),
											'chinachu-tweet-' + a.program.id,
											'width=640,height=265,left=' + left + ',top=' + top + ',menubar=no'
										);
									}
								},
								'------------------------------------------',
								{
									label   : 'SCOT形式でコピー...',
									onSelect: function (e) {
										window.prompt('コピーしてください:', chinachu.util.scotify(a.program));
									}
								},
								{
									label   : 'IDをコピー...',
									onSelect: function () {
										window.prompt('コピーしてください:', a.program.id);
									}
								},
								{
									label   : 'タイトルをコピー...',
									onSelect: function () {
										window.prompt('コピーしてください:', a.program.title);
									}
								},
								{
									label   : '説明をコピー...',
									onSelect: function () {
										window.prompt('コピーしてください:', a.program.detail);
									}
								},
								'------------------------------------------',
								{
									label   : '関連サイト',
									icon    : './icons/document-page-next.png',
									onSelect: function () {
										window.open("https://www.google.com/search?btnI=I'm+Feeling+Lucky&q=" + a.program.title);
									}
								},
								{
									label   : 'Google検索',
									icon    : './icons/ui-search-field.png',
									onSelect: function () {
										window.open("https://www.google.com/search?q=" + a.program.title);
									}
								},
								{
									label   : 'Wikipedia',
									icon    : './icons/book-open-text-image.png',
									onSelect: function () {
										window.open("https://ja.wikipedia.org/wiki/" + a.program.title);
									}
								}
							];
							
							if (a.isReserved) {
								if (a.isManualReserved) {
									contextMenuItems.unshift({
										label   : '予約取消...',
										icon    : './icons/cross-script.png',
										onSelect: function () {
											new chinachu.ui.Unreserve(a.program.id);
										}
									});
								}
								
								if (a.isSkip) {
									a._rect.addClassName('skip');
									contextMenuItems.unshift({
										label   : 'スキップの取消...',
										icon    : './icons/tick-circle.png',
										onSelect: function () {
											new chinachu.ui.Unskip(a.program.id);
										}
									});
								} else {
									contextMenuItems.unshift({
										label   : 'スキップ...',
										icon    : './icons/exclamation-red.png',
										onSelect: function () {
											new chinachu.ui.Skip(a.program.id);
										}
									});
								}
							} else {
								contextMenuItems.unshift({
									label   : '予約...',
									icon    : './icons/plus-circle.png',
									onSelect: function () {
										new chinachu.ui.Reserve(a.program.id);
									}
								});
							}
							
							if (a.isRecording) {
								contextMenuItems.unshift({
									label   : '録画中止...',
									icon    : './icons/cross.png',
									onSelect: function () {
										new chinachu.ui.StopRecord(a.program.id);
									}
								});
							}
							
							new flagrate.ContextMenu({
								target: a._rect,
								items : contextMenuItems
							});
						}
						
						a.isVisible = true;
					}
					
					if (a.isVisible === false) {
						if (Prototype.Browser.MobileSafari) {
							clearTimeout(this.timer['show_' + a.id]);
							this.timer['show_' + a.id] = setTimeout(function () {
								a._rect.style.display = '';
							}.bind(this), 100);
						} else {
							a._rect.style.display = '';
						}
						a.isVisible = true;
					}
					
					if (a.isVisible === true) {
						//if (a.posX - top
						//console.log(top, a.posY);
					}
					
					if (this.data.target !== null && this.data.target.id === a.id) {
						a._rect.addClassName('spot');
					} else if (a._rect.hasClassName('spot') === true) {
						a._rect.removeClassName('spot');
					}
				} else {
					if (a._rect && a.isVisible === true) {
						if (Prototype.Browser.MobileSafari) {
							clearTimeout(this.timer['hide_' + a.id]);
							this.timer['hide_' + a.id] = setTimeout(function () {
								a._rect.style.display = 'none';
							}.bind(this), 100);
						} else {
							a._rect.style.display = 'none';
						}
						a.isVisible = false;
					}
				}
			}.bind(this));
			
			this.view.clock.innerHTML = (
				chinachu.dateToString(
					new Date(this.time + (this.view.content.scrollTop * 1000 * 1000 / this.unitlen))
				)
			);
			
			return this;
		}//<--render
	});
}());