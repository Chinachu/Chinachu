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
		
		/*
		var loading = new chinachu.ui.ContentLoading({
			onComplete: function() {
				setTimeout(function() {
					loading.remove();
					loading = null;
				}, 50);
			}
		}).render(app.view.main);
		
		loading.update(20);
		*/
		
		var Timelist = Class.create(sakura.ui.Container, {
			
			init: function(opt) {
				
				this.name   = opt.name;
				this.list   = opt.initialList;
				this.notify = opt.notify;
				
				this.onNotify = this.refresh.bindAsEventListener(this);
				
				document.observe(this.notify, this.onNotify);
				
				return this;
			},
			
			refresh: function(e) {
				this.list.each(function(program) {
					if (program._dt) program._dt.remove();
				});
				
				this.list = e.memo;
				
				this.create();
				
				return this;
			},
			
			create: function() {
				
				this.entity = this.entity || new Element('div', this.attr);
				
				this.entity.show().update();
				
				if (this.className !== null) this.entity.className = this.className;
				
				if (this.id !== null) this.entity.id = this.id;
				
				if (this.style !== null) this.entity.setStyle(this.style);
				
				this.entity.addClassName('dashboard-timelist');
				
				if (this.list.length === 0) {
					this.entity.hide();
					
					return this;
				}
				
				new sakura.ui.Container({className: 'head'}).insert(
					'OF{0} {1}'.__([this.list.length.toString(10), this.name])
				).render(this.entity);
				
				var container = new sakura.ui.Container({className: 'main'}).render(this.entity);
				
				var currentTime = new Date().getTime();
				
				this.list.each(function(program) {
					
					var dynamicTime = program._dt = new chinachu.ui.DynamicTime({
						time: (currentTime > program.end) ? program.end : program.start
					});
					
					new sakura.ui.Element({
						tagName: 'a',
						attr: { href: '#!/program/view/id=' + program.id + '/' }
					}).insert(dynamicTime).insert(program.title.truncate(16)).insert(
						new sakura.ui.Element({
							tagName  : 'span',
							className: 'channel'
						}).insert(program.channel.name.truncate(8))
					).render(container);
				});
				
				return this;
			},
			
			remove: function() {
				
				document.stopObserving(this.notify, this.onNotify);
				
				this.list.each(function(program) {
					if (program._dt) program._dt.remove();
				});
				
				this.entity.remove();
				
				return this;
			}
		});
		
		this.view.reservesTl = new Timelist({
			name       : 'RESERVES'.__(),
			initialList: this.app.chinachu.reserves,
			notify     : 'chinachu:reserves'
		}).render(this.view.content);
		
		this.view.recordingTl = new Timelist({
			name       : 'RECORDING'.__(),
			initialList: this.app.chinachu.recording,
			notify     : 'chinachu:recording'
		}).render(this.view.content);
		
		this.view.recordedTl = new Timelist({
			name       : 'RECORDED'.__(),
			initialList: this.app.chinachu.recorded,
			notify     : 'chinachu:recorded'
		}).render(this.view.content);
		
		return this;
	}
});