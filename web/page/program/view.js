P = Class.create(P, {
	
	init: function() {
		
		this.view.content.className = 'loading';
		
		this.program = chinachu.util.getProgramById(this.self.query.id);
		
		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:reserves', this.onNotify);
		document.observe('chinachu:recording', this.onNotify);
		document.observe('chinachu:recorded', this.onNotify);
		
		if (this.program === null) {
			this.notFoundModal = new flagrate.Modal({
				title: '番組が見つかりません',
				text : '番組が見つかりません',
				buttons: [
					{
						label: 'ダッシュボード',
						color: '@pink',
						onSelect: function(e, modal) {
							window.location.hash = '!/dashboard/top/';
						}
					}
				]
			}).show();
			return this;
		}
		
		this.initToolbar();
		this.draw();
		
		return this;
	}
	,
	deinit: function() {
		
		if (this.notFoundModal) setTimeout(function() { this.notFoundModal.close(); }.bind(this), 0);
		
		document.stopObserving('chinachu:reserves', this.onNotify);
		document.stopObserving('chinachu:recording', this.onNotify);
		document.stopObserving('chinachu:recorded', this.onNotify);
		
		this.app.view.mainBody.entity.style.backgroundImage = '';
		
		return this;
	}
	,
	refresh: function() {
		
		this.app.pm.realizeHash(true);
		
		return this;
	}
	,
	initToolbar: function _initToolbar() {
		
		var program = this.program;
		
		this.view.toolbar.add({
			key: null,
			ui : new sakura.ui.Button({
				label  : 'ルールを作成',
				icon   : './icons/regular-expression.png',
				onClick: function() {
					new chinachu.ui.CreateRuleByProgram(program.id);
				}
			})
		});
		
		if (program._isReserves) {
			if (program.isManualReserved) {
				this.view.toolbar.add({
					key: null,
					ui : new sakura.ui.Button({
						label   : '予約取消',
						icon    : './icons/cross-script.png',
						onClick: function() {
							new chinachu.ui.Unreserve(program.id);
						}
					})
				});
			} else {
				if (program.isSkip) {
					this.view.toolbar.add({
						key: null,
						ui : new sakura.ui.Button({
							label   : 'スキップの取消',
							icon    : './icons/tick-circle.png',
							onClick: function() {
								new chinachu.ui.Unskip(program.id);
							}
						})
					});
				} else {
					this.view.toolbar.add({
						key: null,
						ui : new sakura.ui.Button({
							label   : 'スキップ',
							icon    : './icons/exclamation-red.png',
							onClick: function() {
								new chinachu.ui.Skip(program.id);
							}
						})
					});
				}
			}
		} else {
			if (!program._isRecorded) {
				this.view.toolbar.add({
					key: null,
					ui : new sakura.ui.Button({
						label   : '手動予約',
						icon    : './icons/plus-circle.png',
						onClick: function() {
							new chinachu.ui.Reserve(program.id);
						}
					})
				});
			}
		}
		
		if (program._isRecording) {
			this.view.toolbar.add({
				key: null,
				ui : new sakura.ui.Button({
					label   : '録画中止',
					icon    : './icons/cross.png',
					onClick: function() {
						new chinachu.ui.StopRecord(program.id);
					}
				})
			});
		}
		
		if (program._isRecorded) {
			this.view.toolbar.add({
				key: null,
				ui : new sakura.ui.Button({
					label  : '履歴の削除',
					icon   : './icons/eraser.png',
					onClick: function() {
						new chinachu.ui.RemoveRecordedProgram(program.id);
					}
				})
			});
			
			if (global.chinachu.status.feature.filer) {
				this.view.toolbar.add({
					key: 'remove-file',
					ui : new sakura.ui.Button({
						label  : 'ファイルの削除',
						icon   : './icons/cross-script.png',
						onClick: function() {
							new chinachu.ui.RemoveRecordedFile(program.id);
						}
					})
				});
			}
		}
		
		if (program.recorded) {
			if (global.chinachu.status.feature.filer) {
				this.view.toolbar.add({
					key: 'download',
					ui : new sakura.ui.Button({
						label  : 'ダウンロード',
						icon   : './icons/disk.png',
						onClick: function() {
							new chinachu.ui.DownloadRecordedFile(program.id);
						}
					})
				});
			}
			
			if (global.chinachu.status.feature.streamer && !program.tuner.isScrambling) {
				this.view.toolbar.add({
					key: 'streaming',
					ui : new sakura.ui.Button({
						label  : 'ストリーミング再生',
						icon   : './icons/film-youtube.png',
						onClick: function() {
							new chinachu.ui.Streamer(program.id);
						}
					})
				});
			}
		}
		
		return this;
	}
	,
	draw: function() {
		
		console.log(this.program);
		
		var program = this.program;
		
		this.view.content.className = 'bg-fog';
		this.view.content.update();
		
		var titleHtml = program.flags.invoke('sub', /.+/, '<span class="flag #{0}">#{0}</span>').join('') + program.title;
		if (program.subTitle && program.title.indexOf(program.subTitle) === -1) {
			titleHtml += ' <span class="subtitle">' + program.subTitle + '</span>';
		}
		if (typeof program.episode !== 'undefined' && program.episode !== null) {
			titleHtml += ' <span class="episode">#' + program.episode + '</span>';
		}
		titleHtml += ' <span class="id">#' + program.id + '</span>';
		
		if (program.isManualReserved) {
			titleHtml = ' <span class="flag manual">手動</span>' + titleHtml;
		}
		
		if (program.isSkip) {
			titleHtml = ' <span class="flag skip">スキップ</span>' + titleHtml;
		}
		
		setTimeout(function() {
			this.view.title.update(titleHtml);
		}.bind(this), 0);
		
		if (program._isReserves) {
			if (program.isSkip) {
				new sakura.ui.Alert({
					title       : 'スキップ',
					type        : 'blue',
					body        : 'この番組は自動録画予約されましたがスキップするように設定されています',
					disableClose: true
				}).render(this.view.content);
			} else if (program.isConflict) {
				new sakura.ui.Alert({
					title       : '競合',
					type        : 'red',
					body        : 'この番組は録画予約されていますが、競合のため録画されません',
					disableClose: true
				}).render(this.view.content);
			} else {
				new sakura.ui.Alert({
					title       : '予約済',
					type        : 'blue',
					body        : 'この番組は録画予約済みです',
					disableClose: true
				}).render(this.view.content);
			}
		}
		
		if (program._isRecording) {
			new sakura.ui.Alert({
				title       : '録画中',
				type        : 'red',
				body        : program.recorded,
				disableClose: true
			}).render(this.view.content);
		}
		
		if (program._isRecorded) {
			new sakura.ui.Alert({
				title       : '録画済',
				type        : 'green',
				body        : program.recorded,
				disableClose: true
			}).render(this.view.content);
		}
		
		var meta = new flagrate.Element('div', { 'class': 'program-meta' }).update(
			' &ndash; ' +
			dateFormat(new Date(program.end), 'HH:MM') +
			' (' + (program.seconds / 60) + '分間)<br>' + 
			'<small><span class="bg-cat-' + program.category + '">' + program.category + '</span> / ' + program.channel.type + ': ' + 
			'<a href="#!/search/top/skip=1&chid=' + program.channel.id + '/">' + program.channel.name + '</a>' +
			'</small>'
		).insertTo(this.view.content);
		
		meta.insert({ top: 
			new chinachu.ui.DynamicTime({
				tagName: 'span',
				type   : 'full',
				time   : program.start
			}).entity
		});
		
		new flagrate.Element('div', { 'class': 'program-detail' }).update(
			program.detail
		).insertTo(this.view.content);
		
		new sakura.ui.Alert({
			title       : '完全なタイトル',
			type        : 'white',
			body        : program.fullTitle,
			disableClose: true
		}).render(this.view.content);
		
		if (program.command) {
			new sakura.ui.Alert({
				title       : '録画コマンド',
				type        : 'white',
				body        : program.command,
				disableClose: true
			}).render(this.view.content);
		}
		
		if (program._isRecording) {
			new sakura.ui.Alert({
				title       : 'プロセスID',
				type        : 'white',
				body        : program.pid,
				disableClose: true
			}).render(this.view.content);
		}
		
		if (program.tuner) {
			new sakura.ui.Alert({
				title       : 'チューナー(番号)',
				type        : 'white',
				body        : program.tuner.name + ' (' + program.tuner.n + ')',
				disableClose: true
			}).render(this.view.content);
		}
		
		if (program._isRecorded) {
			new Ajax.Request('./api/recorded/' + program.id + '/file.json', {
				method: 'get',
				onSuccess: function(t) {
					
					if (this.app.pm.p.id !== this.id) return;
					
					new sakura.ui.Alert({
						title       : 'ファイルサイズ',
						type        : 'white',
						body        : (t.responseJSON.size / 1024 / 1024 / 1024 / 1).toFixed(2) + 'GB',
						disableClose: true
					}).render(this.view.content);
					
				}.bind(this),
				onFailure: function(t) {
					
					if (this.app.pm.p.id !== this.id) return;
					
					if (t.status === 410) {
						new sakura.ui.Alert({
							type        : 'red',
							body        : 'この番組の録画ファイルは移動または削除されています',
							disableClose: true
						}).render(this.view.content);
						
						this.view.toolbar.one('remove-file').disable();									
						this.view.toolbar.one('download').disable();
						this.view.toolbar.one('streaming').disable();
					}
				}.bind(this)
			});
		}
		
		if (global.chinachu.status.feature.previewer && program._isRecording) {
			new Ajax.Request('./api/recording/' + program.id + '/preview.txt', {
				method    : 'get',
				parameters: {width: 640, height: 360, nonce: new Date().getTime()},
				onSuccess : function(t) {
					
					if (this.app.pm.p.id !== this.id) return;
					
					this.app.view.mainBody.entity.style.backgroundImage = 'url(' + t.responseText + ')';
				}.bind(this)
			});
		}
		
		if (global.chinachu.status.feature.previewer && program._isRecorded) {
			new Ajax.Request('./api/recorded/' + program.id + '/preview.txt', {
				method    : 'get',
				parameters: {width: 640, height: 360, pos: 32},
				onSuccess : function(t) {
					
					if (this.app.pm.p.id !== this.id) return;
					
					this.app.view.mainBody.entity.style.backgroundImage = 'url(' + t.responseText + ')';
				}.bind(this)
			});
		}
		
		return this;
	}
});
