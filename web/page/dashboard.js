(function() {
	
	document.observe('chinachu:reload', function() {
		document.stopObserving('chinachu:reload', arguments.callee);
		document.stopObserving('chinachu:recording', viewRecording);
		document.stopObserving('chinachu:reserves', viewReserves);
		document.stopObserving('chinachu:reserves', viewScheduler);
		clearInterval(viewReservesInterval);
		clearInterval(viewRecordedInterval);
	})
	
	var loading = new app.ui.ContentLoading({
		onComplete: function() {
			setTimeout(function() {
				loading.remove();
				loading = null;
			}, 50);
		}
	}).render();
	
	var ul = new Element('ul');
	$('content-body').insert(ul);
	
	// 録画中の番組を表示
	function viewRecording() {
		Y.Node.all('#content-body > ul > li.recording').remove();
		
		app.chinachu.recording.each(function(program, i) {
			var id = program.id + new Date().getTime();
			var li = new Element('li', {className: 'recording', id: id});
			ul.insert({top: li});
			
			var title = program.title;
			if (!program.pid) { title += ' (待機)'; }
			title += '<span title="' + program.channel.id + '">' + program.channel.name + '</span>';
			
			li.insert(new Element('div', {className: 'foot', title: program.detail || '説明なし'}).insert(title));
			
			var jump = '<a href="#/recording">録画中リスト</a>';
			jump += '<a onclick="new app.ui.ProgramViewer(\'' + program.id + '\')">番組情報表示</a>';
			
			if (program.pid && !program.tuner.isScrambling && app.chinachu.status.feature.streamer) {
				jump += '<a onclick="new app.ui.Streamer(\'' + program.id + '\')">ストリーミング再生</a>';
			}
			
			li.insert(new Element('div', {className: 'jump'}).insert(jump));
			
			function preview() {
				if (!$(id)) {
					delete preview;
					delete li;
					return;
				}
				
				new Ajax.Request('./api/recording/' + program.id + '/preview', {
					method    : 'get',
					parameters: {width: 320, height: 180, nonce: new Date().getTime()},
					onSuccess : function(t) {
						li.style.backgroundImage = 'url(' + t.responseText + ')';
						
						delete t.responseText;
						t = null;
						
						setTimeout(preview, 5000);
					}
				});
			}
			preview();
		});
	}
	viewRecording();
	document.observe('chinachu:recording', viewRecording);
	
	loading.update(20);
	
	// 予約済リスト
	function viewReserves() {
		if ($('overview-reserves')) {
			var li = $('overview-reserves');
		} else {
			var li = new Element('li', {id: 'overview-reserves'});
			ul.insert(li);
		}
		
		var posTop = 0;
		$$('#overview-reserves > div.list').each(function(a) {
			posTop = a.cumulativeScrollOffset().top;
		});
		
		li.update();
		
		li.insert(new Element('div', {className: 'head'}).insert(
			app.chinachu.reserves.length.toString(10) + '件の予約<span><a href="#/reserves">&raquo; 予約済リスト</a></span>'
		));
		
		var reservesList = new Element('div', {className: 'list'});
		li.insert(reservesList);
		
		var dt = new Date().getTime();
		app.chinachu.reserves.each(function(program, i) {
			var r = Math.round((program.start - dt) / 1000);
			var u = '秒後';
			var c = 'color-red';
			
			if (r < 0) { return; }
			
			if (r >= 60) {
				r = r / 60;
				u = '分後';
				c = 'color-orange';
				
				if (r >= 60) {
					r = r / 60;
					u = '時間後';
					c = 'color-green';
					
					if (r >= 24) {
						r = r / 24;
						u = '日後';
						c = '';
					}
				}
			}
			
			r = Math.round(r * 10) / 10;
			
			reservesList.insert(
				'<a onclick="new app.ui.ProgramViewer(\'' + program.id + '\')">' +
				'<span class="time ' + c + '">' + r.toString(10) + u + '</span>' +
				program.title.truncate(16) +
				'<span class="channel">' + program.channel.name.truncate(7) + '</span>' +
				'</a>'
			);
		});
		
		reservesList.scrollTop = posTop;
	}
	viewReserves();
	document.observe('chinachu:reserves', viewReserves);
	var viewReservesInterval = setInterval(viewReserves, 10000);
	
	loading.update(40);
	
	// 録画済リスト
	function viewRecorded() {
		if ($('overview-recorded')) {
			var li = $('overview-recorded');
		} else {
			var li = new Element('li', {id: 'overview-recorded'});
			ul.insert(li);
		}
		
		var posTop = 0;
		$$('#overview-recorded > div.list').each(function(a) {
			posTop = a.cumulativeScrollOffset().top;
		});
		
		li.update();
		
		li.insert(new Element('div', {className: 'head'}).insert(
			app.chinachu.recorded.length.toString(10) + '件の録画<span><a href="#/recorded">&raquo; 録画済リスト</a></span>'
		));
		
		var recordedList = new Element('div', {className: 'list'});
		li.insert(recordedList);
		
		var dt = new Date().getTime();
		app.chinachu.recorded.each(function(program, i) {
			var r = Math.round((dt - program.end) / 1000);
			var u = '秒前';
			var c = 'color-red';
			
			if (r >= 60) {
				r = r / 60;
				u = '分前';
				c = 'color-orange';
				
				if (r >= 60) {
					r = r / 60;
					u = '時間前';
					c = 'color-green';
					
					if (r >= 24) {
						r = r / 24;
						u = '日前';
						c = '';
					}
				}
			}
			
			r = Math.round(r * 10) / 10;
			
			recordedList.insert(
				'<a onclick="new app.ui.ProgramViewer(\'' + program.id + '\')">' +
				'<span class="time">' + r.toString(10) + u + '</span>' +
				program.title.truncate(16) +
				'<span class="channel">' + program.channel.name.truncate(7) + '</span>' +
				'</a>'
			);
		});
		
		recordedList.scrollTop = posTop;
	}
	viewRecorded();
	document.observe('chinachu:recorded', viewRecorded);
	var viewRecordedInterval = setInterval(viewRecorded, 10000);
	
	loading.update(60);
	
	// スケジューラー実行結果
	function viewScheduler() {
		if ($('overview-scheduler')) {
			var li = $('overview-scheduler');
		} else {
			var li = new Element('li', {id: 'overview-scheduler'});
			ul.insert(li);
		}
		
		li.update();
		
		li.insert(new Element('div', {className: 'head'}).insert(
			'スケジューラー実行結果<span><a href="#/rules">&raquo; ルールリスト</a></span>'
		));
		
		var list = new Element('div', {className: 'list'});
		li.insert(list);
		
		new Ajax.Request('./api/scheduler.json', {
			method    : 'get',
			onComplete: function() {
				if (loading) { loading.update(100); }
			},
			onSuccess: function(t) {
				var d = t.responseJSON;
				
				list.insert('<div class="hl">' + dateFormat(new Date(d.time), 'yyyy/mm/dd HH:MM:ss') + ' 更新 <span class="color-green">(' + d.reserves.length.toString(10) + '件を予約)</span></div>');
				list.insert('<div class="hl color-red">' + d.conflicts.length.toString(10) + '件の衝突</div>');
				
				var dt = new Date().getTime();
				d.conflicts.each(function(program, i) {
					list.insert(
						'<a onclick="new app.ui.ProgramViewer(\'' + program.id + '\')">' +
						'<span class="time">' + dateFormat(new Date(program.start), 'd日 HH:MM') + '</span>' +
						'<span class="color-red">' + program.title.truncate(16) + '</span>' +
						'<span class="channel">' + program.channel.name.truncate(8) + '</span>' +
						'</a>'
					);
				});
			}
		});
	}
	viewScheduler();
	document.observe('chinachu:reserves', viewScheduler);
	
	loading.update(80);
	
})();