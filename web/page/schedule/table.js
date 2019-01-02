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
			document.observe('chinachu:reserves', this.onNotify);

			return this;
		},

		deinit: function () {

			document.stopObserving('chinachu:schedule', this.onNotify);
			document.stopObserving('chinachu:reserves', this.onNotify);

			this.tick = flagrate.emptyFunction;
			this.draw = flagrate.emptyFunction;
			if (this.view.drawerDt) { this.view.drawerDt.remove(); }

			return this;
		},

		refresh: function () {

			document.fire('sakurapanel:pm:unload');

			clearTimeout(this.timer.reloading);
			this.timer.reloading = setTimeout(function () {
				if (this.view.drawerDt) { this.view.drawerDt.remove(); }

				this.time = new Date().getTime();
				this.draw();
			}.bind(this), 50);

			return this;
		},

		initToolbar: function () {

			var date = new Date(this.time);
			var days = ['日', '月', '火', '水', '木', '金', '土'];

			this.view.toolbar.add({
				key: 'type-gr',
				ui : flagrate.createCheckbox({
					label: 'GR',
					onChange: function (e) {
						var types = JSON.parse(localStorage.getItem('schedule.visible.types') || '["GR","BS","CS","SKY"]');

						if (e.targetCheckbox.isChecked()) {
							types.push('GR');
						} else {
							types = types.without('GR');
						}
						localStorage.setItem('schedule.visible.types', JSON.stringify(types));

						this.refresh();
					}.bind(this)
				}).disable()
			});

			this.view.toolbar.add({
				key: 'type-bs',
				ui : flagrate.createCheckbox({
					label: 'BS',
					onChange: function (e) {
						var types = JSON.parse(localStorage.getItem('schedule.visible.types') || '["GR","BS","CS","SKY"]');

						if (e.targetCheckbox.isChecked()) {
							types.push('BS');
						} else {
							types = types.without('BS');
						}
						localStorage.setItem('schedule.visible.types', JSON.stringify(types));

						this.refresh();
					}.bind(this)
				}).disable()
			});

			this.view.toolbar.add({
				key: 'type-cs',
				ui : flagrate.createCheckbox({
					label: 'CS',
					onChange: function (e) {
						var types = JSON.parse(localStorage.getItem('schedule.visible.types') || '["GR","BS","CS","SKY"]');

						if (e.targetCheckbox.isChecked()) {
							types.push('CS');
						} else {
							types = types.without('CS');
						}
						localStorage.setItem('schedule.visible.types', JSON.stringify(types));

						this.refresh();
					}.bind(this)
				}).disable()
			});

			this.view.toolbar.add({
				key: 'type-sky',
				ui : flagrate.createCheckbox({
					label: 'SKY',
					onChange: function (e) {
						var types = JSON.parse(localStorage.getItem('schedule.visible.types') || '["GR","BS","CS","SKY"]');

						if (e.targetCheckbox.isChecked()) {
							types.push('SKY');
						} else {
							types = types.without('SKY');
						}
						localStorage.setItem('schedule.visible.types', JSON.stringify(types));

						this.refresh();
					}.bind(this)
				}).disable()
			});

			this.view.toolbar.add({
				key: 'day+0',
				ui : new sakura.ui.Button({
					className: 'day',
					label  : (date.getMonth() + 1) + '/' + date.getDate() + '(' + days[date.getDay()] + ') ' + date.getHours() + '時~',
					onClick: function () {
						this.self.query.day = '0';
						location.hash = '!/schedule/table/' + Object.toQueryString(this.self.query) + '/';
					}.bind(this)
				})
			});
			this.view.toolbar.add({
				key: 'day+1',
				ui : new sakura.ui.Button({
					className: 'day',
					label  : (new Date(this.time + 86400000).getDate()) + '(' + days[new Date(this.time + 86400000).getDay()] + ')',
					onClick: function () {
						this.self.query.day = '1';
						location.hash = '!/schedule/table/' + Object.toQueryString(this.self.query) + '/';
					}.bind(this)
				})
			});
			this.view.toolbar.add({
				key: 'day+2',
				ui : new sakura.ui.Button({
					className: 'day',
					label  : (new Date(this.time + 172800000).getDate()) + '(' + days[new Date(this.time + 172800000).getDay()] + ')',
					onClick: function () {
						this.self.query.day = '2';
						location.hash = '!/schedule/table/' + Object.toQueryString(this.self.query) + '/';
					}.bind(this)
				})
			});
			this.view.toolbar.add({
				key: 'day+3',
				ui : new sakura.ui.Button({
					className: 'day',
					label  : (new Date(this.time + 259200000).getDate()) + '(' + days[new Date(this.time + 259200000).getDay()] + ')',
					onClick: function () {
						this.self.query.day = '3';
						location.hash = '!/schedule/table/' + Object.toQueryString(this.self.query) + '/';
					}.bind(this)
				})
			});
			this.view.toolbar.add({
				key: 'day+4',
				ui : new sakura.ui.Button({
					className: 'day',
					label  : (new Date(this.time + 345600000).getDate()) + '(' + days[new Date(this.time + 345600000).getDay()] + ')',
					onClick: function () {
						this.self.query.day = '4';
						location.hash = '!/schedule/table/' + Object.toQueryString(this.self.query) + '/';
					}.bind(this)
				})
			});
			this.view.toolbar.add({
				key: 'day+5',
				ui : new sakura.ui.Button({
					className: 'day',
					label  : (new Date(this.time + 432000000).getDate()) + '(' + days[new Date(this.time + 432000000).getDay()] + ')',
					onClick: function () {
						this.self.query.day = '5';
						location.hash = '!/schedule/table/' + Object.toQueryString(this.self.query) + '/';
					}.bind(this)
				})
			});
			this.view.toolbar.add({
				key: 'day+6',
				ui : new sakura.ui.Button({
					className: 'day',
					label  : (new Date(this.time + 518400000).getDate()) + '(' + days[new Date(this.time + 518400000).getDay()] + ')',
					onClick: function () {
						this.self.query.day = '6';
						location.hash = '!/schedule/table/' + Object.toQueryString(this.self.query) + '/';
					}.bind(this)
				})
			});

			this.view.toolbar.add({
				key: 'config',
				ui : new sakura.ui.Button({
					label  : '設定',
					icon   : './icons/wrench-screwdriver.png',
					onClick: function () {

						var form = flagrate.createForm({
							fields: [
								{
									key: 'categories',
									label: '表示ジャンル',
									input: {
										type : 'checkboxes',
										val  : JSON.parse(localStorage.getItem('schedule.visible.categories') || '["anime", "information", "news", "sports", "variety", "drama", "music", "cinema", "theater", "hobby", "welfare", "documentary", "etc"]'),
										items: [
											'anime', 'information', 'news', 'sports', 'variety', 'documentary',
											'drama', 'music', 'cinema', 'theater', 'hobby', 'welfare', 'etc'
										]
									}
								},
								{
									key  : 'hideChannels',
									label: '隠すCH',
									input: {
										type : 'checkboxes',
										val  : JSON.parse(localStorage.getItem('schedule.hide.channels') || '[]'),
										items: global.chinachu.schedule.map(function (a) {
											return {
												label: a.name,
												value: a.id
											};
										})
									}
								}
							]
						});

						flagrate.createModal({
							title: '番組表設定',
							content: form.element,
							buttons: [
								{
									label: '適用',
									color: '@pink',
									onSelect: function (e, modal) {

										var result = form.getResult();

										localStorage.setItem('schedule.visible.categories', JSON.stringify(result.categories));
										localStorage.setItem('schedule.hide.channels', JSON.stringify(result.hideChannels));

										this.refresh();
										modal.close();
									}.bind(this)
								},
								{
									label: 'キャンセル'.__(),
									onSelect: function (e, modal) {
										modal.close();
									}
								}
							]
						}).open();
					}.bind(this)
				})
			});

			return this;
		},

		draw: function () {

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
			this.data.scrollDelta = [0, 0];
			this.data.target      = null;

			var unitlen = this.unitlen = 50;
			var linelen      = 140;
			var types        = JSON.parse(window.localStorage.getItem('schedule.visible.types') || '["GR", "BS", "CS", "SKY"]');
			var categories   = this.categories = JSON.parse(window.localStorage.getItem('schedule.visible.categories') || '["anime", "information", "news", "sports", "variety", "drama", "theater", "hobby", "welfare", "documentary", "music", "cinema", "etc"]');
			var hideChannels = JSON.parse(window.localStorage.getItem('schedule.hide.channels') || "[]");

			var day = 0;
			if (this.self.query.day) {
				day = parseInt(this.self.query.day, 10);
				if (day < 0 && day > 6) {
					day = 0;
				}
			}
			this.view.toolbar.one('day+' + day).entity.addClassName('selected');
			var timeRangeStart = this.time + 86400000 * day;
			var timeRangeEnd   = timeRangeStart + 86400000;

			var total  = 0;
			var count  = 0;
			var maxlen = this.time + 86400000 + 3600000;
			var maxH   = (maxlen - this.time) / 1000 / 1000 * unitlen;

			var piece  = this.data.piece  = {};// piece of canvas programs
			var pieces = this.data.pieces = [];// array of program pieces

			var k = 0;

			this.view.head = flagrate.createElement('div', {'class': 'head'}).insertTo(this.view.content);

			// ツールバー
			if (types.indexOf('GR') !== -1) { this.view.toolbar.one('type-gr').check(); }
			if (types.indexOf('BS') !== -1) { this.view.toolbar.one('type-bs').check(); }
			if (types.indexOf('CS') !== -1) { this.view.toolbar.one('type-cs').check(); }
			if (types.indexOf('SKY') !== -1) { this.view.toolbar.one('type-sky').check(); }
			this.view.toolbar.one('type-gr').enable();
			this.view.toolbar.one('type-bs').enable();
			this.view.toolbar.one('type-cs').enable();
			this.view.toolbar.one('type-sky').enable();

			global.chinachu.schedule.forEach(function (channel, i) {
				if (channel.programs.length === 0) { return; }
				if (types.indexOf(channel.type) === -1) { return; }
				if (hideChannels.indexOf(channel.id) !== -1) { return; }

				var x = k;

				var posX   = (5 + x * (5 + linelen));
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
					if (program.end + 7200000 < timeRangeStart || program.start > timeRangeEnd + 3600000) {
						return;
					}

					var posY   = Math.floor((program.start - timeRangeStart) / 1000 / 1000 * unitlen + 100);
					var height = Math.floor(program.seconds / 1000 * unitlen);

					if (posY > maxH) {
						return;
					} else if (posY + height > maxH) {
						height = maxH - posY;
					}

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
				if (program.isConflict) {
					piece[program.id].isConflict = true;
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

			this.view.timescale.setStyle({'height': maxH + 20 + 'px'});


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
						}).insert(date.getHours())
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
				}
			}

			// 日付上下移動ボタン
			if (day > 0) {
				flagrate.createButton({
					label: '▲',
					color: '@inverse',
					className: 'prev',
					onSelect: function () {
						this.self.query.day = day - 1;
						location.hash = '!/schedule/table/' + Object.toQueryString(this.self.query) + '/';
					}.bind(this)
				}).insertTo(this.view.timescale);
			}
			if (day < 6) {
				flagrate.createButton({
					label: '▼',
					color: '@inverse',
					className: 'next',
					onSelect: function () {
						this.self.query.day = day + 1;
						location.hash = '!/schedule/table/' + Object.toQueryString(this.self.query) + '/';
					}.bind(this)
				}).insertTo(this.view.timescale);
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

				this.view.drawerBody.insert('<div class="title"><span class="label-cat-' + this.data.target.category + '">' + this.data.target.category + '</span> ' + this.data.target.title + '</div>');
				this.view.drawerBody.insert('<div class="detail">' + (this.data.target.detail || '').truncate(100) + '</div>');
				this.view.drawerBody.insert('<div class="id">' + this.data.target.id + '</div>');

				this.view.drawerFoot.update(
					new flagrate.Button({
						label   : '番組詳細',
						color   : '@pink',
						onSelect: function () {
							location.hash = '!/program/view/id=' + this.data.target.id + '/';
						}.bind(this)
					})
				);
			}.bind(this);

			//
			// イベントとか
			//
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
						viewDrawer();
					}
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

				if (e.buttons !== 1 && e.buttons !== undefined) {
					return;
				}

				e.preventDefault();
				e.stopPropagation();

				this.data.scrollStat  = [e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY].join(',');
				this.data.scrollStart = this.data.scrollEnd = [e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY];

				window.addEventListener('ontouchend' in document ? 'touchmove' : 'pointermove', onMousemove, { passive: false });
				window.addEventListener('ontouchend' in document ? 'touchend' : 'pointerup',   onMouseup, { passive: false });
				// window.addEventListener('touchmove', onMousemove, true);

				this.scroller();

				var targetId = e.target.getAttribute('rel') || (e.target.parentNode || e.target.parentElement).getAttribute('rel') || (e.target.parentNode.parentNode || e.target.parentElement.parentElement).getAttribute('rel') || null;

				if (targetId === null) {
					this.data.target = null;
				} else {
					this.data.target = piece[targetId].program;
				}
			}.bind(this);

			var onMousemove = function (e) {

				if (e.buttons === 0) {
					onMouseup(e);
					return;
				}

				e.preventDefault();
				e.stopPropagation();

				if ('clientX' in e || 0 < e.touches.length) this.data.scrollEnd = [e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY];

				this.scroller();
			}.bind(this);

			var onMouseup = function (e) {

				e.preventDefault();
				e.stopPropagation();

				if (this.data.scrollStat === [e.clientX || e.changedTouches[0].clientX, e.clientY || e.changedTouches[0].clientY].join(',')) {

					if (e.buttons === 2) {
						this.view.popoverDrawer.close();
					} else {
						if (window.innerWidth < 640) {
							if (this.data.target) {
								location.hash = '!/program/view/id=' + this.data.target.id + '/';
							}
						} else {
							setTimeout(viewDrawer, 25);
						}
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

				window.removeEventListener('ontouchend' in document ? 'touchmove' : 'pointermove', onMousemove, { passive: false });
				window.removeEventListener('ontouchend' in document ? 'touchend' : 'pointerup',   onMouseup, { passive: false });
			}.bind(this);

			this.view.content.addEventListener('ontouchend' in document ? 'touchstart' : 'pointerdown', onMousedown);

			window.addEventListener('keydown', onKeydown);
			var removeListenersOnUnload = function () {

				this.view.content.removeEventListener('ontouchend' in document ? 'touchstart' : 'pointerdown', onMousedown);

				window.removeEventListener('keydown', onKeydown);

				document.stopObserving('sakurapanel:pm:unload', removeListenersOnUnload);
			}.bind(this);
			document.observe('sakurapanel:pm:unload', removeListenersOnUnload);

			if (!this.started) {
				this.started = true;

				// start
				this.tick();
			}

			return this;
		},//<--draw

		scroller: function () {
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

		tick: function () {

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

			this.view.hand.entity.style.top = Math.round((Date.now() - this.time) / 1000 / 1000 * this.unitlen + 100) + 'px';

			this.data.pieces.forEach(function (a, i) {
				// 表示範囲か
				if (
					(a.posX > left) &&
					(a.posY > top || a.posY + a.height > top) &&
					(a.posX < right) &&
					(a.posY < bottom || a.posY + a.height < bottom)
				) {
					if (typeof a._rect === 'undefined') {
						var date = new Date(a.program.start);

						a._rect              = flagrate.createElement('div');
						a._rect.className    = 'rect bg-cat-' + a.program.category + ((this.categories.indexOf(a.program.category) === -1) ? ' muted' : '');
						a._rect.style.left   = a.posX + 'px';
						a._rect.style.top    = a.posY + 'px';
						a._rect.style.width  = a.width + 'px';
						a._rect.style.height = a.height + 'px';

						a._label = flagrate.createElement('div').insert(
							flagrate.createElement('h4').insertText(
								date.getHours().toPaddedString(2) + ':' + date.getMinutes().toPaddedString(2) + ' ' + a.program.title
							)
						).insert(
							flagrate.createElement('div').insert(
								a.program.flags.invoke('sub', /.+/, '<span rel="' + a.id+ '" class="#{0}">#{0}</span>').join('')
							)
						).insert(
							flagrate.createElement('span').insertText(a.program.detail.truncate(200))
						).insertTo(a._rect);

						a._rect.title = a.program.fullTitle;

						a._rect.setAttribute('rel', a.id);

						if (a.isReserved)  { a._rect.addClassName('reserved'); }
						if (a.isRecording) { a._rect.addClassName('recording'); }

						this.view.board.appendChild(a._rect);

						if (!Prototype.Browser.MobileSafari) {
							var contextMenuItems = [
								{
									label   : 'ルール作成...',
									icon    : './icons/regular-expression.png',
									onSelect: function () {
										var dummy = new chinachu.ui.CreateRuleByProgram(a.program.id);
									}
								},
								'------------------------------------------',
								{
									label   : 'ツイート...',
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
									onSelect: function(e) {
										chinachu.ui.copyStr(chinachu.util.scotify(a.program));
									}
								},
								{
									label   : 'IDをコピー...',
									onSelect: function() {
										chinachu.ui.copyStr(a.program.id);
									}
								},
								{
									label   : 'タイトルをコピー...',
									onSelect: function() {
										chinachu.ui.copyStr(a.program.title);
									}
								},
								{
									label   : '説明をコピー...',
									onSelect: function() {
										chinachu.ui.copyStr(a.program.detail);
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
											var dummy = new chinachu.ui.Unreserve(a.program.id);
										}
									});
								} else if (a.isSkip) {
									a._rect.addClassName('skip');
									contextMenuItems.unshift({
										label   : 'スキップの取消...',
										icon    : './icons/tick-circle.png',
										onSelect: function () {
											var dummy = new chinachu.ui.Unskip(a.program.id);
										}
									});
								} else {
									contextMenuItems.unshift({
										label   : 'スキップ...',
										icon    : './icons/exclamation-red.png',
										onSelect: function () {
											var dummy = new chinachu.ui.Skip(a.program.id);
										}
									});
								}
								if (a.isConflict) {
									a._rect.addClassName('conflict');
								}
							} else {
								contextMenuItems.unshift({
									label   : '予約...',
									icon    : './icons/plus-circle.png',
									onSelect: function () {
										var dummy = new chinachu.ui.Reserve(a.program.id);
									}
								});
							}

							if (a.isRecording) {
								contextMenuItems.unshift({
									label   : '録画中止...',
									icon    : './icons/cross.png',
									onSelect: function () {
										var dummy = new chinachu.ui.StopRecord(a.program.id);
									}
								});
							}

							flagrate.createContextMenu({
								target: a._rect,
								items : contextMenuItems
							});
						}

						a.isVisible = true;
					}

					if (a.isVisible === false) {
						a._rect.style.display = '';
						a.isVisible = true;
					}

					if (this.data.target !== null && this.data.target.id === a.id) {
						a._rect.addClassName('spot');
					} else if (a._rect.hasClassName('spot') === true) {
						a._rect.removeClassName('spot');
					}
				} else {
					if (a._rect && a.isVisible === true) {
						a._rect.style.display = 'none';
						a.isVisible = false;
					}
				}
			}.bind(this));

			return this;
		}//<--render
	});
}());
