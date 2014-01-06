P = Class.create(P, {
	
	init: function _initPage() {
		
		this.view.content.className = 'loading';
		
		this.time = new Date().getTime();
		
		this.initToolbar();
		this.draw();
		
		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:schedule', this.onNotify);
		
		return this;
	},
	
	deinit: function _deinit() {
		
		document.stopObserving('chinachu:schedule', this.onNotify);
		
		this.tick = Prototype.emptyFunction;
		if (this.view.drawerDt) this.view.drawerDt.remove();
		if (this.view.clock) this.view.clock.remove();
		
		return this;
	},
	
	refresh: function _refresh() {
		
		document.stopObserving('chinachu:schedule', this.onNotify);
		
		this.app.pm.realizeHash(true);
		
		return this;
	},
	
	initToolbar: function _initToolbar() {
		
		/*
		this.view.toolbar.add({
			key: 'yesterday',
			ui : new sakura.ui.Button({
				label  : 'TO {0}'.__('YESTERDAY'.__()),
				icon   : './icons/arrow-180-medium.png',
				onClick: function() {
					
				}.bind(this)
			})
		});
		
		this.view.toolbar.add({
			key: 'tomorrow',
			ui : new sakura.ui.Button({
				label  : 'TO {0}'.__('TOMORROW'.__()),
				icon   : './icons/arrow-000-medium.png',
				onClick: function() {
					
				}.bind(this)
			})
		});
		
		this.view.toolbar.add({
			key: 'config',
			ui : new sakura.ui.Button({
				label  : 'CONFIG {0}'.__('VIEW'.__()),
				icon   : './icons/wrench-screwdriver.png',
				onClick: function() {
					
				}.bind(this)
			})
		});
		*/
		
		return this;
	},
	
	draw: function _draw() {
		
		this.view.clock = new sakura.ui.Container({className: 'clock'}).render(this.app.view.mainHead);
		
		this.view.content.className = 'fullscreen timeline noscroll';
		this.view.content.update();
		
		this.view.board  = new sakura.ui.Container({className: 'board'}).render(this.view.content);
		
		if (global.chinachu.schedule.length === 0) {
			return;
		}
		
		//this.data.scrolls     = eval(window.sessionStorage.getItem('schedule-param-scrolls') || "[0, 0]");
		var isScrolling = false;
		this.data.scrollStart = [0, 0];
		this.data.scrollEnd   = [0, 0];
		this.data.target      = null;
		
		var unitlen = this.unitlen = 25;
		var linelen      = 25;
		var types        = eval(window.localStorage.getItem('schedule-param-types') || "['GR','BS','CS','EX']");
		var categories = this.categories = eval(window.localStorage.getItem('schedule-param-categories') || "['anime', 'information', 'news', 'sports', 'variety', 'drama', 'music', 'cinema', 'etc']");
		var hideChannels = eval(window.localStorage.getItem('schedule-param-hide-channels') || "[]");
		
		var total  = 0;
		var count  = 0;
		var maxlen = 0;
		
		var piece  = this.data.piece  = {};// piece of canvas programs
		var pieces = this.data.pieces = [];// array of program pieces
		
		var k = 0;
		
		this.view.head = new sakura.ui.Container({className: 'head'}).render(this.view.content);
		
		global.chinachu.schedule.forEach(function(channel, i) {
			if (channel.programs.length === 0) return;
			if (types.indexOf(channel.type) === -1) return;
			if (hideChannels.indexOf(channel.id) !== -1) return;
			
			var y = k;
			
			var posY   = (5 + y * (5 + linelen));
			var height = linelen;
			
			var ch = new sakura.ui.Container({
				style: {
					top   : posY + 'px',
					height: height + 'px'
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
			
			ch.entity.observe('click', function() {
				console.log(channel);
				window.location.hash = '!/search/top/skip=1&chid=' + channel.id + '/';
			});
			
			channel.programs.forEach(function(program, j) {
				if ((program.end - this.time) < 0) {
					channel.programs = channel.programs.without(program);
					return;
				}
				//if ((program.start - this.time) > 1000 * 60 * 60 * 24) {
				//	channel.programs = channel.programs.without(program);
				//	return;
				//}
				
				var posX  = Math.floor(1 + (program.start - this.time) / 1000 / 1000 * unitlen + 150);
				var width = Math.floor(program.seconds / 1000 * unitlen - 1);
				
				if (maxlen < program.end) maxlen = program.end;
				
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
		
		global.chinachu.reserves.forEach(function(program) {
			if (typeof piece[program.id] === 'undefined') return;
			
			piece[program.id].isReserved = true;
			
			if (program.isManualReserved) piece[program.id].isManualReserved = true;
			if (program.isSkip)           piece[program.id].isSkip = true;
		});
		
		global.chinachu.recording.forEach(function(program) {
			if (typeof piece[program.id] === 'undefined') return;
			
			piece[program.id].isRecording = true;
		});
		
		// 現在時刻表示線
		this.view.hand = new sakura.ui.Container({className: 'handline'}).render(this.view.board);
		this.view.hand.entity.style.left   = 150 + 'px';
		this.view.hand.entity.style.height = (5 + k * (5 + linelen)) + 'px'; 
		
		// スケール
		this.view.timescale = new sakura.ui.Container({className: 'timescale'}).render(this.view.content);
		
		var ld  = -1;
		var lm  = -1;
		
		for (var i = this.time, lim = this.time + 60000 * 12000; maxlen > i && lim > i; i += 60000) {
			var date = new Date(i);
			var d    = date.getDate();
			var m    = date.getMinutes();
			
			if ((m === 0) && (lm !== m) && (ld === d)) {
				lm = m;
				
				this.view.timescale.insert(
					new Element('div', { className: 'long h' + date.getHours() }).setStyle({
						left: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
					}).insert(date.getHours() + 'h')
				);
			}
			
			if ((m === 30) && (lm !== m)) {
				lm = m;
				
				this.view.timescale.insert(
					new Element('div', { className: 'middle' }).setStyle({
						left: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
					})
				);
			}
			
			if (((m === 10) || (m === 20) || (m === 40) || (m === 50)) && (lm !== m)) {
				lm = m;
				
				this.view.timescale.insert(
					new Element('div', { className: 'short' }).setStyle({
						left: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
					})
				);
			}
			
			if (ld !== d) {
				ld = d;
				
				(m === 0) && new sakura.ui.Container({
					className: 'cutline',
					style    : {
						left  : (150 + (i - this.time) / 1000 / 1000 * unitlen) + 'px',
						height: (5 + k * (5 + linelen)) + 'px'
					}
				}).render(this.view.board);
				
				(m === 0) && this.view.timescale.insert(
					new Element('div', { className: 'long h' + date.getHours() + ' date' }).setStyle({
						left: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
					}).insert(d + 'd')
				);
				
				(m !== 0) && this.view.timescale.insert(
					new Element('div', { className: 'date' }).setStyle({
						left: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
					}).insert(d + 'd')
				);
			}
		}
		
		// drawer
		this.view.drawer = new sakura.ui.Container({className: 'drawer hide'}).render(this.view.content);
		this.view.drawerHead = new sakura.ui.Container({className: 'head'}).render(this.view.drawer);
		this.view.drawerBody = new sakura.ui.Container({className: 'body'}).render(this.view.drawer);
		this.view.drawerFoot = new sakura.ui.Container({className: 'foot'}).render(this.view.drawer);
		
		// events
		var viewDrawer = function() {
			
			if (this.data.target === null) {
				this.view.drawer.entity.addClassName('hide');
				return;
			}
			
			this.view.drawer.entity.removeClassName('hide');
			
			this.view.drawerHead.update();
			
			this.view.drawerHead.insert(
				'<div class="date">' +
				dateFormat(this.data.target.start, 'mm/dd HH:MM') +
				'<small>&plus;' + (this.data.target.seconds/ 60) +
				'min</small></div>'
			);
			
			if (this.view.drawerDt) this.view.drawerDt.remove();
			this.view.drawerDt = new chinachu.ui.DynamicTime({
				tagName: 'span',
				type   : 'delta',
				time   : this.data.target.start
			});
			
			this.view.drawerHead.insert(this.view.drawerDt);
			
			this.view.drawerHead.insert(' <span class="channel">' + this.data.target.channel.type + ': ' + this.data.target.channel.name + '</span>');
			
			this.view.drawerBody.update();
			
			this.view.drawerBody.insert('<div class="title"><span class="bg-cat-' + this.data.target.category + '">' + this.data.target.category + '</span>' + this.data.target.title + '</div>');
			this.view.drawerBody.insert('<div class="detail">' + (this.data.target.detail || '') + '</div>');
			this.view.drawerBody.insert('<div class="id">' + this.data.target.id + '</div>');
			
			this.view.drawerFoot.update(
				new flagrate.Button({
					label   : '番組詳細',
					color   : '@pink',
					onSelect: function() {
						window.location.hash = '!/program/view/id=' + this.data.target.id + '/';
					}.bind(this)
				})
			);
		}.bind(this);
		
		var onClick = function(e) {
			
			var targetId = e.target.getAttribute('rel') || (e.target.parentNode || e.target.parentElement).getAttribute('rel') || null;
			
			this.data.target = null;
			
			if (targetId === null) {
				return;
			};
			
			this.data.target = piece[targetId].program;
		}.bind(this);
		
		var onMousewheel = function(e) {
			
			e.preventDefault();
			e.stopPropagation();
			
			var deltaX = 0;
			var deltaY = 0;
			
			if (e.wheelDeltaX) deltaX = e.wheelDeltaX / 2;
			if (e.wheelDeltaY) deltaY = e.wheelDeltaY / 2;
			
			if (e.deltaX) deltaX = -(e.deltaX * 20);
			if (e.deltaY) deltaY = -(e.deltaY * 20);
			
			this.data.scrollStat  = 0;
			this.data.scrollStart = [0, 0];
			this.data.scrollEnd   = [0, 0];
			this.data.scrollDelta = [deltaX, deltaY];
			
			clearTimeout(this.timer.inertiaScroll);
			var inertiaScroll = function() {
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
		
		var onKeydown = function(e) {
			
			var deltaX = 0;
			var deltaY = 0;
			
			if (e.keyCode === 37 || e.keyCode === 65) deltaX = 40;
			if (e.keyCode === 38 || e.keyCode === 87) deltaY = 40;
			if (e.keyCode === 39 || e.keyCode === 68) deltaX = -40;
			if (e.keyCode === 40 || e.keyCode === 83) deltaY = -40;
			
			if (this.data.target !== null) {
				if (e.keyCode === 27) {
					this.data.target = null;
				}
				
				if (e.keyCode === 37 || e.keyCode === 65) {
					this.data.target = chinachu.util.getPrevProgramById(this.data.target.id);
					deltaX = this.data.piece[this.data.target.id]._rect.getWidth() * 0.365 + 1;
				}
				
				if (e.keyCode === 39 || e.keyCode === 68) {
					deltaX = -(this.data.piece[this.data.target.id]._rect.getWidth() * 0.365 + 1);
					this.data.target = chinachu.util.getNextProgramById(this.data.target.id);
				}
				
				viewDrawer();
			}
			
			this.data.scrollStat  = 0;
			this.data.scrollStart = [0, 0];
			this.data.scrollEnd   = [0, 0];
			this.data.scrollDelta = [deltaX, deltaY];
			
			clearTimeout(this.timer.inertiaScroll);
			var inertiaScroll = function() {
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
		
		var onMousedown = function(e) {
			
			e.preventDefault();
			e.stopPropagation();
			
			this.data.scrollStat  = [e.clientX, e.clientY].join(',');
			this.data.scrollStart = this.data.scrollEnd = [e.clientX, e.clientY];
			
			$(document.body).observe('mousemove', onMousemove);
			$(document.body).observe('mouseup',   onMouseup);
			
			this.scroller();
		}.bind(this);
		
		var onMousemove = function(e) {
			
			e.preventDefault();
			e.stopPropagation();
			
			this.data.scrollEnd = [e.clientX, e.clientY];
			
			this.scroller();
		}.bind(this);
		
		var onMouseup = function(e) {
			
			e.preventDefault();
			e.stopPropagation();
			
			if (this.data.scrollStat === [e.clientX, e.clientY].join(',')) {
				setTimeout(viewDrawer, 25);
			}
			
			if (
				this.data.scrollDelta[0] !== 0 ||
				this.data.scrollDelta[1] !== 0
			) {
				clearTimeout(this.timer.inertiaScroll);
				var inertiaScroll = function() {
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
			
			$(document.body).stopObserving('mousemove', onMousemove);
			$(document.body).stopObserving('mouseup',   onMouseup);
		}.bind(this);
		
		var onTouchstart = function(e) {
			
			this.data.scrollStat  = 0;
			this.data.scrollStart = this.data.scrollEnd = [e.touches[0].pageX, e.touches[0].pageY];
		}.bind(this);
		
		var onTouchmove = function(e) {
			
			e.preventDefault();
			e.stopPropagation();
			
			this.data.scrollStat = 1;
			this.data.scrollEnd  = [e.touches[0].pageX, e.touches[0].pageY];
			
			this.scroller();
		}.bind(this);
		
		var onTouchend = function(e) {
			
			if (this.data.scrollStat === 0) {
				onClick(e);
				setTimeout(viewDrawer, 100);
			}
			
			if (
				this.data.scrollDelta[0] !== 0 ||
				this.data.scrollDelta[1] !== 0
			) {
				clearTimeout(this.timer.inertiaScroll);
				var inertiaScroll = function() {
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
			this.view.board.entity.observe('touchstart', onTouchstart);
			this.view.board.entity.observe('touchmove',  onTouchmove);
			this.view.board.entity.observe('touchend',   onTouchend);
		} else {
			if (Prototype.Browser.WebKit) {
				this.view.board.entity.observe('touchstart', onTouchstart);
				this.view.board.entity.observe('touchmove',  onTouchmove);
				this.view.board.entity.observe('touchend',   onTouchend);
				this.view.board.entity.observe('mousewheel', onMousewheel);
			}
			
			if (Prototype.Browser.Gecko) {
				this.view.board.entity.observe('wheel', onMousewheel);
			}
			
			if (Prototype.Browser.IE) {
				this.view.board.entity.addEventListener('mousewheel', onMousewheel);
			}
			
			this.view.board.entity.observe('click',      onClick);
			this.view.board.entity.observe('mousedown',  onMousedown);
		}
		
		Event.observe(window, 'keydown', onKeydown);
		var removeListenerOnUnload = function() {
			Event.stopObserving(window, 'keydown', onKeydown);
			document.stopObserving('sakurapanel:pm:unload', removeListenerOnUnload);
		};
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
			
			this.view.timescale.entity.scrollLeft = this.view.board.entity.scrollLeft -= this.data.scrollDelta[0];
			this.view.head.entity.scrollTop = this.view.board.entity.scrollTop -= this.data.scrollDelta[1];
			
			this.data.scrollStart = [this.data.scrollEnd[0], this.data.scrollEnd[1]];
			
			//console.log(delta);
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
	
	render: function _render() {
		
		var left   = this.view.board.entity.scrollLeft - 200;
		var top    = this.view.board.entity.scrollTop - 200;
		var right  = left + this.view.content.getWidth() + 400;
		var bottom = top + this.view.content.getHeight() + 400;
		
		this.data.pieces.forEach(function(a, i) {
			// 表示範囲か
			if ((a.posX > left) && (a.posY > top) && (a.posX < right) && (a.posY < bottom)) {
				if (typeof a._rect === 'undefined') {
					a._rect              = document.createElement('div');
					a._rect.className    = 'rect bg-cat-' + a.program.category + ((this.categories.indexOf(a.program.category) === -1) ? ' muted' : '');
					a._rect.style.left   = a.posX + 'px';
					a._rect.style.top    = a.posY + 'px';
					a._rect.style.width  = a.width + 'px';
					a._rect.style.height = a.height + 'px';
					a._rect.innerHTML    = '<div>' + a.program.title + '</div>';
					
					if (a.program.detail) a._rect.title = a.program.detail;
					
					a._rect.setAttribute('rel', a.id);
					
					if (a.isReserved) a._rect.addClassName('reserved');
					if (a.isRecording) a._rect.addClassName('recording');
					
					if (Prototype.Browser.MobileSafari) {
						clearTimeout(this.timer['appendChild_' + a.id]);
						this.timer['appendChild_' + a.id] = setTimeout(function() {
							this.view.board.entity.appendChild(a._rect);
						}.bind(this), 100);
					} else {
						this.view.board.entity.appendChild(a._rect);
						
						var contextMenuItems = [
							{
								label   : 'ルール作成...',
								icon    : './icons/regular-expression.png',
								onSelect: function() {
									new chinachu.ui.CreateRuleByProgram(a.program.id);
								}
							},
							'------------------------------------------',
							{
								label   : 'ツイート...',
								icon    : 'https://abs.twimg.com/favicons/favicon.ico',
								onSelect: function() {
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
								onSelect: function(e) {
									window.prompt('コピーしてください:', chinachu.util.scotify(a.program));
								}
							},
							{
								label   : 'IDをコピー...',
								onSelect: function() {
									window.prompt('コピーしてください:', a.program.id);
								}
							},
							{
								label   : 'タイトルをコピー...',
								onSelect: function() {
									window.prompt('コピーしてください:', a.program.title);
								}
							},
							{
								label   : '説明をコピー...',
								onSelect: function() {
									window.prompt('コピーしてください:', a.program.detail);
								}
							},
							'------------------------------------------',
							{
								label   : '関連サイト',
								icon    : './icons/document-page-next.png',
								onSelect: function() {
									window.open("https://www.google.com/search?btnI=I'm+Feeling+Lucky&q=" + a.program.title);
								}
							},
							{
								label   : 'Google検索',
								icon    : './icons/ui-search-field.png',
								onSelect: function() {
									window.open("https://www.google.com/search?q=" + a.program.title);
								}
							},
							{
								label   : 'Wikipedia',
								icon    : './icons/book-open-text-image.png',
								onSelect: function() {
									window.open("https://ja.wikipedia.org/wiki/" + a.program.title);
								}
							}
						];
						
						if (a.isReserved) {
							if (a.isManualReserved) {
								contextMenuItems.unshift({
									label   : '予約取消...',
									icon    : './icons/cross-script.png',
									onSelect: function() {
										new chinachu.ui.Unreserve(a.program.id);
									}
								});
							}
							
							if (a.isSkip) {
								a._rect.addClassName('skip');
								contextMenuItems.unshift({
									label   : 'スキップの取消...',
									icon    : './icons/tick-circle.png',
									onSelect: function() {
										new chinachu.ui.Unskip(a.program.id);
									}
								});
							} else {
								contextMenuItems.unshift({
									label   : 'スキップ...',
									icon    : './icons/exclamation-red.png',
									onSelect: function() {
										new chinachu.ui.Skip(a.program.id);
									}
								});
							}
						} else {
							contextMenuItems.unshift({
								label   : '予約...',
								icon    : './icons/plus-circle.png',
								onSelect: function() {
									new chinachu.ui.Reserve(a.program.id);
								}
							});
						}
						
						if (a.isRecording) {
							contextMenuItems.unshift({
								label   : '録画中止...',
								icon    : './icons/cross.png',
								onSelect: function() {
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
						this.timer['show_' + a.id] = setTimeout(function() {
							a._rect.style.display = '';
						}.bind(this), 100);
					} else {
						a._rect.style.display = '';
					}
					a.isVisible = true;
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
						this.timer['hide_' + a.id] = setTimeout(function() {
							a._rect.style.display = 'none';
						}.bind(this), 100);
					} else {
						a._rect.style.display = 'none';
					}
					a.isVisible = false;
				}
			}
		}.bind(this));
		
		this.view.clock.entity.innerHTML = (
			chinachu.dateToString(
				new Date(this.time + (this.view.board.entity.scrollLeft * 1000 * 1000 / this.unitlen))
			)
		);
		
		return this;
	}//<--render
});