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
	
	// 設定ボタン
	var viewRuleAddBtn = new Element('a', { className: 'right' }).insert(
		'新規追加'
	);
	contentBodyHead.insert(viewRuleAddBtn);
	
	// ビュー: ルール
	function viewRules() {
		param.cur = new Date().getTime();
		
		contentBodyGrid.update();
		
		var grid = new Hypergrid({
			tableWidth   : '100%',
			tableClass   : 'hypergrid hypergrid-padded hypergrid-noborder chinachu-hypergrid-multiline',
			multiSelect  : false,
			disableSelect: true,
			disableSort  : true,
			disableResize: true,
			colModel     : [
				{
					key      : 'id',
					innerHTML: '#',
					width    : 20
				},
				{
					key      : 'types',
					innerHTML: 'タイプ',
					width    : 30
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
					key      : 'flags',
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
					width    : 60
				},
				{
					key      : 'duration',
					innerHTML: '長さ',
					width    : 60
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
								rule.categories.join('<br>')
							) : (
								'-'
							)
						},
						flags: {
							innerHTML: !!rule.flags ? (
								rule.flags.join('<br>')
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
						reserve_titles: {
							innerHTML: !!rule.reserve_titles ? (
								rule.reserve_titles.join('<br>').truncate(50)
							) : (
								'-'
							)
						},
						ignore_titles: {
							innerHTML: !!rule.ignore_titles ? (
								rule.ignore_titles.join('<br>').truncate(50)
							) : (
								'-'
							)
						},
						reserve_descriptions: {
							innerHTML: !!rule.reserve_descriptions ? (
								rule.reserve_descriptions.join('<br>').truncate(50)
							) : (
								'-'
							)
						},
						ignore_descriptions: {
							innerHTML: !!rule.ignore_descriptions ? (
								rule.ignore_descriptions.join('<br>').truncate(50)
							) : (
								'-'
							)
						}
					}
				});
				
				grid.render();
			}, 0);
		});
		
		
	}
	viewRules();
	document.observe('chinachu:recorded', viewRules);
	
})();