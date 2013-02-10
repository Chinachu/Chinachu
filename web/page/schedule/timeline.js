P = Class.create(P, {
	
	init: function _initPage() {
		this.view.content.className = 'loading';
		
		this.draw();
		
		return this;
	},
	
	draw: function _draw() {
		this.view.content.className = 'fullscreen';
		this.view.content.update('poyo');
		
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
		
		return this;
	}
});