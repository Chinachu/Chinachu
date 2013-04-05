(function _class_chinachu() {
	
	"use strict";
	
	// for debug
	var PARAM = window.location.search.replace('?', '').toQueryParams();
	var DEBUG = (PARAM.debug === 'on');
	if ((typeof window.console !== 'object') || (DEBUG === false)) {
		var console = {
			log    : function(){}, debug  : function(){}, info      : function(){}, warn  : function(){},
			error  : function(){}, assert : function(){}, dir       : function(){}, dirxml: function(){},
			trace  : function(){}, group  : function(){}, groupEnd  : function(){}, time  : function(){},
			timeEnd: function(){}, profile: function(){}, profileEnd: function(){}, count : function(){}
		};
	} else {
		var console = window.console;
	}
	
	// sakura global scope
	if (typeof window.chinachu !== 'undefined') {
		console.error('[conflict]', 'chinachu is already defined.');
		
		return false;
	}
	var chinachu = window.chinachu = {};
	
	console.info('[welcome]', 'initializing chinachu class.');
	
	// Objectをディープコピー
	var objectCloner = chinachu.objectCloner = function _objectCloner(object) {
		return Object.toJSON(object).evalJSON();
	};
	
	// Dateオブジェクトを見やすい文字列に変換する
	var dateToString = chinachu.dateToString = function _dateToString(date, type) {
		var d = date;
		
		var dStr = [
			d.getFullYear(),
			(d.getMonth() + 1).toPaddedString(2),
			d.getDate().toPaddedString(2)
		].join('/') + ' ' + [
			d.getHours().toPaddedString(2),
			d.getMinutes().toPaddedString(2)
		].join(':');
		
		var dDelta = ((new Date().getTime() - d.getTime()) / 1000);
		
		if (dDelta < 0) {
			dDelta -= dDelta * 2;
			
			if (dDelta < 60) {
				var dDeltaStr = 'after {0} seconds'.__([Math.round(dDelta) || '0']);
			} else {
				dDelta = dDelta / 60;
				
				if (dDelta < 60) {
					var dDeltaStr = 'after {0} minutes'.__([Math.round(dDelta * 10) / 10 || '0']);
				} else {
					dDelta = dDelta / 60;
					
					if (dDelta < 24) {
						var dDeltaStr = 'after {0} hours'.__([Math.round(dDelta * 10) / 10 || '0']);
					} else {
						dDelta = dDelta / 24;
						
						var dDeltaStr = 'after {0} days'.__([Math.round(dDelta * 10) / 10 || '0']);
					}
				}
			}
		} else {
			if (dDelta < 60) {
				var dDeltaStr = '{0} seconds ago'.__([Math.round(dDelta) || '0']);
			} else {
				dDelta = dDelta / 60;
				
				if (dDelta < 60) {
					var dDeltaStr = '{0} minutes ago'.__([Math.round(dDelta * 10) / 10 || '0']);
				} else {
					dDelta = dDelta / 60;
					
					if (dDelta < 24) {
						var dDeltaStr = '{0} hours ago'.__([Math.round(dDelta * 10) / 10 || '0']);
					} else {
						dDelta = dDelta / 24;
						
						var dDeltaStr = '{0} days ago'.__([Math.round(dDelta * 10) / 10 || '0']);
					}
				}
			}
		}
		
		if (typeof type === 'undefined' || type === 'full') {
			return dStr + ' (' + dDeltaStr + ')';
		} else if (type === 'short') {
			return dStr;
		} else if (type === 'delta') {
			return dDeltaStr;
		}
	};
	
	var api = chinachu.api = {};
	
	/** section: api
	 * class chinachu.api.Client
	**/
	api.Client = Class.create({
		
		/**
		 *  new chinachu.api.Client(parameter) -> chinachu.api.Client
		 *  - parameter (Object)
		 *
		 *  ##### Parameter
		 *
		 *  * `apiRoot`          (String; default `"./"`):
		 *  * `retryCount`       (Number; default `0`):
		 *  * `onRequest`        (Function):
		 *  * `onRequested`      (Function):
		**/
		initialize: function _initApiClient(p) {
			this.apiRoot = p.apiRoot || './';
			
			this.onCreateRequest   = p.onCreateRequest   || Prototype.emptyFunction;
			this.onCompleteRequest = p.onCompleteRequest || Prototype.emptyFunction;
			
			this.requestCount = 0;
			this.requestTable = [];
			
			this.optionalRequestHeaders  = [];
			this.optionalRequestParameter= {};
			
			return this;
		},
		
		request: function _requestApiClient(url, p, retryCount) {
			// 完全なURLかどうかを判定
			if (url.match(/^http/) === null) {
				url = this.apiRoot + url;
			}
			
			var param  = p.param  || {};
			var method = p.method || 'get';
			
			var requestHeaders = [
				'X-Chinachu-Client-Version', '3'
			].concat(this.optionalRequestHeaders);
			
			param = Object.extend(param, {
				Count: param.Count || 0
			});
			
			param = Object.extend(param, this.optionalRequestParameter);
			
			// インクリメント
			++this.requestCount;
			
			var retryCount  = retryCount || this.retryCount;
			
			var requestState = this.requestTable[this.requestCount] = {
				id         : this.requestCount,
				requestedAt: new Date().getTime(),
				createdAt  : null,
				completedAt: null,
				latency    : null,
				execution  : null,
				transport  : null,
				param      : param,
				method     : method.toUpperCase(),
				headers    : requestHeaders,
				url        : url,
				p          : p,
				status     : 'init'
			};
			
			new Ajax.Request(url, {
				method        : method,
				requestHeaders: requestHeaders,
				parameters    : Object.toJSON(param).replace(/%/g, '\\u0025'),
				
				// リクエスト作成時
				onCreate: function _onCreateRequest(t) {
					requestState.status    = 'create';
					requestState.transport = t;
					
					console.log(
						'api.Client', 'req#' + requestState.id, '(create)', '->', requestState.method,
						url.replace(this.apiRoot, ''), t
					);
					
					requestState.createdAt = new Date().getTime();
					
					if (p.onCreate) p.onCreate(t);
					
					this.onCreateRequest(t);
					
					document.fire('chinachu:api:client:request:create', requestState);
				}.bind(this),
				
				// リクエスト完了時
				onComplete: function _onCompleteRequest(t) {
					requestState.status     = 'complete';
					requestState.transport  = t;
					requestState.completedAt= new Date().getTime();
					requestState.execution  = Math.round((t.getHeader('X-Sakura-Proxy-Microtime') || 0) / 1000);
					requestState.latency    = requestState.completedAt - requestState.createdAt;
					
					var time = [requestState.execution, requestState.latency].join('|') + 'ms';
					
					console.log(
						'api.Client', 'req#' + requestState.id, time, '<-', requestState.method,
						url.replace(this.apiRoot, ''), t.status, t.statusText, t
					);
					
					var res = localizeKeys(t.responseJSON) || {};
					
					// 結果を評価
					var isSuccess = ((t.status >= 200) && (t.status < 300));
					if (isSuccess) {
						
						// 成功コールバック
						if (p.onSuccess) p.onSuccess(t, res);
					}
					
					var isFailure = !isSuccess;
					if (isFailure) {
						
						// 失敗コールバック
						if (p.onFailure) p.onFailure(t, res);
					}
					
					// 最後に完了時の処理を
					if (p.onComplete) p.onComplete(t, res);
					
					this.onCompleteRequest(t, res);
					
					document.fire('chinachu:api:client:request:complete', requestState);
				}.bind(this)
			});
			
			return this;
		}
	});
	
	var ui = chinachu.ui = {};
	
	ui.ContentLoading = Class.create({
		initialize: function _init(opt) {
			if (!opt) { var opt = {}; }
			
			this.progress   = 0;
			this.target     = document.body
			this.onComplete = opt.onComplete || function _empty() {};
			
			this.create();
			
			return this;
		},
		create: function _draw() {
			this.entity = {
				container: new Element('div', {className: 'content-loading'}),
				frame    : new Element('div'),
				bar      : new Element('div')
			};
			
			this.entity.container.insert(this.entity.frame);
			this.entity.frame.insert(this.entity.bar);
			
			this.redraw();
			
			return this;
		},
		update: function _update(num) {
			if (num >= 100) {
				setTimeout(this.onComplete, 0);
				
				num = 100;
			}
			
			this.progress = num;
			
			this.redraw();
			
			return this;
		},
		redraw: function _redraw() {
			this.entity.bar.setStyle({width: this.progress.toString(10) + '%'});
			
			return this;
		},
		render: function _render(target) {
			$(target.entity || target || this.target).insert({top: this.entity.container});
			
			return this;
		},
		remove: function _remove() {
			this.entity.bar.remove();
			this.entity.frame.remove();
			this.entity.container.remove();
			
			this.entity.bar       = null;
			this.entity.frame     = null;
			this.entity.container = null;
			
			delete this.entity;
			delete this.target;
			delete this.progress;
			delete this;
			
			return true;
		}
	});
	
	ui.DynamicTime = Class.create(sakura.ui.Element, {
		
		init: function(opt) {
			
			this.tagName = opt.tagName || 'span';
			
			this.time  = opt.time;
			this.timer = 0;
			this.type  = opt.type || 'delta';
			
			return this;
		},
		
		create: function() {
			
			var wait = 1;
			
			this.entity = this.entity || new Element(this.tagName, this.attr);
			
			if (this.id !== null) this.entity.id = this.id;
			
			if (this.style !== null) this.entity.setStyle(this.style);
			
			this.entity.className = 'dynamic-time';
			
			if (this.className !== null) this.entity.addClassName(this.className);
			
			this.entity.update(chinachu.dateToString(new Date(this.time), this.type));
			
			var delta = ((new Date().getTime() - this.time) / 1000);
			
			if (delta < 0) delta -= delta * 2;
			
			if (delta < 9600) wait = 60 * 60;
			if (delta < 4800) wait = 60 * 30;
			if (delta < 2400) wait = 60 * 10;
			if (delta < 1200) {
				wait = 60 * 5;
				this.entity.addClassName('soon');
			}
			if (delta < 360) wait = 60;
			if (delta < 120) {
				wait = 30;
				this.entity.addClassName('now');
			}
			if (delta < 60) wait = 10;
			if (delta < 30) wait = 5;
			if (delta < 10) wait = 1;
			
			this.timer = setTimeout(this.create.bind(this), wait * 1000);
			
			return this;
		},
		
		remove: function() {
			
			clearTimeout(this.timer);
			
			try {
				this.entity.remove() && this.entity.fire('sakura:remove');
			} catch (e) {
				//console.debug(e);
			}
			
			return this;
		}
	});
	
	ui.ExecuteScheduler = Class.create({
		initialize: function _init() {
			this.create();
			
			return this;
		},
		create: function _create() {
			this.modal = new Hypermodal({
				title  : 'スケジューラの実行',
				content: '本当によろしいですか？<br>スケジューラはルールを適用し、手動予約との競合も検出します。',
				buttons: [
					{
						label  : '実行',
						color  : '@orange',
						onClick: function(e, btn, modal) {
							btn.disable();
							
							new Ajax.Request('./api/scheduler.json', {
								method    : 'put',
								onComplete: function() {
									modal.close();
								},
								onSuccess: function() {
									app.router.save(window.location.hash.replace('#', ''));
									
									new Hypermodal({
										title  : '成功',
										content: 'スケジューラは完了しました'
									}).render();
								},
								onFailure: function(t) {
									new Hypermodal({
										title  : '失敗',
										content: 'スケジューラは失敗しました (' + t.status + ')'
									}).render();
								}
							});
						}.bind(this)
					},
					{
						label  : 'キャンセル',
						onClick: function(e, btn, modal) {
							modal.close();
						}
					}
				]
			});
			
			this.modal.render();
			
			return this;
		}
	});
	
	ui.Reserve = Class.create({
		initialize: function _init(id) {
			this.program = app.f.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new Hypermodal({
					title  : 'エラー',
					content: '番組が見つかりませんでした'
				}); 
			} else {
				this.modal = new Hypermodal({
					title  : '手動予約',
					description: this.program.title + ' #' + this.program.id,
					content: '本当によろしいですか？',
					buttons: [
						{
							label  : '手動予約',
							color  : '@red',
							onClick: function(e, btn, modal) {
								btn.disable();
								
								new Ajax.Request('./api/program/' + this.program.id + '.json', {
									method    : 'put',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										app.router.save(window.location.hash.replace('#', ''));
										
										new Hypermodal({
											title  : '成功',
											content: '手動予約に成功しました'
										}).render();
									},
									onFailure: function(t) {
										new Hypermodal({
											title  : '失敗',
											content: '手動予約に失敗しました (' + t.status + ')'
										}).render();
									}
								});
							}.bind(this)
						},
						{
							label  : 'キャンセル',
							onClick: function(e, btn, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.render();
			
			return this;
		}
	});
	
	ui.Unreserve = Class.create({
		initialize: function _init(id) {
			this.program = app.f.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new Hypermodal({
					title  : 'エラー',
					content: '番組が見つかりませんでした'
				}); 
			} else {
				this.modal = new Hypermodal({
					title  : '手動予約の取消',
					description: this.program.title + ' #' + this.program.id,
					content: '本当によろしいですか？',
					buttons: [
						{
							label  : '手動予約の取消',
							color  : '@red',
							onClick: function(e, btn, modal) {
								btn.disable();
								
								new Ajax.Request('./api/reserves/' + this.program.id + '.json', {
									method    : 'delete',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										app.router.save(window.location.hash.replace('#', ''));
										
										new Hypermodal({
											title  : '成功',
											content: '手動予約の取消に成功しました'
										}).render();
									},
									onFailure: function(t) {
										new Hypermodal({
											title  : '失敗',
											content: '手動予約の取消に失敗しました (' + t.status + ')'
										}).render();
									}
								});
							}.bind(this)
						},
						{
							label  : 'キャンセル',
							onClick: function(e, btn, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.render();
			
			return this;
		}
	});

	ui.StopRecord = Class.create({
		initialize: function _init(id) {
			this.program = app.f.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new Hypermodal({
					title  : 'エラー',
					content: '番組が見つかりませんでした'
				});
			} else {
				this.modal = new Hypermodal({
					title  : '録画中止',
					description: this.program.title + ' #' + this.program.id,
					content: '本当によろしいですか？',
					buttons: [
						{
							label  : '録画中止',
							color  : '@red',
							onClick: function(e, btn, modal) {
								btn.disable();
								
								new Ajax.Request('./api/recording/' + this.program.id + '.json', {
									method    : 'delete',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										app.router.save(window.location.hash.replace('#', ''));
										
										new Hypermodal({
											title  : '成功',
											content: '録画中止に成功しました'
										}).render();
									},
									onFailure: function(t) {
										new Hypermodal({
											title  : '失敗',
											content: '録画中止に失敗しました (' + t.status + ')'
										}).render();
									}
								});
							}.bind(this)
						},
						{
							label  : 'キャンセル',
							onClick: function(e, btn, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.render();
			
			return this;
		}
	});
	
	ui.RemoveRecordedProgram = Class.create({
		initialize: function _init(id) {
			this.program = app.f.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new Hypermodal({
					title  : 'エラー',
					content: '番組が見つかりませんでした'
				});
			} else {
				this.modal = new Hypermodal({
					title  : '録画履歴の削除',
					description: this.program.title + ' #' + this.program.id,
					content: '本当によろしいですか？<br>システムはこの録画ファイルを見失います。',
	
					buttons: [
						{
							label  : '削除',
							color  : '@red',
							onClick: function(e, btn, modal) {
								btn.disable();
								
								new Ajax.Request('./api/recorded/' + this.program.id + '.json', {
									method    : 'delete',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										app.router.save(window.location.hash.replace('#', ''));
										
										new Hypermodal({
											title  : '成功',
											content: '録画履歴の削除に成功しました'
										}).render();
									},
									onFailure: function(t) {
										new Hypermodal({
											title  : '失敗',
											content: '録画履歴の削除に失敗しました (' + t.status + ')'
										}).render();
									}
								});
							}.bind(this)
						},
						{
							label  : 'キャンセル',
							onClick: function(e, btn, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.render();
			
			return this;
		}
	});
	
	ui.RemoveRecordedFile = Class.create({
		initialize: function _init(id) {
			this.program = app.f.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new Hypermodal({
					title  : 'エラー',
					content: '番組が見つかりませんでした'
				});
			} else {
				this.modal = new Hypermodal({
					title  : '録画ファイルの削除',
					description: this.program.title + ' #' + this.program.id,
					content: '本当によろしいですか？<br>一度削除された録画ファイルは復元できません。',
					buttons: [
						{
							label  : '削除',
							color  : '@red',
							onClick: function(e, btn, modal) {
								btn.disable();
								
								new Ajax.Request('./api/recorded/' + this.program.id + '/file.json', {
									method    : 'delete',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										app.router.save(window.location.hash.replace('#', ''));
										
										new Hypermodal({
											title  : '成功',
											content: '録画ファイルの削除に成功しました'
										}).render();
									},
									onFailure: function(t) {
										new Hypermodal({
											title  : '失敗',
											content: '録画ファイルの削除に失敗しました (' + t.status + ')'
										}).render();
									}
								});
							}.bind(this)
						},
						{
							label  : 'キャンセル',
							onClick: function(e, btn, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.render();
			
			return this;
		}
	});
	
	ui.Cleanup = Class.create({
		initialize: function _init() {
			this.create();
			
			return this;
		},
		create: function _create() {
			this.modal = new Hypermodal({
				title  : 'クリーンアップ',
				content: '本当によろしいですか？<br>全ての録画履歴から録画ファイルを見失った項目を削除します。',
				buttons: [
					{
						label  : 'クリーンアップ',
						color  : '@red',
						onClick: function(e, btn, modal) {
							btn.disable();
							
							new Ajax.Request('./api/recorded.json', {
								method    : 'put',
								onComplete: function() {
									modal.close();
								},
								onSuccess: function() {
									app.router.save(window.location.hash.replace('#', ''));
									
									new Hypermodal({
										title  : '成功',
										content: 'クリーンアップに成功しました'
									}).render();
								},
								onFailure: function(t) {
									new Hypermodal({
										title  : '失敗',
										content: 'クリーンアップに失敗しました (' + t.status + ')'
									}).render();
								}
							});
						}.bind(this)
					},
					{
						label  : 'キャンセル',
						onClick: function(e, btn, modal) {
							modal.close();
						}
					}
				]
			});
			
			this.modal.render();
			
			return this;
		}
	});
	
	ui.Streamer = Class.create({
		initialize: function _init(id) {
			this.program = app.f.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new Hypermodal({
					title  : 'エラー',
					content: '番組が見つかりませんでした'
				});
				
				return this;
			}
			
			this.formContainer = new Element('div');
			
			this.form = new Hyperform({
				formWidth  : '100%',
				labelWidth : '100px',
				labelAlign : 'right',
				fields     : [
					{
						key  : 'start',
						label: '開始位置',
						input: {
							type      : 'radio',
							isRequired: true,
							items     : []
						}
					},
					{
						key  : 'format',
						label: 'コンテナ',
						input: {
							type      : 'radio',
							isRequired: true,
							items     : []
						}
					},
					{
						key  : 'vcodec',
						label: '映像コーデック',
						input: {
							type      : 'radio',
							isRequired: true,
							items     : [
								{
									label     : '無変換',
									value     : 'copy',
									isSelected: true
								},
								{
									label     : 'H.264',
									value     : 'libx264'
								},
								{
									label     : 'MPEG-2',
									value     : 'mpeg2video'
								}
							]
						},
						depends: [
							{ key: 'format', value: 'm2ts' }
						]
					},
					{
						key  : 'vcodec',
						label: '映像コーデック',
						input: {
							type      : 'radio',
							isRequired: true,
							items     : [
								{
									label     : 'H.264',
									value     : 'libx264',
									isSelected: true
								}/*,
								{
									label     : 'Sorenson H.263 (FLV1)',
									value     : 'flv'
								}*/
							]
						},
						depends: [
							{ key: 'format', value: 'f4v' }
						]
					},
					{
						key  : 'acodec',
						label: '音声コーデック',
						input: {
							type      : 'radio',
							isRequired: true,
							items     : [
								{
									label     : '無変換',
									value     : 'copy',
									isSelected: true
								},
								{
									label     : 'AAC',
									value     : 'libfdk_aac'
								}
							]
						},
						depends: [
							{ key: 'format', value: 'm2ts' }
						]
					},
					{
						key  : 'acodec',
						label: '音声コーデック',
						input: {
							type      : 'radio',
							isRequired: true,
							items     : [
								{
									label     : '無変換',
									value     : 'copy',
									isSelected: true
								},
								{
									label     : 'AAC',
									value     : 'libfdk_aac'
								}
							]
						},
						depends: [
							{ key: 'format', value: 'f4v' }
						]
					},
					{
						key  : 'size',
						label: 'サイズ',
						input: {
							type      : 'slider',
							isRequired: true,
							items     : [
								{
									label     : '320x180 (16:9)',
									value     : '320x180'
								},
								{
									label     : '640x360 (HVGAW/16:9)',
									value     : '640x360'
								},
								{
									label     : '640x480 (VGA/4:3)',
									value     : '640x480'
								},
								{
									label     : '960x540 (qHD/16:9)',
									value     : '960x540'
								},
								{
									label     : '1024x576 (WSVGA/16:9)',
									value     : '1024x576'
								},
								{
									label     : '1280x720 (HD/16:9)',
									value     : '1280x720',
									isSelected: true
								},
								{
									label     : '1920x1080 (FHD/16:9)',
									value     : '1920x1080'
								}
							]
						},
						depends: [
							{ key: 'vcodec', value: 'copy', operator: '!==' }
						]
					},
					{
						key  : 'bitrate',
						label: 'ビットレート',
						input: {
							type      : 'slider',
							isRequired: true,
							items     : [
								{
									label     : '256kbps',
									value     : '256k'
								},
								{
									label     : '512kbps',
									value     : '512k',
									isSelected: true
								},
								{
									label     : '1Mbps',
									value     : '1M'
								},
								{
									label     : '2Mbps',
									value     : '2M'
								},
								{
									label     : '3Mbps',
									value     : '3M'
								}
							]
						},
						depends: [
							{ key: 'vcodec', value: 'copy', operator: '!==' }
						]
					},
					{
						key  : 'ab',
						label: '音声ビットレート',
						input: {
							type      : 'slider',
							isRequired: true,
							items     : [
								{
									label     : '32kbps',
									value     : '32k'
								},
								{
									label     : '64kbps',
									value     : '64k'
								},
								{
									label     : '96kbps',
									value     : '96k',
									isSelected: true
								},
								{
									label     : '128kbps',
									value     : '128k'
								},
								{
									label     : '192kbps',
									value     : '192k'
								}
							]
						},
						depends: [
							{ key: 'acodec', value: 'copy', operator: '!==' }
						]
					}
				]
			});
			
			if (this.program._isRecording) {
				this.form.fields[0].input.items.push({
					label     : 'ライブ',
					value     : 'live',
					isSelected: true
				},
				{
					label     : '最初から',
					value     : '0'
				});
			} else {
				this.form.fields[0].input.items.push({
					label     : '最初から',
					value     : '0',
					isSelected: true
				});
			}
			
			if (Prototype.Browser.MobileSafari) {
				this.form.fields[1].input.items.push({
					label     : 'HLS (MPEG-2 TS)',
					value     : 'm3u8',
					isSelected: true
				});
			}
			
			if (!Prototype.Browser.MobileSafari) {
				this.form.fields[1].input.items.push({
					label     : 'MPEG-2 TS',
					value     : 'm2ts',
					isSelected: true
				});
				
				this.form.fields[1].input.items.push({
					label     : 'Flash Video',
					value     : 'f4v'
				});
				
				this.form.fields[1].input.items.push({
					label     : 'WebM (VP8,Vorbis)',
					value     : 'webm'
				});
			}
			
			this.form.render(this.formContainer);
			
			this.modal = new Hypermodal({
				title  : 'ストリーミング再生',
				description: this.program.title + ' #' + this.program.id,
				content: this.formContainer,
				buttons: [
					{
						label  : '再生',
						color  : '@pink',
						onClick: function(e, btn, modal) {
							if (this.form.validate() === false) { return; }
							
							var d = this.form.result();
							
							/*if ((d.format === 'm2ts') && (!window.navigator.plugins['VLC Web Plugin'])) {
								new Hypermodal({
									title  : 'エラー',
									content: 'MPEG-2 TSコンテナの再生にはVLC Web Pluginが必要です。'
								}).render();
								return;
							}*/
							
							if (d.format === 'm2ts') {
								new Hypermodal({
									title  : 'エラー',
									content: 'MPEG-2 TSコンテナの再生は未サポートです。XSPFが利用できます。'
								}).render();
								return;
							}
							
							modal.close();
							
							new ui.StreamerPlayer(this.program.id, d);
						}.bind(this)
					},
					{
						label  : 'XSPF',
						color  : '@orange',
						onClick: function(e, btn, modal) {
							if (this.form.validate() === false) { return; }
							
							var d = this.form.result();
							
							if (this.program._isRecording) {
								d.prefix = window.location.protocol + '//' + window.location.host + '/api/recording/' + this.program.id + '/';
								window.open('./api/recording/' + this.program.id + '/watch.xspf?' + Object.toQueryString(d));
							} else {
								d.prefix = window.location.protocol + '//' + window.location.host + '/api/recorded/' + this.program.id + '/';
								window.open('./api/recorded/' + this.program.id + '/watch.xspf?' + Object.toQueryString(d));
							}
						}.bind(this)
					},
					{
						label  : 'キャンセル',
						onClick: function(e, btn, modal) {
							modal.close();
						}
					}
				]
			}).render();
			
			if (Prototype.Browser.MobileSafari) {
				this.modal.buttons[1].disable();
			}
			
			return this;
		}
	});
	
	ui.StreamerPlayer = Class.create({
		initialize: function _init(id, d) {
			this.program = app.f.getProgramById(id);
			this.target  = $('content');
			this.d       = d;
			
			this.create();
			this.render();
			
			return this;
		},
		create: function _create() {
			this.entity = {
				container: new Element('div', {className: 'program-view black'}),
				content  : new Element('div', {className: 'main'}),
				info     : new Element('div', {className: 'sub'}),
				closeBtn : new Element('a', {className: 'program-view-close-button'}).insert('&times;')
			};
			
			this.entity.closeBtn.observe('click', this.remove.bind(this));
			
			this.entity.container.insert(this.entity.closeBtn);
			this.entity.container.insert(this.entity.content);
			this.entity.container.insert(this.entity.info);
			
			this.entity.content.setStyle({
				overflow: 'hidden'
			});
			
			this.redraw();
			
			return this;
		},
		redraw: function _redraw() {
			if (this.program === null) {
				this.entity.content.insert('<h1>番組が見つかりませんでした</h1>');
				this.entity.content.insert('<div class="meta">&times; をクリックするとこの画面を閉じます</div>');
				return this;
			}
			
			this.entity.info.insert('<h2>' + this.program.title + '</h2>');
			this.entity.info.insert(
				'<div class="meta">' +
				dateFormat(new Date(this.program.start), 'yyyy/mm/dd HH:MM') + ' &ndash; ' +
				dateFormat(new Date(this.program.end), 'HH:MM') +
				' (' + (this.program.seconds / 60) + '分間) #' + this.program.id +
				'<br><small>' + this.program.category + ' / [' + this.program.channel.type + '] ' + this.program.channel.name +
				'</small>' +
				'</div>'
			);
			this.entity.info.insert('<p class="detail">' + (this.program.detail || '説明なし') + '</p>');
			
			if (this.program._isRecording) {
				var video = window.location.protocol + '//' + window.location.host + '/api/recording/' + this.program.id + '/watch.' + this.d.format + '?' + Object.toQueryString(this.d);
				var thumb = window.location.protocol + '//' + window.location.host + '/api/recording/' + this.program.id + '/preview.jpg?width=1280&height=720';
			} else {
				var video = window.location.protocol + '//' + window.location.host + '/api/recorded/' + this.program.id + '/watch.' + this.d.format + '?' + Object.toQueryString(this.d);
				var thumb = window.location.protocol + '//' + window.location.host + '/api/recorded/' + this.program.id + '/preview.jpg?width=1280&height=720';
			}
			
			if ((this.d.format === 'm3u8') || this.d.format === 'webm') {
				this.entity.content.insert(
					'<video poster="' + thumb + '" src="' + video + '" width="100%" height="100%" controls autoplay></video>'
				);
			} else {
				this.entity.content.insert(
					'<object width="100%" height="100%" type="application/x-shockwave-flash" data="./lib/f4player/player.swf">' +
					'<param name="movie" value="./lib/f4player/player.swf" />' +
					'<param name="quality" value="high" />' +
					'<param name="scale" value="noscale" />' +
					'<param name="allowfullscreen" value="true" />' +
					'<param name="flashvars" value="skin=./lib/f4player/skins/mySkin.swf&autoplay=1&thumbnail=' + encodeURIComponent(thumb) + '&video=' + encodeURIComponent(video) + '" />' +
					'</object>'
				);
			}
			
			return this;
		},
		render: function _render() {
			this.target.update('<div id="content-body" class="bg-chinachu"></div>');
			this.target.insert({top: this.entity.container});
			
			document.observe('chinachu:reload', this.remove.bind(this));
			document.observe('chinachu:reload', function() {
				document.stopObserving('chinachu:reload', arguments.callee);
				document.stopObserving('chinachu:reload', this.remove);
			});
			
			return this;
		},
		remove: function _remove() {
			try {
				this.entity.content.remove();
				this.entity.container.remove();
				
				this.entity.content   = null;
				this.entity.container = null;
				
				delete this.program;
				delete this.entity;
				delete this.target;
				
				app.router.save(window.location.hash.replace('#', ''));
			} catch (e) { /* has been removed */ }
			
			return true;
		}
	});
	
	ui.EditRule = Class.create({
		initialize: function _init(ruleNum) {
			this.num = ruleNum;
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.num == null) {
				var modal = new Hypermodal({
					title  : 'エラー',
					content: 'ルールの指定が不正です。'
				}).render(); 
			} else {
				// フォームに表示させるルールを読み込む
				this.rule = {};
				var num = this.num;
				new Ajax.Request('./api/rules/' + num + '.json', {
					method   : 'get',
					onSuccess: function(t) {
						var rule = this.rule= t.responseJSON;
						
						var modal = new Hypermodal({
							title  : 'ルール詳細',
							content: new Element('div'),
							buttons: [
								{
									label  : '変更',
									color  : '@pink',
									onClick: function(e, btn, modal) {
										btn.disable();
										
										this.param = viewRuleForm.result();
										
										for (var i in this.param) {
											if (
												(Object.isNumber(this.param[i]) && isNaN(this.param[i])) ||
												(Object.isString(this.param[i]) && this.param[i].strip() === '') ||
												(Object.isArray(this.param[i])  && this.param[i].length === 0)
											) {
												if ('start,end,mini,maxi'.split(',').indexOf(i) === -1) {
													this.param[i] = 'null';
												} else {
													this.param[i] = '-1';
												}
											}
										}
										
										!this.param.isDisabled && (this.param.en = '');
										!!this.param.isDisabled && (this.param.dis = '');
										delete this.param.isDisabled;
										
										new Ajax.Request('./api/rules/' + num + '.json', {
											method    : 'put',
											parameters: this.param,
											onComplete: function() {
												modal.close();
											},
											onSuccess: function() {
												
												new Hypermodal({
													title  : '成功',
													content: 'ルール変更に成功しました',
													onClose: function(){
														app.router.save(window.location.hash.replace('#', ''));
													}
												}).render();
											},
											onFailure: function(t) {
												new Hypermodal({
													title  : '失敗',
													content: 'ルール変更に失敗しました (' + t.status + ')',
													onClose: function(){}
												}).render();
											}
										});
									}
								},
								{
									label  : '削除',
									color: '@red',
									onClick: function(e, btn, modal) {
										btn.disable();
										// ルールの削除確認
										this.modal = new Hypermodal({
											title  : '削除',
											description: 'Rule #' + num,
											content: '本当によろしいですか？',
											buttons: [
												{
													label  : '削除',
													color  : '@red',
													onClick: function(e, btn, modal) {
														btn.disable();
														
														new Ajax.Request('./api/rules/' + num + '.json', {
															method    : 'delete',
															onComplete: function() {
																modal.close();
															},
															onSuccess: function() {
																new Hypermodal({
																	title  : '成功',
																	content: 'ルール削除に成功しました',
																	onClose: function(){
																		app.router.save(window.location.hash.replace('#', ''));
																	}
																}).render();
															},
															onFailure: function(t) {
																new Hypermodal({
																	title  : '失敗',
																	content: 'ルール削除に失敗しました (' + t.status + ')'
																}).render();
															}
														});
													}.bind(this)
												},
												{
													label  : 'キャンセル',
													onClick: function(e, btn, modal) {
														modal.close();
													}
												}
											]
										}).render();
										modal.close();
									}
								},
								{
									label  : 'キャンセル',
									onClick: function(e, btn, modal) {
										modal.close();
									}
								}
							]
						}).render();
						
						var viewRuleForm = new Hyperform({
							formWidth  : '100%',
							labelWidth : '100px',
							labelAlign : 'right',
							fields     : [
								{
									key   : 'type',
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
									key   : 'cat',
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
									key   : 'ch',
									label : '対象CH',
									input : {
										type  : 'tag',
										values: rule.channels 
									}
								},
								{
									key   : '^ch',
									label : '無視CH',
									input : {
										type  : 'tag',
										values: rule.ignore_channels
									}
								},
								{
									key   : 'flag',
									label : '対象フラグ',
									input : {
										type  : 'tag',
										values: rule.reserve_flags
									}
								},
								{
									key   : '^flag',
									label : '無視フラグ',
									input : {
										type  : 'tag',
										values: rule.ignore_flags
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
										value     : !!rule.hour ? rule.hour.start : '',
										toNumber  : true
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
										value     : !!rule.hour ? rule.hour.end : '',
										toNumber  : true
									}
								},
								{
									key   : 'mini',
									label : '最短長さ',
									input : {
										type      : 'text',
										width     : 60,
										appendText: '秒',
										value     : !!rule.duration ? rule.duration.min : '',
										toNumber  : true
									}
								},
								{
									key   : 'maxi',
									label : '最長長さ',
									input : {
										type      : 'text',
										width     : 60,
										appendText: '秒',
										value     : !!rule.duration ? rule.duration.max : '',
										toNumber  : true
									}
								},
								{
									key   : 'title',
									label : '対象タイトル',
									input : {
										type  : 'tag',
										values: rule.reserve_titles
									}
								},
								{
									key   : '^title',
									label : '無視タイトル',
									input : {
										type  : 'tag',
										values: rule.ignore_titles
									}
								},
								{
									key   : 'desc',
									label : '対象説明文',
									input : {
										type  : 'tag',
										values: rule.reserve_descriptions
									}
								},
								{
									key   : '^desc',
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
												value  : 0,
												isSelected: !!rule.isDisabled ? (rule.isDisabled === false) : true
											},
											{
												label  : '無効',
												value  : 1,
												isSelected: !!rule.isDisabled ? (rule.isDisabled === true) : false
											}
										]
									}
								}
							]
						}).render(modal.content);
					},
					onFailure: function(t) {
					}
				});
			}
			
			return this;
		}
	});
	
	ui.NewRule = Class.create({
		initialize: function _init() {
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (false) { //のちにエラー処理を追加
				var modal = new Hypermodal({
					title  : 'エラー',
					content: '不正なアクセスです。'
				}).render(); 
			} else {
				var modal = new Hypermodal({
					title  : '新規作成',
					content: new Element('div'),
					buttons: [
						{
							label  : '作成',
							color  : '@pink',
							onClick: function(e, btn, modal) {
								btn.disable();
								
								this.param = viewRuleForm.result();
								
								for (var i in this.param) {
									if (
										(Object.isNumber(this.param[i]) && isNaN(this.param[i])) ||
										(Object.isString(this.param[i]) && this.param[i].strip() === '') ||
										(Object.isArray(this.param[i])  && this.param[i].length === 0)
									) {
										if ('start,end,mini,maxi'.split(',').indexOf(i) === -1) {
											this.param[i] = 'null';
										} else {
											this.param[i] = '-1';
										}
									}
								}
								
								!this.param.isDisabled && (this.param.en = '');
								!!this.param.isDisabled && (this.param.dis = '');
								delete this.param.isDisabled;
								
								new Ajax.Request('./api/rules.json', {
									method    : 'post',
									parameters: this.param,
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										new Hypermodal({
											title  : '成功',
											content: 'ルール作成に成功しました',
											onClose: function(){
												app.router.save(window.location.hash.replace('#', ''));
											}
										}).render();
									},
									onFailure: function(t) {
										new Hypermodal({
											title  : '失敗',
											content: 'ルール作成に失敗しました (' + t.status + ')',
											onClose: function(){}
										}).render();
									}
								});
								
							}
						},
						{
							label  : 'キャンセル',
							onClick: function(e, btn, modal) {
								modal.close();
							}
						}
					]
				}).render();
				
				var viewRuleForm = new Hyperform({
					formWidth  : '100%',
					labelWidth : '100px',
					labelAlign : 'right',
					fields     : [
						{
							key   : 'type',
							label : 'タイプ',
							input : {
								type : 'checkbox',
								items: (function() {
									var array = [];
									
									['GR', 'BS', 'CS', 'EX'].each(function(a) {
										array.push({
											label     : a,
											value     : a,
										});
									});
									
									return array;
								})()
							}
						},
						{
							key   : 'cat',
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
											value     : a
										});
									});
									
									return array;
								})()
							}
						},
						{
							key   : 'ch',
							label : '対象CH',
							input : {
								type: 'tag'
							}
						},
						{
							key   : '^ch',
							label : '無視CH',
							input : {
								type: 'tag'
							}
						},
						{
							key   : 'flag',
							label : '対象フラグ',
							input : {
								type: 'tag'
							}
						},
						{
							key   : '^flag',
							label : '無視フラグ',
							input : {
								type: 'tag'
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
								toNumber  : true
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
								toNumber  : true
							}
						},
						{
							key   : 'mini',
							label : '最短長さ',
							input : {
								type      : 'text',
								width     : 60,
								appendText: '秒',
								toNumber  : true
							}
						},
						{
							key   : 'maxi',
							label : '最長長さ',
							input : {
								type      : 'text',
								width     : 60,
								appendText: '秒',
								toNumber  : true
							}
						},
						{
							key   : 'title',
							label : '対象タイトル',
							input : {
								type: 'tag'
							}
						},
						{
							key   : '^title',
							label : '無視タイトル',
							input : {
								type: 'tag'
							}
						},
						{
							key   : 'desc',
							label : '対象説明文',
							input : {
								type: 'tag'
							}
						},
						{
							key   : '^desc',
							label : '無視説明文',
							input : {
								type: 'tag'
							}
						},
						{
							key   : 'isDisabled',
							label : 'ルールの状態',
							input : {
								type : 'radio',
								items: [
									{
										label     : '有効',
										value     : 0,
										isSelected: true
									},
									{
										label: '無効',
										value: 1
									}
								]
							}
						}
					]
				}).render(modal.content);
			}
			
			return this;
		}
	});
	
	ui.CreateRuleByProgram = Class.create({
		initialize: function _init(id) {
			this.program = app.f.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) { //のちにエラー処理を追加
				var modal = new Hypermodal({
					title  : 'エラー',
					content: '不正なアクセスです。'
				}).render(); 
			} else {
				var program = this.program;
				var modal = new Hypermodal({
					title  : '新規作成',
					content: new Element('div'),
					buttons: [
						{
							label  : '作成',
							color  : '@pink',
							onClick: function(e, btn, modal) {
								btn.disable();
								this.param = viewRuleForm.result();
								
								for (var i in this.param) {
									if (
										(Object.isNumber(this.param[i]) && isNaN(this.param[i])) ||
										(Object.isString(this.param[i]) && this.param[i].strip() === '') ||
										(Object.isArray(this.param[i])  && this.param[i].length === 0)
									) {
										if ('start,end,mini,maxi'.split(',').indexOf(i) === -1) {
											this.param[i] = 'null';
										} else {
											this.param[i] = '-1';
										}
									}
								}
								
								!this.param.isDisabled && (this.param.en = '');
								!!this.param.isDisabled && (this.param.dis = '');
								delete this.param.isDisabled;
								
								new Ajax.Request('./api/rules.json', {
									method    : 'post',
									parameters: this.param,
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										new Hypermodal({
											title  : '成功',
											content: 'ルール作成に成功しました',
											onClose: function(){
												app.router.save(window.location.hash.replace('#', ''));
											}
										}).render();
									},
									onFailure: function(t) {
										new Hypermodal({
											title  : '失敗',
											content: 'ルール作成に失敗しました (' + t.status + ')',
											onClose: function(){}
										}).render();
									}
								});
								
							}
						},
						{
							label  : 'キャンセル',
							onClick: function(e, btn, modal) {
								modal.close();
							}
						}
					]
				}).render();
				
				var viewRuleForm = new Hyperform({
					formWidth  : '100%',
					labelWidth : '100px',
					labelAlign : 'right',
					fields     : [
						{
							key   : 'type',
							label : 'タイプ',
							input : {
								type : 'checkbox',
								items: (function() {
									var array = [];
									
									['GR', 'BS', 'CS', 'EX'].each(function(a) {
										array.push({
											label     : a,
											value     : a,
											isSelected: (program.channel.type.indexOf(a) !== -1)
										});
									});
									
									return array;
								})()
							}
						},
						{
							key   : 'cat',
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
											isSelected: (program.category.indexOf(a) !== -1)
										});
									});
									
									return array;
								})()
							}
						},
						{
							key   : 'ch',
							label : '対象CH',
							input : {
								type  : 'tag',
								values: [program.channel.id]
							}
						},
						{
							key   : '^ch',
							label : '無視CH',
							input : {
								type: 'tag'
							}
						},
						{
							key   : 'flag',
							label : '対象フラグ',
							input : {
								type  : 'tag',
								values: program.flags.without('新')
							}
						},
						{
							key   : '^flag',
							label : '無視フラグ',
							input : {
								type: 'tag'
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
								toNumber  : true
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
								toNumber  : true
							}
						},
						{
							key   : 'mini',
							label : '最短長さ',
							input : {
								type      : 'text',
								width     : 60,
								appendText: '秒',
								toNumber  : true
							}
						},
						{
							key   : 'maxi',
							label : '最長長さ',
							input : {
								type      : 'text',
								width     : 60,
								appendText: '秒',
								toNumber  : true
							}
						},
						{
							key   : 'title',
							label : '対象タイトル',
							input : {
								type  : 'tag',
								values: [
									this.program.title.replace(/【.+】/g, '')
													  .replace(/「.+」/g, '')
													  .replace(/(#[0-9]+|＃[０１２３４５６７８９]+)/g, '')
													  .replace(/第([0-9]+|[０１２３４５６７８９]+)話/g, '')
													  .strip()
								]
							}
						},
						{
							key   : '^title',
							label : '無視タイトル',
							input : {
								type: 'tag'
							}
						},
						{
							key   : 'desc',
							label : '対象説明文',
							input : {
								type: 'tag'
							}
						},
						{
							key   : '^desc',
							label : '無視説明文',
							input : {
								type: 'tag'
							}
						},
						{
							key   : 'isDisabled',
							label : 'ルールの状態',
							input : {
								type : 'radio',
								items: [
									{
										label     : '有効',
										value     : false,
										isSelected: true
									},
									{
										label: '無効',
										value: true
									}
								]
							}
						}
					]
				}).render(modal.content);
			}
			
			return this;
		}
	});
	
})();