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
	
	// ビュー: プログラム
	function viewProgram() {
		if (app.chinachu.recorded.length === 0) return;
		
		$('program-view-main-status-head').update();
		$('program-view-main-status-list').update();
		$('program-view-main-status-att').update();
		$('program-view-sub').update();
		
		param.cur = new Date().getTime();
		
		var program = app.f.getProgramById(app.query.id);
		
		if (program === null) {
			$('program-view-main-head').update('番組が見つかりません');
			return this;
		}
		
		// title
		$('program-view-main-head').update(program.title);
		
		// meta
		$('program-view-main-meta').update(
			dateFormat(new Date(program.start), 'yyyy/mm/dd HH:MM') + ' &ndash; ' +
			dateFormat(new Date(program.end), 'HH:MM') +
			' (' + (program.seconds / 60) + '分間) #' + program.id +
			'<br><small>' + program.category + ' / ' + program.channel.type + ': ' + 
			'<a href="#/search?skip=1&chid=' + program.channel.id + '">' + program.channel.name + '</a>' +
			'</small>'
		);
		
		// detail
		$('program-view-main-detail').update(program.detail || '説明なし');
		
		if (program._isReserves) {
			$('program-view-main-status-head').insert('この番組は予約済みです');
		}
		
		if (!program._isReserves && !program._isRecorded && !program._isRecording) {
			$('program-view-sub').insert('<a onclick="new app.ui.Reserve(\'' + program.id + '\')">手動予約</a>');
		}
		
		if (program._isRecording) {
			$('program-view-sub').insert('<a onclick="new app.ui.StopRecord(\'' + program.id + '\')">録画中止</a>');
		}
		
		if (program._isReserves && !program._isRecorded && program.isManualReserved) {
			$('program-view-sub').insert('<a onclick="new app.ui.Unreserve(\'' + program.id + '\')">手動予約の取消</a>');
		}
		
		if (program._isRecording) {
			$('program-view-main-status-head').insert('この番組は現在録画中です');
			
			$('program-view-main-status-list').insert(
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
			$('program-view-sub').insert(
				'<a onclick="new app.ui.Streamer(\'' + program.id + '\')">ストリーミング再生</a>'
			);
		}
		
		if (program._isRecorded) {
			$('program-view-main-status-head').insert('この番組は録画済みです');
			
			$('program-view-main-status-list').insert(
				'<dl>' +
				'<dt>コマンド</dt><dd>' + program.command + '</dd>' +
				'<dt>保存先パス</dt><dd>' + program.recorded + '</dd>' +
				'<dt>チューナー名 (番号)</dt><dd>' + program.tuner.name + ' (' + program.tuner.n + ')</dd>' +
				'<dt>スクランブル</dt><dd>' + (program.tuner.isScrambling ? 'はい' : 'いいえ') + '</dd>' +
				'</dl>'
			);
			
			$('program-view-main-status-att').insert(
				'<small>この番組情報は録画履歴に保存されています。' +
				'削除するには、<a onclick="new app.ui.Cleanup()">クリーンアップ</a>か' +
				'個別に<a onclick="new app.ui.RemoveRecordedProgram(\'' + program.id + '\')">録画履歴の削除</a>' +
				'を実行してください。</small>'
			);
			
			$('program-view-sub').insert('<a onclick="new app.ui.RemoveRecordedProgram(\'' + program.id + '\')">録画履歴の削除</a>');
		}
		
		if (program._isRecorded) {
			new Ajax.Request('./api/recorded/' + program.id + '.json', {
				method: 'get',
				onSuccess: function(t) {
					if (t.responseJSON.isRemoved) {
						$('program-view-main-status-att').insert(
							'<p class="color-red">※この番組の録画ファイルは移動または削除されています。</p>'
						);
					} else {
						if (app.chinachu.status.feature.filer) {
							$('program-view-sub').insert(
								'<a onclick="new app.ui.RemoveRecordedFile(\'' + program.id + '\')">録画ファイルの削除</a>'
							);
						}
						
						if (app.chinachu.status.feature.streamer && !program.tuner.isScrambling) {
							$('program-view-sub').insert(
								'<a onclick="new app.ui.Streamer(\'' + program.id + '\')">ストリーミング再生</a>'
							);
						}
					}
				}.bind(this)
			});
		}
		
		if (app.chinachu.status.feature.previewer && program._isRecording) {
			new Ajax.Request('./api/recording/' + program.id + '/preview.txt', {
				method    : 'get',
				parameters: {width: 640, height: 360, nonce: new Date().getTime()},
				onSuccess : function(t) {
					$('content-body').style.backgroundImage = 'url(' + t.responseText + ')';
				}
			});
		}
	}
	viewProgram();
	document.observe('chinachu:reserves',  viewProgram);
	document.observe('chinachu:recording', viewProgram);
	document.observe('chinachu:recorded',  viewProgram);
	
})();