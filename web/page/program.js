(function() {
	
	document.observe('chinachu:reload', function() {
		document.stopObserving('chinachu:reload', arguments.callee);
		document.stopObserving('chinachu:reserves',  viewProgram);
		document.stopObserving('chinachu:recording', viewProgram);
		document.stopObserving('chinachu:recorded',  viewProgram);
	});
	
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
	
	var contentBody               = $$('#content-body.' + app.viewId).first();
	var programViewMain           = $$('#program-view-main-status-head.' + app.viewId).first();
	var programViewMainHead       = $$('#program-view-main-head.' + app.viewId).first();
	var programViewMainMeta       = $$('#program-view-main-meta.' + app.viewId).first();
	var programViewMainDetail     = $$('#program-view-main-detail.' + app.viewId).first();
	var programViewMainStatusList = $$('#program-view-main-status-list.' + app.viewId).first();
	var programViewMainStatusAtt  = $$('#program-view-main-status-att.' + app.viewId).first();
	var programViewSub            = $$('#program-view-sub.' + app.viewId).first();
	
	var loadCount = 0;
	
	// ビュー: プログラム
	function viewProgram() {
		if (app.chinachu.recorded.length === 0) return;
		
		++loadCount;
		var currentLoadCount = loadCount;
		
		programViewMain.update();
		programViewMainStatusList.update();
		programViewMainStatusAtt.update();
		programViewSub.update();
		
		param.cur = new Date().getTime();
		
		var program = app.f.getProgramById(app.query.id);
		
		if (program === null) {
			programViewMainHead.update('番組が見つかりません');
			return this;
		}
		
		// title
		programViewMainHead.update(program.title);
		
		// meta
		programViewMainMeta.update(
			dateFormat(new Date(program.start), 'yyyy/mm/dd HH:MM') + ' &ndash; ' +
			dateFormat(new Date(program.end), 'HH:MM') +
			' (' + (program.seconds / 60) + '分間) #' + program.id +
			'<br><small>' + program.category + ' / ' + program.channel.type + ': ' + 
			'<a href="#/search?skip=1&chid=' + program.channel.id + '">' + program.channel.name + '</a>' +
			'</small>'
		);
		
		// detail
		programViewMainDetail.update(program.detail || '説明なし');
		
		programViewSub.insert('<a onclick="new app.ui.CreateRuleByProgram(\'' + program.id + '\')">ルールを作成</a>');
		
		if (program._isReserves) {
			programViewMain.insert('この番組は予約済みです');
		}
		
		if (!program._isReserves && !program._isRecorded && !program._isRecording) {
			programViewSub.insert('<a onclick="new app.ui.Reserve(\'' + program.id + '\')">手動予約</a>');
		}
		
		if (program._isRecording) {
			programViewSub.insert('<a onclick="new app.ui.StopRecord(\'' + program.id + '\')">録画中止</a>');
		}
		
		if (program._isReserves && !program._isRecorded && program.isManualReserved) {
			programViewSub.insert('<a onclick="new app.ui.Unreserve(\'' + program.id + '\')">手動予約の取消</a>');
		}
		
		if (program._isRecording) {
			programViewMain.insert('この番組は現在録画中です');
			
			programViewMainStatusList.insert(
				'<dl>' +
				'<dt>プロセスID</dt><dd>' + program.pid + '</dd>' +
				'<dt>コマンド</dt><dd>' + program.command + '</dd>' +
				'<dt>保存先パス</dt><dd>' + program.recorded + '</dd>' +
				'<dt>チューナー名 (番号)</dt><dd>' + program.tuner.name + ' (' + program.tuner.n + ')</dd>' +
				'<dt>スクランブル</dt><dd>' + (program.tuner.isScrambling ? 'はい' : 'いいえ') + '</dd>' +
				'</dl>'
			);
		}
		
		if (app.chinachu.status.feature.streamer && program._isRecording && !program.tuner.isScrambling) {
			programViewSub.insert(
				'<a onclick="new app.ui.Streamer(\'' + program.id + '\')">ストリーミング再生</a>'
			);
		}
		
		if (program._isRecorded) {
			programViewMain.insert('この番組は録画済みです');
			
			programViewMainStatusList.insert(
				'<dl>' +
				'<dt>コマンド</dt><dd>' + program.command + '</dd>' +
				'<dt>保存先パス</dt><dd>' + program.recorded + '</dd>' +
				'<dt>チューナー名 (番号)</dt><dd>' + program.tuner.name + ' (' + program.tuner.n + ')</dd>' +
				'<dt>スクランブル</dt><dd>' + (program.tuner.isScrambling ? 'はい' : 'いいえ') + '</dd>' +
				'</dl>'
			);
			
			programViewMainStatusAtt.insert(
				'<small>この番組情報は録画履歴に保存されています。' +
				'削除するには、<a onclick="new app.ui.Cleanup()">クリーンアップ</a>か' +
				'個別に<a onclick="new app.ui.RemoveRecordedProgram(\'' + program.id + '\')">録画履歴の削除</a>' +
				'を実行してください。</small>'
			);
			
			programViewSub.insert('<a onclick="new app.ui.RemoveRecordedProgram(\'' + program.id + '\')">録画履歴の削除</a>');
		}
		
		if (program._isRecorded) {
			new Ajax.Request('./api/recorded/' + program.id + '/file.json', {
				method: 'get',
				onSuccess: function(t) {
					if (currentLoadCount !== loadCount) return;
					
					if (app.chinachu.status.feature.filer) {
						programViewSub.insert(
							'<a onclick="new app.ui.RemoveRecordedFile(\'' + program.id + '\')">録画ファイルの削除</a>'
						);
					}
					
					if (app.chinachu.status.feature.streamer && !program.tuner.isScrambling) {
						programViewSub.insert(
							'<a onclick="new app.ui.Streamer(\'' + program.id + '\')">ストリーミング再生</a>'
						);
					}
					
					programViewMainStatusList.insert(
						'<dl>' +
						'<dt>ファイルサイズ</dt><dd>' + (t.responseJSON.size / 1024 / 1024 / 1024 / 1).toFixed(2) + 'GB</dd>' +
						'</dl>'
					);
				}.bind(this),
				onFailure: function(t) {
					if (currentLoadCount !== loadCount) return;
					
					if (t.status === 410) {
						programViewMainStatusAtt.insert(
							'<p class="color-red">※この番組の録画ファイルは移動または削除されています。</p>'
						);
					}
				}
			});
		}
		
		if (app.chinachu.status.feature.previewer && program._isRecording) {
			new Ajax.Request('./api/recording/' + program.id + '/preview.txt', {
				method    : 'get',
				parameters: {width: 640, height: 360, nonce: new Date().getTime()},
				onSuccess : function(t) {
					if (currentLoadCount !== loadCount) return;
					
					contentBody.style.backgroundImage = 'url(' + t.responseText + ')';
				}
			});
		}
		
		if (app.chinachu.status.feature.previewer && program._isRecorded) {
			new Ajax.Request('./api/recorded/' + program.id + '/preview.txt', {
				method    : 'get',
				parameters: {width: 640, height: 360, pos: 32},
				onSuccess : function(t) {
					if (currentLoadCount !== loadCount) return;
					
					contentBody.style.backgroundImage = 'url(' + t.responseText + ')';
				}
			});
		}
	}
	viewProgram();
	document.observe('chinachu:reserves',  viewProgram);
	document.observe('chinachu:recording', viewProgram);
	document.observe('chinachu:recorded',  viewProgram);
	
})();
