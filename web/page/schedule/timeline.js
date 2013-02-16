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
	
	refresh: function _refresh() {
		document.stopObserving('chinachu:schedule', this.onNotify);
		
		this.app.pm.realizeHash(true);
		
		return this;
	},
	
	initToolbar: function _initToolbar() {
		
		this.view.toolbar.add({
			key: 'config',
			ui : new sakura.ui.Button({
				label  : 'CONFIG {0}'.__('VIEW'.__()),
				icon   : './icons/wrench-screwdriver.png',
				onClick: function() {
					
				}.bind(this)
			})
		});
		
		return this;
	},
	
	draw: function _draw() {
		this.view.content.className = 'fullscreen timeline noscroll';
		this.view.content.update();
		
		if (global.chinachu.schedule.length === 0) {
			return;
		}
		
		/*var loading = new chinachu.ui.ContentLoading({
			onComplete: function() {
				setTimeout(function() {
					loading.remove();
					loading = null;
				}, 50);
			}
		}).render(this.view.content);*/
		
		var scrolls     = eval(window.sessionStorage.getItem('schedule-param-scrolls') || "[0, 0]");
		var isScrolling = false;
		
		var unitlen      = 25;
		var linelen      = 25;
		var types        = eval(window.localStorage.getItem('schedule-param-types') || "['GR','BS','CS','EX']");
		var categories   = eval(window.localStorage.getItem('schedule-param-categories') || "['anime', 'information', 'news', 'sports', 'variety', 'drama', 'music', 'cinema', 'etc']");
		var hideChannels = eval(window.localStorage.getItem('schedule-param-hide-channels') || "[]");
		
		var total  = 0;
		var count  = 0;
		var maxlen = 0;
		
		var piece  = this.piece  = {};// piece of canvas programs
		var pieces = this.pieces = [];// array of program pieces
		
		var counter = function _counter() {
			++count;
			loading.update(Math.floor(count / total * 100));
		};
		
		var k = 0;
		
		var headContainer = new sakura.ui.Container({className: 'head'}).render(this.view.content);
		
		global.chinachu.schedule.forEach(function(channel, i) {
			if (channel.programs.length === 0) return;
			if (types.indexOf(channel.type) === -1) return;
			if (hideChannels.indexOf(channel.id) !== -1) return;
			
			var y = k;
			
			var posY   = (5 + y * (5 + linelen));
			var height = linelen;
			
			new sakura.ui.Container({
				style: {
					top   : posY + 'px',
					height: height + 'px'
				}
			}).insert(channel.name).render(headContainer);
			
			channel.programs.forEach(function(program, j) {
				if ((program.end - this.time) < 0) {
					channel.programs = channel.programs.without(program);
					return;
				}
				//if ((program.start - this.time) > 1000 * 60 * 60 * 24) {
				//	channel.programs = channel.programs.without(program);
				//	return;
				//}
				
				var posX  = (program.start - this.time) / 1000 / 1000 * unitlen + 150;
				var width = program.seconds / 1000 * unitlen;
				
				if (maxlen < program.end) maxlen = program.end;
				
				// color: this.app.def.categoryColor[program.category] || '#ffffff'
				
				// add to piece
				piece[program.id] = {
					id     : program.id,
					program: program,
					isAdded: false,
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
		
		
		// 現在時刻表示線
		this.hand = new sakura.ui.Container({className: 'handline'}).render(this.view.content);
		this.hand.entity.style.left = 150 + 'px';
		
		// スケール
		this.timescale = new sakura.ui.Container({className: 'timescale'}).render(this.view.content);
		
		var ld  = -1;
		var lm  = -1;
		
		for (var i = this.time; maxlen > i; i += 60000) {
			var date = new Date(i);
			var d    = date.getDate();
			var m    = date.getMinutes();
			
			if (ld !== d) {
				ld = d;
				
				(m === 0) && new sakura.ui.Container({
					className: 'cutline',
					style    : { left: (150 + (i - this.time) / 1000 / 1000 * unitlen) + 'px' }
				}).render(this.view.content);
			}
			
			if ((m === 0) && (lm !== m)) {
				lm = m;
				
				this.timescale.insert(
					new Element('div', { className: 'long h' + date.getHours() }).setStyle({
						left: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
					}).insert(date.getHours().toPaddedString(2))
				);
			}
			
			if ((m === 30) && (lm !== m)) {
				lm = m;
				
				this.timescale.insert(
					new Element('div', { className: 'middle' }).setStyle({
						left: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
					})
				);
			}
			
			if (((m === 10) || (m === 20) || (m === 40) || (m === 50)) && (lm !== m)) {
				lm = m;
				
				this.timescale.insert(
					new Element('div', { className: 'short' }).setStyle({
						left: ((i - this.time) / 1000 / 1000 * unitlen) + 'px'
					})
				);
			}
		}
		
		return this;
	}//<--draw
});