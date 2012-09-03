(function() {
	
	Event.observe(document.body, 'chinachu:reload', function() {
		Event.stopObserving(document.body, 'chinachu:reload', arguments.callee);
		Event.stopObserving(document.body, 'chinachu:recording', updateRecording);
	})
	
	var loading = new app.ui.ContentLoading().render();
	
	loading.onComplete = function() {
		loading.remove();
	};
	
	var ul = new Element('ul');
	$('content-body').insert(ul);
	
	// 録画中の番組を表示
	function updateRecording() {
		Y.Node.all('#content-body > ul > li.recording').remove();
		
		app.chinachu.recording.each(function(program, i) {
			var id = program.id + new Date().getTime();
			var li = new Element('li', {className: 'recording', id: id});
			ul.insert({top: li});
			
			var title = program.title;
			if (!program.pid) { title += ' (準備中)'; }
			title += '<span title="' + program.channel.id + '">' + program.channel.name + '</span>';
			
			li.insert(new Element('div', {className: 'foot', title: program.detail || '説明なし'}).insert(title));
			
			var jump = '<a href="#/recording">録画中リスト</a>';
			jump += '<a href="javascript:new app.ui.ProgramViewer(\'' + program.id + '\')">番組情報表示</a>';
			
			if (program.pid && !program.tuner.isScrambling && app.chinachu.status.feature.streamer) {
				jump += '<a href="javascript:new app.ui.Streamer(\'' + program.id + '\');">ストリーミング再生</a>';
			}
			
			li.insert(new Element('div', {className: 'jump'}).insert(jump));
			
			function preview() {
				if (!$(id)) {
					delete preview;
					delete li;
					return;
				}
				
				new Ajax.Request('/api/recording/' + program.id + '/preview', {
					method    : 'get',
					parameters: Object.toJSON({width: 320, height: 180}),
					onSuccess : function(t) {
						li.style.backgroundImage = 'url(' + t.responseText + ')';
						
						setTimeout(preview, 5000);
					}
				});
			}
			preview();
		});
	}
	updateRecording();
	Event.observe(document.body, 'chinachu:recording', updateRecording);
	
	loading.update(100);
	
})();