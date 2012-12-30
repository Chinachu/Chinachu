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
		viewRuleDetail(new Object, null);
	}
	
	
	function viewRuleDetail(rule, ruleId) {
		// フォームに表示するボタン
		var buttons = [
				{
					label  : 'formButton0',
					color  : '@pink',
					/** 機能実装されるまでボタンを無効化 */
					disabled: true,
					onClick: function(e, btn, modal) {
						btn.disable();

						var result = viewRuleForm.result();
						// ルールの新規追加や更新のメソッドを追加（API呼び出し？）

						modal.close();
						viewRules();
					}
				},
				{
					label  : 'キャンセル',
					onClick: function(e, btn, modal) {
						modal.close();
					}
				}
			];
			
		if (ruleId == null) {
			var formTitle = 'ルール新規追加';
			buttons[0].label = '追加';
		}else{
			var formTitle = 'ルール詳細';
			buttons[0].label = '変更';
			buttons.splice(1,0, {
				label  : '削除',
				color: '@red',
				/** 機能実装されるまでボタンを無効化 */
				disabled: true,
				onClick: function(e, btn, modal) {
					btn.disable();
					// ルールの削除メソッドを追加（API呼び出し？）
					
					modal.close();
					viewRules();
				}
			});
		}
			
		var modal = new Hypermodal({
			title  : formTitle,
			content: new Element('div'),
			buttons: buttons
		}).render();

		var viewRuleForm = new Hyperform({
			formWidth  : '100%',
			labelWidth : '100px',
			labelAlign : 'right',
			fields     : [
				{
					key   : 'types',
					label : 'タイプ',
					input : {
						type : 'checkbox',
						items: (function() {
							var array = [];

							['GR', 'BS', 'CS', 'EX'].each(function(a) {
								array.push({
									label     : a,
									value     : a,
									isSelected: !!rule.types ? (rule.types.indexOf(a) !== -1) : ''
								});
							});

							return array;
						})()
					}
				},
				{
					key   : 'categories',
					label : 'カテゴリー',
					input : {
						type : 'checkbox',
						items: (function() {
							var array = [];

							[
								'anime', 'information', 'news', 'sports',
								'variety', 'drama', 'music', 'cinema', 'etc'
							].each(function(a) {
								array.push({
									label     : a,
									value     : a,
									isSelected: !!rule.categories ? (rule.categories.indexOf(a) !== -1) : ''
								});
							});

							return array;
						})()
					}
				},
				{
					key   : 'channels',
					label : '対象CH',
					input : {
						type  : 'tag',
						values: rule.channels
					}
				},
				{
					key   : 'ignore_channels',
					label : '無視CH',
					input : {
						type  : 'tag',
						values: rule.ignore_channels 
					}
				},
				{
					key   : 'reserve_flags',
					label : '対象フラグ',
					input : {
						type  : 'tag',
						values: rule.reserve_flags
					}
				},
				{
					key   : 'ignore_flags',
					label : '無視フラグ',
					input : {
						type  : 'tag',
						values: rule.ignore_flags
					}
				},
				{
					key   : 'hour.start',
					label : '何時から',
					input : {
						type      : 'text',
						width     : 25,
						maxlength : 2,
						appendText: '時',
						value   : !!rule.hour ? rule.hour.start : '',
						isNumber: true
					}
				},
				{
					key   : 'hour.end',
					label : '何時まで',
					input : {
						type      : 'text',
						width     : 25,
						maxlength : 2,
						appendText: '時',
						value   : !!rule.hour ? rule.hour.end : '',
						isNumber: true
					}
				},
				{
					key   : 'duration.min',
					label : '最短長さ',
					input : {
						type      : 'text',
						width     : 60,
						appendText: '秒',
						value   : !!rule.duration ? rule.duration.min : '',
						isNumber: true
					}
				},
				{
					key   : 'duration.max',
					label : '最長長さ',
					input : {
						type      : 'text',
						width     : 60,
						appendText: '秒',
						value   : !!rule.duration ? rule.duration.max : '',
						isNumber: true
					}
				},
				{
					key   : 'reserve_titles',
					label : '対象タイトル',
					input : {
						type  : 'tag',
						values: rule.reserve_titles
					}
				},
				{
					key   : 'ignore_titles',
					label : '無視タイトル',
					input : {
						type  : 'tag',
						values: rule.ignore_titles
					}
				},
				{
					key   : 'reserve_descriptions',
					label : '対象説明文',
					input : {
						type  : 'tag',
						values: rule.reserve_descriptions
					}
				},
				{
					key   : 'ignore_descriptions',
					label : '無視説明文',
					input : {
						type  : 'tag',
						values: rule.ignore_descriptions
					}
				},
				{
					key   : 'isDisabled',
					label : 'ルールの状態',
					input : {
						type : 'radio',
						items: [
							{
								label  : '有効',
								value  : false,
								isSelected: !!rule.isDisabled ? (rule.isDisabled == "false") : true
							},
							{
								label  : '無効',
								value  : true,
								isSelected: !!rule.isDisabled ? (rule.isDisabled == "true") : false
							}
							]
					}
				}
			]
		}).render(modal.content);
	};

	
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
					},
					onClick: function(element, evt) {
						evt.stop();
						var id = element.getElementsByTagName('div')[0].innerHTML;
						var ruleId = ''; //将来的にAPIで呼び出し？
						viewRuleDetail(app.chinachu.rules[id], ruleId);
					}
				});
				
				grid.render();
			}, 0);
		});
		
		contentBodyHead.insert(viewRuleAddBtn.observe('click', viewRuleAddBtnOnClick));
	}
	viewRules();
	document.observe('chinachu:recorded', viewRules);
	
})();
