(function() {
	
	var contentBodyHead = $('content-body-head');
	var contentBodyForm = $('content-body-form');
	
	contentBodyHead.update();
	contentBodyForm.update();
	
	// 保存ボタン
	var viewConfigSaveBtn = new Element('a', { className: 'right' }).insert(
		'保存'
	);
	
	var viewConfigSaveBtnOnClick = function() {
		// ...
	};
	
	contentBodyHead.insert(viewConfigSaveBtn.observe('click', viewConfigSaveBtnOnClick));
	
	var basicForm = null;
	
	new Ajax.Request('./api/config.json', {
		method   : 'get',
		onSuccess: function(t) {
			var config = t.responseJSON;
			
			basicForm = new Hyperform({
				formWidth : '100%',
				labelWidth: '200px',
				validator : {
					numbers: {
						warning: '数字のみ',
						regex  : /^[0-9]+$/i
					},
					filePath: {
						warning: '不正なファイルパス',
						regex  : /^(\/|\.\/|\.\.\/).+$/
					},
					dirPath: {
						warning: '不正なディレクトリパス',
						regex  : /^(\/|\.\/|\.\.\/).+\/$/
					}
				},
				fields: [
					{
						key   : 'recordedDir',
						label : '録画保存先ディレクトリ',
						
						description: '録画保存先の相対またはフルパス',
						
						input: {
							type       : 'text',
							value      : config.recordedDir,
							placeholder: './recorded/',
							validator  : 'dirPath',
							isRequired : true
						}
					},
					{
						key   : 'temporaryDir',
						label : '一時保存先ディレクトリ',
						
						description: '一時保存先の相対またはフルパス',
						
						input: {
							type       : 'text',
							value      : config.temporaryDir,
							placeholder: '/tmp/',
							validator  : 'dirPath',
							isRequired : true
						}
					},
					{
						key   : 'wuiUsers',
						label : 'WUIユーザー',
						
						description: 'BASIC認証を有効にする場合に設定',
						
						input: {
							type       : 'tag',
							values     : config.wuiUsers,
							placeholder: 'user:password',
							width      : 150
						}
					},
					{
						key   : 'wuiPort',
						label : 'WUIポート番号',
						
						input: {
							type       : 'text',
							value      : config.wuiPort,
							placeholder: '10772',
							width      : 80,
							toNumber   : true,
							validator  : 'numbers',
							isRequired : true
						}
					},
					{
						key   : 'wuiHost',
						label : 'WUIホスト名',
						
						description: ':: または 0.0.0.0 が一般的な設定',
						
						input: {
							type       : 'text',
							value      : config.wuiHost,
							placeholder: '::'
						}
					},
					{
						key   : 'wuiTlsKeyPath',
						label : 'WUI用TLS秘密鍵',
						
						input: {
							type       : 'text',
							value      : config.wuiTlsKeyPath,
							validator  : 'filePath',
							placeholder: './tls.key'
						}
					},
					{
						key   : 'wuiTlsCertPath',
						label : 'WUI用TLS証明書',
						
						input: {
							type       : 'text',
							value      : config.wuiTlsCertPath,
							validator  : 'filePath',
							placeholder: './tls.cert'
						}
					},
					{
						key   : 'wuiPreviewer',
						label : 'WUIプレビュー機能',
						
						input: {
							type       : 'radio',
							items      : [
								{
									label: 'false',
									value: false,
									isSelected: !config.wuiPreviewer
								},
								{
									label: 'true',
									value: true,
									isSelected: !!config.wuiPreviewer
								}
							]
						}
					},
					{
						key   : 'wuiStreamer',
						label : 'WUIストリーミング機能',
						
						input: {
							type       : 'radio',
							items      : [
								{
									label: 'false',
									value: false,
									isSelected: !config.wuiStreamer
								},
								{
									label: 'true',
									value: true,
									isSelected: !!config.wuiStreamer
								}
							]
						}
					},
					{
						key   : 'wuiFiler',
						label : 'WUIファイル操作',
						
						input: {
							type       : 'radio',
							items      : [
								{
									label: 'false',
									value: false,
									isSelected: !config.wuiFiler
								},
								{
									label: 'true',
									value: true,
									isSelected: !!config.wuiFiler
								}
							]
						}
					},
					{
						key   : 'wuiConfigurator',
						label : 'WUIでの設定変更',
						
						input: {
							type       : 'radio',
							items      : [
								{
									label: 'false',
									value: false,
									isSelected: !config.wuiFiler
								},
								{
									label: 'true',
									value: true,
									isSelected: !!config.wuiFiler
								}
							]
						}
					},
					{
						key   : 'recordedFormat',
						label : '録画ファイル名フォーマット',
						
						input: {
							type       : 'text',
							value      : config.recordedFormat,
							width      : 300,
							placeholder: '[<date:yymmdd-HHMM>]<title>.m2ts'
						}
					},
					{
						key   : 'operSchedulerProcessTime',
						label : 'EPG取得所要想定時間',
						
						description: '単位: ミリ秒',
						
						input: {
							type       : 'text',
							value      : config.operSchedulerProcessTime,
							placeholder: '1800000',
							width      : 100,
							toNumber   : true,
							validator  : 'numbers'
						}
					},
					{
						key   : 'operSchedulerIntervalTime',
						label : 'EPG取得間隔',
						
						description: '単位: ミリ秒',
						
						input: {
							type       : 'text',
							value      : config.operSchedulerIntervalTime,
							placeholder: '7200000',
							width      : 100,
							toNumber   : true,
							validator  : 'numbers'
						}
					},
					{
						key   : 'operSchedulerSleepStartHour',
						label : 'EPG取得休止開始時間',
						
						description: '単位: 時',
						
						input: {
							type       : 'text',
							value      : config.operSchedulerSleepStartHour,
							placeholder: '1',
							width      : 30,
							toNumber   : true,
							validator  : 'numbers'
						}
					},
					{
						key   : 'operSchedulerSleepEndHour',
						label : 'EPG取得休止終了時間',
						
						description: '単位: 時',
						
						input: {
							type       : 'text',
							value      : config.operSchedulerSleepEndHour,
							placeholder: '5',
							width      : 30,
							toNumber   : true,
							validator  : 'numbers'
						}
					}
				]
			}).render(contentBodyForm);
		}
	});
	
})();
