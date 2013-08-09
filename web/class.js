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
	
	var util = chinachu.util = {};
	
	/** section: util
	 * class util
	**/
	
	/**
	 *  util.scotify(program) -> String
	 *  - program (Program Object): Program Data.
	 *
	 *  プログラムデータをSCOT形式の文字列にします
	**/
	util.scotify = function(program) {
		var scot = '';
		
		scot = program.channel.name + ': ' + program.title +
			' (' + dateToString(new Date(program.start), 'short') + ') ' + 
			'[chinachu://' + program.id + ']';
		
		return scot;
	};
	
	/**
	 *  util.getProgramById(programId) -> Program Object | null
	 *  - programId (String): Program ID.
	 *
	 *  プログラムIDでプログラムデータを取得します
	**/
	util.getProgramById = function _getProgramById(id) {
		for (var i = 0; i < global.chinachu.recorded.length; i++) {
			if (global.chinachu.recorded[i].id === id) {
				global.chinachu.recorded[i]._isRecorded = true;
				return global.chinachu.recorded[i];
			}
		}
		
		for (var i = 0; i < global.chinachu.recording.length; i++) {
			if ((global.chinachu.recording[i].id === id) && (global.chinachu.recording[i].pid)) {
				global.chinachu.recording[i]._isRecording = true;
				return global.chinachu.recording[i];
			}
		}
		
		for (var i = 0; i < global.chinachu.reserves.length; i++) {
			if (global.chinachu.reserves[i].id === id) {
				global.chinachu.reserves[i]._isReserves = true;
				return global.chinachu.reserves[i];
			}
		}
		
		for (var i = 0; i < global.chinachu.schedule.length; i++) {
			for (var j = 0; j < global.chinachu.schedule[i].programs.length; j++) {
				if (global.chinachu.schedule[i].programs[j].id === id) {
					return global.chinachu.schedule[i].programs[j];
				}
			}
		}
		
		return null;
	};
	
	/**
	 *  util.getNextProgramById(programId) -> Program Object | null
	 *  - programId (String): Program ID.
	 *
	 *  プログラムIDの次のプログラムを取得します
	**/
	util.getNextProgramById = function _getNextProgramById(id) {
		
		for (var i = 0; i < global.chinachu.schedule.length; i++) {
			for (var j = 0; j < global.chinachu.schedule[i].programs.length; j++) {
				if (global.chinachu.schedule[i].programs[j].id === id) {
					if (typeof global.chinachu.schedule[i].programs[j + 1] !== 'undefined') {
						return util.getProgramById(global.chinachu.schedule[i].programs[j + 1].id);
					}
				}
			}
		}
		
		return null;
	};
	
	/**
	 *  util.getPrevProgramById(programId) -> Program Object | null
	 *  - programId (String): Program ID.
	 *
	 *  プログラムIDの前のプログラムを取得します
	**/
	util.getPrevProgramById = function _getPrevProgramById(id) {
		
		for (var i = 0; i < global.chinachu.schedule.length; i++) {
			for (var j = 0; j < global.chinachu.schedule[i].programs.length; j++) {
				if (global.chinachu.schedule[i].programs[j].id === id) {
					if (j - 1 < 0) return null;
					
					if (typeof global.chinachu.schedule[i].programs[j - 1] !== 'undefined') {
						return util.getProgramById(global.chinachu.schedule[i].programs[j - 1].id);
					}
				}
			}
		}
		
		return null;
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
			this.modal = new flagrate.Modal({
				title: 'スケジューラーの実行',
				text : '全てのルールと手動予約から競合を検出してスケジューリングを行います',
				buttons: [
					{
						label   : '実行',
						color   : '@orange',
						onSelect: function(e, modal) {
							this.button.disable();
							
							new Ajax.Request('./api/scheduler.json', {
								method    : 'put',
								onComplete: function() {
									modal.close();
								},
								onSuccess: function() {
									new flagrate.Modal({
										title: '成功',
										text : 'スケジューラーを実行しました'
									}).show();
								},
								onFailure: function(t) {
									new flagrate.Modal({
										title: '失敗',
										text : 'スケジューラーが失敗しました (' + t.status + ')'
									}).show();
								}
							});
						}
					},
					{
						label   : '中止',
						onSelect: function(e, modal) {
							modal.close();
						}
					}
				]
			});
			
			this.modal.show();
			
			return this;
		}
	});
	
	ui.Reserve = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'エラー',
					text : '番組が見つかりませんでした'
				}); 
			} else {
				this.modal = new flagrate.Modal({
					title   : '手動予約',
					subtitle: this.program.title + ' #' + this.program.id,
					text    : '予約しますか？',
					buttons: [
						{
							label   : '予約',
							color   : '@red',
							onSelect: function(e, modal) {
								e.targetButton.disable();
								
								new Ajax.Request('./api/program/' + this.program.id + '.json', {
									method    : 'put',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										new flagrate.Modal({
											title: '成功',
											text : '予約しました'
										}).show();
									},
									onFailure: function(t) {
										new flagrate.Modal({
											title: '失敗',
											text : '予約に失敗しました (' + t.status + ')'
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label   : 'キャンセル',
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.show();
			
			return this;
		}
	});
	
	ui.Unreserve = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'エラー',
					text : '番組が見つかりませんでした'
				}); 
			} else {
				this.modal = new flagrate.Modal({
					title   : '手動予約の取消',
					subtitle: this.program.title + ' #' + this.program.id,
					text    : '予約を取り消しますか？',
					buttons: [
						{
							label   : '予約取消',
							color   : '@red',
							onSelect: function(e, modal) {
								e.targetButton.disable();
								
								new Ajax.Request('./api/reserves/' + this.program.id + '.json', {
									method    : 'delete',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										new flagrate.Modal({
											title: '成功',
											text : '予約を取り消しました'
										}).show();
									},
									onFailure: function(t) {
										new flagrate.Modal({
											title: '失敗',
											text : '予約の取消に失敗しました (' + t.status + ')'
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label   : 'キャンセル',
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.show();
			
			return this;
		}
	});
	
	ui.Skip = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'エラー',
					text : '番組が見つかりませんでした'
				}); 
			} else {
				this.modal = new flagrate.Modal({
					title   : 'スキップ',
					subtitle: this.program.title + ' #' + this.program.id,
					text    : '自動予約された今回の番組をスキップしますか？',
					buttons: [
						{
							label   : 'スキップ',
							color   : '@red',
							onSelect: function(e, modal) {
								e.targetButton.disable();
								
								new Ajax.Request('./api/reserves/' + this.program.id + '/skip.json', {
									method    : 'put',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										new flagrate.Modal({
											title: '成功',
											text : 'スキップを有効にしました'
										}).show();
									},
									onFailure: function(t) {
										new flagrate.Modal({
											title: '失敗',
											text : 'スキップに失敗しました (' + t.status + ')'
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label   : 'キャンセル',
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.show();
			
			return this;
		}
	});
	
	ui.Unskip = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'エラー',
					text : '番組が見つかりませんでした'
				}); 
			} else {
				this.modal = new flagrate.Modal({
					title   : 'スキップの取消',
					subtitle: this.program.title + ' #' + this.program.id,
					text    : 'スキップを取り消しますか？',
					buttons: [
						{
							label   : 'スキップの取消',
							color   : '@red',
							onSelect: function(e, modal) {
								e.targetButton.disable();
								
								new Ajax.Request('./api/reserves/' + this.program.id + '/unskip.json', {
									method    : 'put',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										new flagrate.Modal({
											title: '成功',
											text : 'スキップを取り消しました'
										}).show();
									},
									onFailure: function(t) {
										new flagrate.Modal({
											title: '失敗',
											text : 'スキップの取消に失敗しました (' + t.status + ')'
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label   : 'キャンセル',
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.show();
			
			return this;
		}
	});
	
	ui.StopRecord = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'エラー',
					text : '番組が見つかりませんでした'
				});
			} else {
				this.modal = new flagrate.Modal({
					title   : '録画中止',
					subtitle: this.program.title + ' #' + this.program.id,
					text    : '本当によろしいですか？',
					buttons: [
						{
							label   : '録画中止',
							color   : '@red',
							onSelect: function(e, modal) {
								e.targetButton.disable();
								
								new Ajax.Request('./api/recording/' + this.program.id + '.json', {
									method    : 'delete',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										new flagrate.Modal({
											title: '成功',
											text : '録画を中止しました'
										}).show();
									},
									onFailure: function(t) {
										new flagrate.Modal({
											title: '失敗',
											text : '録画中止に失敗しました (' + t.status + ')'
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label   : 'キャンセル',
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.show();
			
			return this;
		}
	});
	
	ui.RemoveRecordedProgram = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'エラー',
					text : '番組が見つかりませんでした'
				});
			} else {
				this.modal = new flagrate.Modal({
					title   : '録画履歴の削除',
					subtitle: this.program.title + ' #' + this.program.id,
					text    : '録画履歴を削除すると、システムはこの番組の録画ファイルの場所を見失います。',
	
					buttons: [
						{
							label  : '削除',
							color  : '@red',
							onSelect: function(e, modal) {
								e.targetButton.disable();
								
								new Ajax.Request('./api/recorded/' + this.program.id + '.json', {
									method    : 'delete',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										new flagrate.Modal({
											title: '成功',
											text : '録画履歴の削除に成功しました'
										}).show();
									},
									onFailure: function(t) {
										new flagrate.Modal({
											title: '失敗',
											text : '録画履歴の削除に失敗しました (' + t.status + ')'
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label  : 'キャンセル',
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.show();
			
			return this;
		}
	});
	
	ui.RemoveRecordedFile = Class.create({
		initialize: function _init(id) {
			this.program = util.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) {
				this.modal = new flagrate.Modal({
					title: 'エラー',
					text : '番組が見つかりませんでした'
				});
			} else {
				this.modal = new flagrate.Modal({
					title: '録画ファイルの削除',
					subtitle: this.program.title + ' #' + this.program.id,
					text : '録画ファイルを削除します。これは復元できません。',
					buttons: [
						{
							label  : '削除',
							color  : '@red',
							onSelect: function(e, modal) {
								e.targetButton.disable();
								
								new Ajax.Request('./api/recorded/' + this.program.id + '/file.json', {
									method    : 'delete',
									onComplete: function() {
										modal.close();
									},
									onSuccess: function() {
										new flagrate.Modal({
											title: '成功',
											text : '録画ファイルの削除に成功しました'
										}).show();
									},
									onFailure: function(t) {
										
										var err = t.status;
										
										if (err === 410) err += ':既に削除されています';
										
										new flagrate.Modal({
											title: '失敗',
											text : '録画ファイルの削除に失敗しました (' + err + ')'
										}).show();
									}
								});
							}.bind(this)
						},
						{
							label  : 'キャンセル',
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				});
			}
			
			this.modal.show();
			
			return this;
		}
	});
	
	ui.Cleanup = Class.create({
		initialize: function _init() {
			this.create();
			
			return this;
		},
		create: function _create() {
			this.modal = new flagrate.Modal({
				title: 'クリーンアップ',
				text : '全ての録画履歴の中から録画ファイルを見失った項目を削除します。',
				buttons: [
					{
						label  : 'クリーンアップ',
						color  : '@red',
						onSelect: function(e, modal) {
							e.targetButton.disable();
							
							new Ajax.Request('./api/recorded.json', {
								method    : 'put',
								onComplete: function() {
									modal.close();
								},
								onSuccess: function() {
									new flagrate.Modal({
										title: '成功',
										text : 'クリーンアップに成功しました'
									}).show();
								},
								onFailure: function(t) {
									new flagrate.Modal({
										title: '失敗',
										text : 'クリーンアップに失敗しました (' + t.status + ')'
									}).show();
								}
							});
						}.bind(this)
					},
					{
						label  : 'キャンセル',
						onSelect: function(e, modal) {
							modal.close();
						}
					}
				]
			});
			
			this.modal.show();
			
			return this;
		}
	});
	
	ui.Streamer = Class.create({
		initialize: function _init(id) {
			
			window.location.hash = '!/program/watch/id=' + id + '/';
			
			return this;
		}
	});
	
	ui.StreamerPlayer = Class.create({
		initialize: function _init(id, d) {
			this.program = util.getProgramById(id);
			this.target  = $('content');
			this.d       = d;
			
			this.create();
			this.show();
			
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
				var modal = new flagrate.Modal({
					title: 'エラー',
					text : 'ルールの指定が不正です。'
				}).show(); 
			} else {
				// フォームに表示させるルールを読み込む
				var num = this.num;
				new Ajax.Request('./api/rules/' + num + '.json', {
					method   : 'get',
					onSuccess: function(t) {
						
						var rule = t.responseJSON;
						
						var modal = new flagrate.Modal({
							title: 'ルール編集',
							buttons: [
								{
									label  : '変更',
									color  : '@pink',
									onSelect: function(e, modal) {
										e.targetButton.disable();
										
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
												
												new flagrate.Modal({
													title: '成功',
													text : 'ルール変更に成功しました',
													onClose: function(){}
												}).show();
											},
											onFailure: function(t) {
												new flagrate.Modal({
													title: '失敗',
													text : 'ルール変更に失敗しました (' + t.status + ')',
													onClose: function(){}
												}).show();
											}
										});
									}
								},
								{
									label  : 'キャンセル',
									onSelect: function(e, modal) {
										modal.close();
									}
								}
							]
						}).show();
						
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
					}.bind(this),
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
				var modal = new flagrate.Modal({
					title: 'エラー',
					text : '不正なアクセスです。'
				}).show(); 
			} else {
				var modal = new flagrate.Modal({
					title: '新規作成',
					element: new Element('div'),
					buttons: [
						{
							label  : '作成',
							color  : '@pink',
							onSelect: function(e, modal) {
								e.targetButton.disable();
								
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
										new flagrate.Modal({
											title: '成功',
											text : 'ルール作成に成功しました',
											onClose: function(){}
										}).show();
									},
									onFailure: function(t) {
										new flagrate.Modal({
											title: '失敗',
											text : 'ルール作成に失敗しました (' + t.status + ')',
											onClose: function(){}
										}).show();
									}
								});
								
							}
						},
						{
							label  : 'キャンセル',
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				}).show();
				
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
			this.program = util.getProgramById(id);
			
			this.create();
			
			return this;
		},
		create: function _create() {
			if (this.program === null) { //のちにエラー処理を追加
				var modal = new flagrate.Modal({
					title: 'エラー',
					text : '不正なアクセスです。'
				}).show(); 
			} else {
				var program = this.program;
				var modal = new flagrate.Modal({
					title: '新規作成',
					element: new Element('div'),
					buttons: [
						{
							label  : '作成',
							color  : '@pink',
							onSelect: function(e, modal) {
								e.targetButton.disable();
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
										new flagrate.Modal({
											title: '成功',
											text : 'ルール作成に成功しました',
											onClose: function(){}
										}).show();
									},
									onFailure: function(t) {
										new flagrate.Modal({
											title: '失敗',
											text : 'ルール作成に失敗しました (' + t.status + ')',
											onClose: function(){}
										}).show();
									}
								});
								
							}
						},
						{
							label  : 'キャンセル',
							onSelect: function(e, modal) {
								modal.close();
							}
						}
					]
				}).show();
				
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