P = Class.create(P, {
	
	init: function _initPage() {
		this.view.content.className = 'loading';
		
		this.draw();
		
		return this;
	},
	
	deinit: function _deinit() {
		this.view.reservesTl.remove();
		this.view.recordingTl.remove();
		this.view.recordedTl.remove();
		
		return this;
	},
	
	draw: function _draw() {
		this.view.content.className = 'bg-chinachu';
		this.view.content.update();
		
		var Timelist = Class.create(sakura.ui.Container, {
			
			init: function(opt) {
				
				this.name     = opt.name;
				this.list     = opt.initialList;
				this.notify   = opt.notify;
				this.interval = 0;
				
				this.onNotify = this.refresh.bindAsEventListener(this);
				
				document.observe(this.notify, this.onNotify);
				
				return this;
			},
			
			refresh: function(e) {
				this.list.each(function(program) {
					if (program._dt) program._dt.remove() && delete program._dt;
					if (program._it) program._it.remove() && delete program._it;
					if (program._pt) clearTimeout(program._pt);
				});
				
				this.list = e.memo;
				
				this.create();
				
				return this;
			},
			
			create: function() {
				
				this.entity = this.entity || new Element('div', this.attr);
				
				this.entity.show().update();
				
				this.entity.className = '';
				
				if (this.id !== null) this.entity.id = this.id;
				
				if (this.style !== null) this.entity.setStyle(this.style);
				
				if (this.list.length === 0) {
					this.entity.hide();
					
					return this;
				}
				
				this.entity.addClassName('dashboard-timelist');
				
				new sakura.ui.Container({className: 'head'}).insert(
					'OF{0} {1}'.__([this.list.length.toString(10), this.name])
				).render(this.entity);
				
				var container = new sakura.ui.Container({className: 'main'}).render(this.entity);
				
				var currentTime = new Date().getTime();
				
				this.list.each(function(program) {
					
					program._dt = new chinachu.ui.DynamicTime({
						tagName: 'div',
						type   : 'full',
						time   : (currentTime > program.end) ? program.end : program.start
					});
					
					program._it = new sakura.ui.Element({
						tagName  : 'a',
						className: 'color-cat-' + program.category,
						attr     : { href: '#!/program/view/id=' + program.id + '/' }
					}).insert('<div class="title">' + program.title + '</div>').insert(
						new sakura.ui.Element({
							tagName  : 'div',
							className: 'channel'
						}).insert(program.channel.type + ': ' + program.channel.name)
					).insert(program._dt).render(container);
					
					var html = new Element('div').insert(program.detail || '(説明なし)');
					
					new sakura.ui.ContextMenu({
						target: program._it,
						items : [
							{
								label   : '詳細を表示',
								icon    : './icons/magnifier-zoom.png',
								onSelect: Prototype.emptyFunction
							},
							'------------------------------------------',
							{
								label   : 'コピー',
								onSelect: Prototype.emptyFunction
							},
							{
								label   : 'IDをコピー',
								onSelect: Prototype.emptyFunction
							},
							{
								label   : 'タイトルをコピー',
								onSelect: Prototype.emptyFunction
							},
							{
								label   : '説明をコピー',
								onSelect: Prototype.emptyFunction
							},
							'------------------------------------------',
							{
								label   : 'ツイート...',
								icon    : 'https://abs.twimg.com/favicons/favicon.ico',
								onSelect: Prototype.emptyFunction
							},
							{
								label   : 'Google検索',
								onSelect: Prototype.emptyFunction
							},
							{
								label   : 'Wikipedia',
								onSelect: Prototype.emptyFunction
							}
						]
					});
					
					var po = new sakura.ui.Popover({
						target: program._it,
						html  : html
					});
					
					if (program.pid && !program.tuner.isScrambling && global.chinachu.status.feature.streamer) {
						var preview = function() {
							if (po.isShowing === false) {
								program._pt = setTimeout(preview, 500);
								return;
							}
							
							new Ajax.Request('./api/recording/' + program.id + '/preview.txt', {
								method    : 'get',
								parameters: {width: 320, height: 180, nonce: new Date().getTime()},
								onSuccess : function(t) {
									html.update('<img src="' + t.responseText + '"><br>' + (program.detail || ''));
									
									delete t.responseText;
									t = null;
									
									if (!this.isRemoved) {
										program._pt = setTimeout(preview, 3000);
									}
								}.bind(this)
							});
						}.bind(this);
						
						program._pt = setTimeout(preview, 1000);
					}
				}.bind(this));
				
				clearInterval(this.interval);
				this.interval = setInterval(function() {
					this.entity.setAttribute('rel', $$('.dashboard-timelist').length);
				}.bind(this), 500);
				
				return this;
			},
			
			remove: function() {
				
				clearInterval(this.interval);
				document.stopObserving(this.notify, this.onNotify);
				
				this.list.each(function(program) {
					if (program._dt) program._dt.remove() && delete program._dt;
					if (program._it) program._it.remove() && delete program._it;
					if (program._pt) clearTimeout(program._pt);
				});
				
				this.entity.remove();
				this.isRemoved = true;
				
				return this;
			}
		});
		
		this.view.reservesTl = new Timelist({
			name       : 'RESERVES'.__(),
			initialList: global.chinachu.reserves,
			notify     : 'chinachu:reserves'
		}).render(this.view.content);
		
		this.view.recordingTl = new Timelist({
			name       : 'RECORDING'.__(),
			initialList: global.chinachu.recording,
			notify     : 'chinachu:recording'
		}).render(this.view.content);
		
		this.view.recordedTl = new Timelist({
			name       : 'RECORDED'.__(),
			initialList: global.chinachu.recorded,
			notify     : 'chinachu:recorded'
		}).render(this.view.content);
		
		return this;
	}
});