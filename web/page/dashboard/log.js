P = Class.create(P, {
	
	init: function _initPage() {
		this.view.content.className = 'loading';
		
		this.draw();
		
		return this;
	},
	
	deinit: function _deinit() {
		
		this.data.operatorLogRequest.transport.abort();
		this.data.schedulerLogRequest.transport.abort();
		this.data.wuiLogRequest.transport.abort();
		
		return this;
	},
	
	draw: function _draw() {
		this.view.content.className = '';
		this.view.content.update();
		
		this.view.operatorLog  = flagrate.createElement().addClassName('console');
		this.view.schedulerLog = flagrate.createElement().addClassName('console');
		this.view.wuiLog       = flagrate.createElement().addClassName('console');
		
		flagrate.createTab({
			fill: true,
			tabs: [
				{
					label   : 'Operator',
					element : this.view.operatorLog,
					onSelect: function() {
						this.view.operatorLog.scrollTop = this.view.operatorLog.scrollHeight;
					}.bind(this)
				},
				{
					label   : 'Scheduler',
					element : this.view.schedulerLog,
					onSelect: function() {
						this.view.schedulerLog.scrollTop = this.view.schedulerLog.scrollHeight;
					}.bind(this)
				},
				{
					label   : 'WUI',
					element : this.view.wuiLog,
					onSelect: function() {
						this.view.wuiLog.scrollTop = this.view.wuiLog.scrollHeight;
					}.bind(this)
				}
			]
		}).insertTo(this.view.content);
		
		this.data.operatorLogRequest = new Ajax.Request('./api/log/operator/stream.txt', {
			method: 'get',
			onInteractive: function(t) {
				var html = t.responseText;
				
				html = html.replace(/\n/g, '<br>');
				
				this.view.operatorLog.update(html);
				this.view.operatorLog.scrollTop = this.view.operatorLog.scrollHeight;
			}.bind(this)
		});
		
		this.data.schedulerLogRequest = new Ajax.Request('./api/log/scheduler/stream.txt', {
			method: 'get',
			onInteractive: function(t) {
				var html = t.responseText;
				
				html = html.replace(/\n/g, '<br>');
				
				this.view.schedulerLog.update(html);
				this.view.schedulerLog.scrollTop = this.view.schedulerLog.scrollHeight;
			}.bind(this)
		});
		
		this.data.wuiLogRequest = new Ajax.Request('./api/log/wui/stream.txt', {
			method: 'get',
			onInteractive: function(t) {
				var html = t.responseText;
				
				html = html.replace(/\n/g, '<br>');
				
				this.view.wuiLog.update(html);
				this.view.wuiLog.scrollTop = this.view.wuiLog.scrollHeight;
			}.bind(this)
		});
		
		return this;
	}
});