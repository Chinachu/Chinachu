P = Class.create(P, {
	
	init: function _initPage() {
		this.view.content.className = 'loading';
		
		this.data.config     = {};
		this.data.configText = '';
		
		this.initToolbar();
		this.draw();
		
		return this;
	},
	
	deinit: function _deinit() {
		
		
		
		return this;
	},
	
	initToolbar: function _initToolbar() {
		
		this.view.toolbar.add({
			key: 'save',
			ui : new sakura.ui.Button({
				label  : 'SAVE'.__(),
				icon   : './icons/disk.png',
				onClick: function() {
					
					this.data.configText = this.data.editor.getValue();
					
					var modal  = flagrate.createModal({
						title: '設定の保存',
						text : '設定を反映させるにはサービスの再起動が必要な場合があります。',
						buttons: [
							{
								label: '保存',
								color: '@orange',
								onSelect: function(e, modal) {
									
									modal.buttons.each(function(a) {
										a.button.disable();
									});
									
									main();
								}
							},
							{
								label: 'キャンセル',
								onSelect: function(e, modal) {
									modal.close();
								}
							}
						]
					}).open();
					
					var main = function() {
						
						modal.content.updateText('設定を保存しています...');
						
						new Ajax.Request('./api/config.json', {
							method    : 'put',
							parameters: {
								json: this.data.configText
							},
							onComplete: function() {
								modal.close();
							},
							onSuccess: function() {
								
								flagrate.createModal({
									title: '完了',
									text : '設定を保存しました'
								}).open();
							},
							onFailure: function(t) {
								
								flagrate.createModal({
									title: '失敗',
									text : '設定の保存に失敗しました (' + t.status + ')'
								}).open();
							}
						});
					}.bind(this);
				}.bind(this)
			}).disable()
		});
		
		return this;
	},
	
	draw: function _draw() {
		this.view.content.className = '';
		this.view.content.update();
		
		this.view.config = flagrate.createElement().addClassName('editor');
		
		flagrate.createTab({
			fill: true,
			tabs: [
				{
					label   : 'config.json',
					element : this.view.config,
					onSelect: function() {
						//
					}.bind(this)
				}
			]
		}).insertTo(this.view.content);
		
		this.data.config = new Ajax.Request('./api/config.json', {
			method: 'get',
			onSuccess: function(t) {
				this.data.configText = t.responseText;
				
				this.view.config.updateText(this.data.configText);
				
				var editor = this.data.editor = ace.edit(this.view.config);
				editor.setTheme('ace/theme/github');
				editor.setShowPrintMargin(false);
				//editor.setShowInvisibles(true);
				var sess = editor.getSession();
				sess.setMode('ace/mode/json');
				sess.setTabSize(2);
				
				this.view.toolbar.one('save').enable();
			}.bind(this)
		});
		
		return this;
	}
});