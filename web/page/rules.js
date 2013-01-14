(function() {
	
	document.observe('chinachu:reload', function() {
		document.stopObserving('chinachu:reload', arguments.callee);
		document.stopObserving('chinachu:rules', viewRules);
	});
	
	var contentBodyHead = $('content-body-head');
	var contentBodyGrid = $('content-body-grid');
	
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
	
	contentBodyHead.update();
	
	// 新規追加ボタン
	var viewRuleAddBtn = new Element('a', { className: 'right' }).insert(
		'新規追加'
	);
	
	var viewRuleAddBtnOnClick = function() {
		new app.ui.NewRule();
	};
	
	// スケジューラの実行
	var viewExecuteSchedulerBtn = new Element('a', { className: 'right' }).insert(
		'スケジューラの実行'
	);
	
	var viewExecuteSchedulerBtnOnClick = function() {
		new app.ui.ExecuteScheduler();
	};
	
	
	// ビュー: ルール
	function viewRules() {
		param.cur = new Date().getTime();
		
		contentBodyGrid.update();
		
		var grid = new Hypergrid({
			tableWidth   : '100%',
			tableClass   : 'hypergrid chinachu-hypergrid-multiline',
			multiSelect  : false,
			disableSelect: true,
			disableSort  : true,
			disableResize: true,
			colModel     : [
				{
					key      : 'id',
					innerHTML: '#',
					width    : 15
				},
				{
					key      : 'types',
					innerHTML: 'タイプ',
					width    : 25
				},
				{
					key      : 'categories',
					innerHTML: 'カテゴリー',
					width    : 60
				},
				{
					key      : 'channels',
					innerHTML: '対象CH',
					width    : 50
				},
				{
					key      : 'ignore_channels',
					innerHTML: '無視CH',
					width    : 50
				},
				{
					key      : 'reserve_flags',
					innerHTML: '対象フラグ',
					width    : 50
				},
				{
					key      : 'ignore_flags',
					innerHTML: '無視フラグ',
					width    : 50
				},
				{
					key      : 'hour',
					innerHTML: '時間帯',
					width    : 40
				},
				{
					key      : 'duration',
					innerHTML: '長さ',
					width    : 70
				},
				{
					key      : 'reserve_titles',
					innerHTML: '対象タイトル'
				},
				{
					key      : 'ignore_titles',
					innerHTML: '無視タイトル'
				},
				{
					key      : 'reserve_descriptions',
					innerHTML: '対象説明文'
				},
				{
					key      : 'ignore_descriptions',
					innerHTML: '無視説明文'
				}
			]
		}).render(contentBodyGrid);
		
		app.chinachu.rules.each(function(rule, i) {
			setTimeout(function() {
				grid.push({
					className: !!rule.isDisabled ? 'disabled' : null,
					cell: {
						id: {
							innerHTML: i.toString(10)
						},
						sid: {
							innerHTML: rule.sid || '-'
						},
						types: {
							innerHTML: !!rule.types ? (
								rule.types.join('<br>')
							) : (
								'-'
							)
						},
						channels: {
							innerHTML: !!rule.channels ? (
								rule.channels.join('<br>')
							) : (
								'-'
							)
						},
						ignore_channels: {
							innerHTML: !!rule.ignore_channels ? (
								rule.ignore_channels.join('<br>')
							) : (
								'-'
							)
						},
						categories: {
							innerHTML: !!rule.categories ? (
								(function() {
									var html = '';
									
									rule.categories.each(function(a) {
										html += '<span style="background:' + param.color[a] + '">' + a + '</span><br>'
									});
									
									return html;
								})()
							) : (
								'-'
							)
						},
						reserve_flags: {
							innerHTML: !!rule.reserve_flags? (
								rule.reserve_flags.join('<br>')
							) : (
								'-'
							)
						},
						ignore_flags: {
							innerHTML: !!rule.ignore_flags ? (
								rule.ignore_flags.join('<br>')
							) : (
								'-'
							)
						},
						hour: {
							innerHTML: !!rule.hour ? (
								rule.hour.start + " - " + rule.hour.end
							) : (
								'-'
							)
						},
						duration: {
							innerHTML: !!rule.duration ? (
								rule.duration.min + " - " + rule.duration.max
							) : (
								'-'
							)
						},
						reserve_titles: {
							innerHTML: !!rule.reserve_titles ? (
								(rule.reserve_titles.length < 5)
									&& rule.reserve_titles.join('<br>')
									|| '[' + rule.reserve_titles.length + ']'
							) : (
								'-'
							)
						},
						ignore_titles: {
							innerHTML: !!rule.ignore_titles ? (
								(rule.ignore_titles.length < 5)
									&& rule.ignore_titles.join('<br>')
									|| '[' + rule.ignore_titles.length + ']'
							) : (
								'-'
							)
						},
						reserve_descriptions: {
							innerHTML: !!rule.reserve_descriptions ? (
								(rule.reserve_descriptions.length < 5)
									&& rule.reserve_descriptions.join('<br>')
									|| '[' + rule.reserve_descriptions.length + ']'
							) : (
								'-'
							)
						},
						ignore_descriptions: {
							innerHTML: !!rule.ignore_descriptions ? (
								(rule.ignore_descriptions.length  < 5)
									&& rule.ignore_descriptions.join('<br>')
									|| '[' + rule.ignore_descriptions.length + ']'
							) : (
								'-'
							)
						}
					},
					onClick: function(element, evt) {
						evt.stop();
						var id = element.getElementsByTagName('div')[0].innerHTML;
						new app.ui.EditRule(id);
					}
				});
				
				grid.render();
			}, 0);
		});
		
		contentBodyHead.insert(viewRuleAddBtn.observe('click', viewRuleAddBtnOnClick));
		contentBodyHead.insert(viewExecuteSchedulerBtn.observe('click', viewExecuteSchedulerBtnOnClick));
	}
	viewRules();
	document.observe('chinachu:rules', viewRules);
	
})();
