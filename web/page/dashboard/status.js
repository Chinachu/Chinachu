P = Class.create(P, {
	
	init: function _initPage() {
		this.view.content.className = 'loading';
		
		this.draw();
		
		return this;
	},
	
	deinit: function _deinit() {
		
		
		return this;
	},
	
	draw: function _draw() {
		this.view.content.className = '';
		this.view.content.update();
		
		
		
		return this;
	}
});