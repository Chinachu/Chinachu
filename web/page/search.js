(function() {
	
	document.observe('chinachu:reload', function() {
		document.stopObserving('chinachu:reload', arguments.callee);
		document.stopObserving('chinachu:schedule', viewSearch);
	});
	
	var contentBodyHead     = $('content-body-head');
	var contentBodyResults  = $('content-body-results');
	var contentBodyAnalysis = $('content-body-analysis');
	
	var param = {
		color       : {
			anime      : '#fcbde1',
			information: '#bdfce8',
			news       : '#d7fcbd',
			sports     : '#bdf1fc',
			variety    : '#fbfcbd',
			drama      : '#fce1c4',
			music      : '#bdc9fc',
			cinema     : '#d6bdfc',
			etc        : '#eeeeee'
		}
	};
	
	// 設定ボタン
	var viewSearchModalBtn = new Element('a', { className: 'right' }).insert(
		'番組検索'
	);
	
	var viewSearchModal = function() {
		var modal = new Hypermodal({
			disableCloseByMask: true,
			disableCloseButton: true,
			title  : '番組検索',
			content: new Element('div'),
			buttons: [
				{
					label  : '検索',
					color  : '@pink',
					onClick: function(e, btn, modal) {
						btn.disable();
						
						var result = viewSearchForm.result();
						
						app.query = Object.extend(app.query, result);
						app.query.skip = 1;
						
						modal.close();
						
						window.location.hash = '/search?' + Object.toQueryString(app.query);
						//todo
					}
				}
			]
		}).render('content-body');
		
		var viewSearchForm = new Hyperform({
			formWidth  : '100%',
			labelWidth : '100px',
			labelAlign : 'right',
			fields     : [
				{
					key   : 'cat',
					label : 'カテゴリー',
					input : {
						type : 'pulldown',
						items: (function() {
							var array = [];
							
							[
								'anime', 'information', 'news', 'sports',
								'variety', 'drama', 'music', 'cinema', 'etc'
							].each(function(a) {
								array.push({
									label     : a,
									value     : a,
									isSelected: (app.query.cat === a)
								});
							});
							
							return array;
						})()
					}
				},
				{
					key   : 'title',
					label : 'タイトル',
					input : {
						type : 'text',
						value: app.query.title || ''
					}
				},
				{
					key   : 'desc',
					label : '説明',
					input : {
						type : 'text',
						value:  app.query.desc || ''
					}
				},
				{
					key   : 'type',
					label : 'タイプ',
					input : {
						type : 'pulldown',
						items: (function() {
							var array = [];
							
							['GR', 'BS', 'CS', 'EX'].each(function(a) {
								array.push({
									label     : a,
									value     : a,
									isSelected: ((app.query.type || []).indexOf(a) !== -1)
								});
							});
							
							return array;
						})()
					}
				},
				{
					key   : 'start',
					label : '何時から',
					input : {
						type      : 'text',
						width     : 25,
						maxlength : 2,
						appendText: '時',
						value   : app.query.start || '',
						isNumber: true
					}
				},
				{
					key   : 'end',
					label : '何時まで',
					input : {
						type      : 'text',
						width     : 25,
						maxlength : 2,
						appendText: '時',
						value     : app.query.end || '',
						isNumber  : true
					}
				},
				{
					key   : 'pgid',
					label : 'プログラムID',
					input : {
						type : 'text',
						value:  app.query.pgid || ''
					}
				},
				{
					key   : 'chid',
					label : 'チャンネルID',
					input : {
						type : 'text',
						value:  app.query.chid || ''
					}
				}
			]
		}).render(modal.content);
	};
	
	// ビュー: 検索
	function viewSearch() {
		if (app.chinachu.schedule.length === 0) return;
		
		param.cur = new Date().getTime();
		
		$$('.hypermodal').each(function(a) {
			a.remove();
		});
		
		contentBodyHead.update();
		contentBodyResults.update();
		contentBodyAnalysis.update();
		
		contentBodyHead.insert(
			new Element('a', {
				className: app.query.detail ? '' : 'selected'
			}).insert('リスト表示').observe('click', function() {
				delete app.query.detail
				window.location.hash = '/search?' + Object.toQueryString(app.query);
			})
		);
		
		contentBodyHead.insert(
			new Element('a', {
				className: app.query.detail ? 'selected' : ''
			}).insert('詳細表示').observe('click', function() {
				app.query.detail = 1;
				window.location.hash = '/search?' + Object.toQueryString(app.query);
			})
		);
		
		contentBodyHead.insert(viewSearchModalBtn.observe('click', viewSearchModal));
		
		if (!app.query.skip) {
			viewSearchModal();
			return;
		}
		
		var results = [];
		var result  = {};
		
		app.chinachu.schedule.each(function(channel) {
			channel.programs.each(function(program) {
				if (app.query.pgid && app.query.pgid !== program.id) return; 
				if (app.query.chid && app.query.chid !== program.channel.id) return; 
				if (app.query.cat && app.query.cat !== program.category) return; 
				if (app.query.type && app.query.type !== program.channel.type) return; 
				if (app.query.title && program.title.match(app.query.title) === null) return;
				if (app.query.desc && program.detail.match(app.query.desc) === null) return;
				
				if (app.query.start || app.query.end) {
					var ruleStart = parseInt(app.query.start || 0, 10);
					var ruleEnd   = parseInt(app.query.end || 24, 10);
					
					var progStart = new Date(program.start).getHours();
					var progEnd   = new Date(program.end).getHours();
					
					if (progStart > progEnd) {
						progEnd += 24;
					}
					
					if (ruleStart > ruleEnd) {
						if ((ruleStart > progStart) && (ruleEnd < progEnd)) return;
					} else {
						if ((ruleStart > progStart) || (ruleEnd < progEnd)) return;
					}
				}
				
				if (param.cur > program.end) return;
				
				results.push(program);
				result[program.id] = program;
			});
		});
		
		results.sort(function(a, b) {
			return a.start - b.start;
		});
		
		var ld = -1;
		results.each(function(program) {
			var date = new Date(program.start);
			
			setTimeout(function() {
				if (ld !== date.getDate()) {
					ld = date.getDate();
					
					contentBodyResults.insert(
						new Element('h2').insert(dateFormat(date, 'mm月dd日'))
					);
				}
				
				var div = new Element('div', { className: app.query.detail ? 'detail' : 'list' });
				
				div.insert(new Element('span', { className: 'datetime' }).insert(
					dateFormat(new Date(program.start), 'HH:MM')
				));
				
				div.insert(new Element('span', { className: 'duration' }).insert(
					(program.seconds / 60) + '分'
				));
				
				div.insert(
					new Element('span', { className: 'cat' }).insert(
						program.category
					).setStyle({
						backgroundColor: param.color[program.category]
					})
				);
				
				div.insert(new Element('span', { className: 'channel' }).insert(
					'<span class="type">' + program.channel.type + ':</span>' + program.channel.name
				));
				
				if (program.start < param.cur && program.end > param.cur) {
					div.insert(new Element('span', { className: 'stat' }).insert('放送中'));
				} else {
					div.insert(new Element('span', { className: 'stat' }).hide());
				}
				
				div.insert(new Element('span', { className: 'title' }).insert(program.title));
				
				div.insert(new Element('span', { className: 'pgid' }).insert(
					'#' + program.id
				));
				
				if (app.query.detail) {
					div.insert(new Element('div', { className: 'desc' }).insert(program.detail));
				}
				
				div.observe('click', function() {
					new app.ui.ProgramViewer(program.id);
				});
				
				contentBodyResults.insert(div);
				program._div = div;
			}, 0);
		});
		
		app.chinachu.reserves.each(function(program) {
			if (typeof result[program.id] === 'undefined') return;
			
			setTimeout(function() {
				result[program.id]._div.addClassName('reserved');
				result[program.id]._div.getElementsByClassName('stat')[0].show();
				result[program.id]._div.getElementsByClassName('stat')[0].update('予約済');
			}, 0);
		});
		
		app.chinachu.recording.each(function(program) {
			if (typeof result[program.id] === 'undefined') return;
			
			setTimeout(function() {
				result[program.id]._div.addClassName('recording');
				result[program.id]._div.getElementsByClassName('stat')[0].show();
				result[program.id]._div.getElementsByClassName('stat')[0].update('録画中');
			}, 0);
		});
	}
	viewSearch();
	document.observe('chinachu:schedule', viewSearch);
	
})();