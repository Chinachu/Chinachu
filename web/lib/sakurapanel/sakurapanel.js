/*!
 *  sakurapanel JavaScript Control Panel UI Class-object Library
 *
 *  Copyright 2012, SAKURA Internet Inc and Contributors.
 *  sakurapanel is freely distributable under the terms of an MIT-style license.
**/
(function _sakurapanel() {

	"use strict";

	// for debug
	var param = window.location.search.replace('?', '').toQueryParams();
	var debug = (param.debug === 'on');
	if ((typeof window.console !== 'object') || (debug === false)) {
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
	if (typeof window.sakura !== 'undefined') {
		console.error('[conflict]', 'sakura is already defined.');

		return false;
	}
	var sakura = window.sakura = {
		version: 'beta3'
	};

	console.info('[welcome]', 'initializing sakurapanel.');

	/**
	 *  sakura.id(various) -> various
	 *  - various (Object) - Optional argument...
	 *
	 *  [[sakura.id]] is identity function,
	 *  it returns its `various` untouched.
	 *
	 *  ##### Examples
	 *
	 *      sakura.id('hello world!');
	 *      // -> 'hello world!'
	 *
	 *      sakura.id(256);
	 *      // -> 256
	 *
	 *      sakura.id(sakura.id);
	 *      // -> sakura.id
	**/
	sakura.id = function _id(a) {
		return a;
	};

	var i18n = sakura.i18n = {};
	var api  = sakura.api  = {};
	var util = sakura.util = {};
	var page = sakura.page = {};
	var ui   = sakura.ui   = {};

	/**
	 *  sakura.shortcut
	 *
	 *  shortcut manager
	 *  forked from shortcut.js by Binny V A, BSD license
	**/
	var shortcut = {
		_shortcut: {}//All the shortcuts are stored in here
		,
		/**
		 *  sakura.shortcut.add(combination[, callback, option]) -> sakura.shortcut
		 *  - combination (String) - key combination
		 *  - callback (function) - callback on when all keys pressed
		 *  - option (Object) - option
		 *
		 *
		**/
		add: function _addShortcut(combination, callback, opt) {
			if (typeof opt === 'undefined') opt = {};

			var target       = opt.target       || document;
			var type         = opt.type         || 'keydown';
			var propagate    = opt.propagate    || false;
			var protectInput = opt.protectInput || false;
			var keycode      = opt.keycode      || null;

			if (typeof target === 'string') {
				target = $(target);
			}

			combination = combination.toLowerCase();

			// The function to be called at keypress
			function onKeyPress(e) {
				e = e || window.event;

				// Dont't enable shortcut keys in Input, Textarea fields
				if (protectInput === true) {
					var ele = e.target || e.srcElement;

					if (ele.nodeType === 3) {
						ele = ele.parentNode;
					}

					if ((ele.tagName === 'INPUT') || (ele.tagName === 'TEXTAREA')) {
						return;
					}
				}

				// Find Witch key is pressed
				var code = e.keyCode || e.witch;

				var chara = String.fromCharCode(code).toLowerCase();

				if (code === 188) chara = ',';
				if (code === 190) chara = '.';

				var keys = combination.split('+');

				// counts the number of valid keypresses
				var pressed = 0;

				var shiftNums = {
					"`" : "~",
					"1" : "!",
					"2" : "@",
					"3" : "#",
					"4" : "$",
					"5" : "%",
					"6" : "^",
					"7" : "&",
					"8" : "*",
					"9" : "(",
					"0" : ")",
					"-" : "_",
					"=" : "+",
					";" : ":",
					"'" : "\"",
					"," : "<",
					"." : ">",
					"/" : "?",
					"\\": "|"
				};

				var specialKeys = {
					'esc'      : 27,
					'escape'   : 27,
					'tab'      : 9,
					'space'    : 32,
					'return'   : 13,
					'enter'    : 13,
					'backspace': 8,

					'scrolllock' : 145,
					'scroll_lock': 145,
					'scroll'     : 145,
					'capslock'   : 20,
					'caps_lock'  : 20,
					'caps'       : 20,
					'numlock'    : 144,
					'num_lock'   : 144,
					'num'        : 144,

					'pause': 19,
					'break': 19,

					'insert': 45,
					'home'  : 36,
					'delete': 46,
					'end'   : 35,

					'pageup' : 33,
					'page_up': 33,
					'pu'     : 33,

					'pagedown' : 34,
					'page_down': 34,
					'pd'       : 34,

					'left' : 37,
					'up'   : 38,
					'right': 39,
					'down' : 40,

					'f1' : 112,
					'f2' : 113,
					'f3' : 114,
					'f4' : 115,
					'f5' : 116,
					'f6' : 117,
					'f7' : 118,
					'f8' : 119,
					'f9' : 120,
					'f10': 121,
					'f11': 122,
					'f12': 123
				};

				var modifiers = {
					shift: { wanted:false, pressed:false},
					ctrl : { wanted:false, pressed:false},
					alt  : { wanted:false, pressed:false},
					meta : { wanted:false, pressed:false}//Meta is Mac specific
				};

				if (e.ctrlKey)  modifiers.ctrl.pressed  = true;
				if (e.shiftKey) modifiers.shift.pressed = true;
				if (e.altKey)   modifiers.alt.pressed   = true;
				if (e.metaKey)  modifiers.meta.pressed  = true;

				for (var i = 0; i < keys.length; i++) {
					var k = keys[i];

					// Modifiers
					if (k === 'ctrl' || k === 'control') {
						pressed++;
						modifiers.ctrl.wanted = true;
					} else if (k === 'shift') {
						pressed++;
						modifiers.shift.wanted = true;
					} else if (k === 'alt') {
						pressed++;
						modifiers.alt.wanted = true;
					} else if (k === 'meta') {
						pressed++;
						modifiers.meta.wanted = true;
					} else if (k.length > 1) {
						// If it is a special key
						if (specialKeys[k] === code) {
							pressed++;
						}
					} else if (keycode !== null) {
						if (keycode === code) {
							pressed++;
						}
					} else {
						// The special keys did not match
						if (chara === k) {
							pressed++;
						} else {
							if(shiftNums[chara] && e.shiftKey) { //Stupid Shift key bug created by using lowercase
								chara = shiftNums[chara];
								if (chara === k) {
									pressed++;
								}
							}
						}
					}
				}//<--for

				var isValid = (
					pressed                 === keys.length &&
					modifiers.ctrl.pressed  === modifiers.ctrl.wanted &&
					modifiers.shift.pressed === modifiers.shift.wanted &&
					modifiers.alt.pressed   === modifiers.alt.wanted &&
					modifiers.meta.pressed  === modifiers.meta.wanted
				);
				if (isValid) {
					callback(e);

					// Stop the event
					if (opt.propagate === false) {
						// e.cancelBubble is supported by IE - this will kill the bubbling process.
						e.cancelBubble = true;
						e.returnValue = false;

						//e.stopPropagation works in Firefox.
						if (e.stopPropagation) {
							e.stopPropagation();
							e.preventDefault();
						}
						return false;
					}
				}
			}//<--onKeyPress()

			this._shortcut[combination] = {
				callback: onKeyPress,
				target: target,
				type: type
			};

			// Attach the function with the event
			target.observe(type, onKeyPress, false);

			return this;
		}//<--add:
		,
		remove: function _remove(combination) {
			combination = combination.toLowerCase();

			if (typeof this._shortcut[combination] === 'undefined') {
				return this;
			}

			var s = this._shortcut[combination];

			s.target.stopObserving(s.type, s.callback, false);

			delete this._shortcut[combination];

			return this;
		}//<--remove:
	};
	sakura.shortcut = shortcut;

	/** section: i18n
	 * class sakura.i18n.Localization
	**/
	i18n.Localization = Class.create({

		/**
		 *  new sakura.i18n.Localization(parameter) -> sakura.ui.Localization
		 *  - parameter (Object) - optional
		 *
		 *  ##### Parameter
		 *
		 *  * `locales`     (Array; default`["en"]`):
		 *  * `localesPath` (String; default `"./locales"`):
		 *  * `forceLocale` (String):
		 *  * `onReady`     (Function):
		**/
		initialize: function _initLocalization(opt) {
			// config
			this.locales     = opt.locales     || ['en'];
			this.localesPath = opt.localesPath || './locales/';
			this.locale      = opt.forceLocale || param.locale || (window.navigator.language || window.navigator.userLanguage).substr(0, 2) || this.locales[0];
			this.onReady     = opt.onReady     || null;
			this.translation = {};

			if (this.locales.indexOf(this.locale) === -1) {
				this.locale = this.locales[0];
			}

			new Ajax.Request(this.localesPath + this.locale + '.json', {
				method   : 'get',

				onCreate : function _onCreate(t) {
					console.info('i18n.Localization', 'create', t.request.url);
				},

				onComplete: function _onComplete(t) {
					this.onReady();
				}.bind(this),

				onSuccess: function _onSuccess(t) {
					console.info('i18n.Localization', 'success', t.request.url, t.status);

					this.translation = t.responseJSON || t.responseText.evalJSON();
				}.bind(this),

				onFailure: function _onFailure(t) {
					console.warn('i18n.Localization', 'failure', t.request.url, t.status);
				}
			});

			return this;
		}//<--initialize:
		,
		/**
		 *  sakura.i18n.Localization#convert(string , words) -> String
		 *  - string (String)
		 *  - words  (Array) - optional
		**/
		convert: function _convert(string, words) {
			if (typeof words === 'string') words = [words];
			if (typeof words === 'undefined') var words = [];

			if (this.translation) {
				string = string.toUpperCase();

				if (this.translation[string]) {
					string = this.translation[string];
				}
			}

			string.scan(/\{[0-9]+\}/, function(a) {
				var key   = a[0];
				var order = parseInt(key.match(/\{([0-9]+)\}/)[1], 10);
				var word  = words[order] || '';

				string = string.replace(key, word);
			});

			return string;
		}//<--convert:
	});//<--i18n.Localization

	//
	// api.Requester
	//
	api.Requester = Class.create({
		/**
		 *  new sakura.api.Requester({option}) -> Instance
		 *
		 *  Constructor.
		**/
		initialize: function _initRequest(api, opt) {
			this.id  = Math.random().toString(10);
			this.api = api;

			if (!opt) var opt = {};

			// config
			this.label         = opt.label         || null;
			this.icon          = opt.icon          || null;
			this.ignoreFailure = opt.ignoreFailure || false;
			this.interval      = opt.interval      || 0;

			// queue
			this.queues = opt.queues || [];
			this.count  = opt.count  || 0;

			// events
			this.onEnqueue  = opt.onEnqueue  || Prototype.emptyFunction;
			this.onTick     = opt.onTick     || Prototype.emptyFunction;
			this.onRequest  = opt.onRequest  || Prototype.emptyFunction;
			this.onStart    = opt.onStart    || Prototype.emptyFunction;
			this.onResume   = opt.onResume   || Prototype.emptyFunction;
			this.onPause    = opt.onPause    || Prototype.emptyFunction;
			this.onStop     = opt.onStop     || Prototype.emptyFunction;
			this.onEnd      = opt.onEnd      || Prototype.emptyFunction;
			this.onComplete = opt.onComplete || Prototype.emptyFunction;
			this.onRemove   = opt.onRemove   || Prototype.emptyFunction;

			// status
			this.isRunning = false;
			this.isEnded   = false;

			document.fire('sakurapanel:api:requester:initialize', this);

			return this;
		}//<--initialize:
		,
		/**
		 *  Requester#enqueue(queue) -> sakura.api.Requester
		**/
		enqueue: function _enqueue(queue) {

			return this.push(queue);
		}
		,
		/**
		 *  Requester#push(queue) -> sakura.api.Requester
		**/
		push: function _push(queue) {
			queue.stat = 'waiting';

			this.queues.push(queue);

			this.onEnqueue();

			document.fire('sakurapanel:api:requester:enqueue', this);
			document.fire('sakurapanel:api:requester:push', this);

			return queue;
		}
		,
		/**
		 *  Requester#unshift(queue) -> sakura.api.Requester
		**/
		unshift: function _unshift(queue) {
			queue.stat = 'waiting';

			this.queues.unshift(queue);

			this.onEnqueue();

			document.fire('sakurapanel:api:requester:enqueue', this);
			document.fire('sakurapanel:api:requester:unshift', this);

			return queue;
		}
		,
		/**
		 *  Requester#insert(pos, queue) -> sakura.api.Requester
		**/
		insert: function _insert(pos, queue) {
			queue.stat = 'waiting';

			this.queues.splice(pos, 0, queue);

			this.onEnqueue();

			document.fire('sakurapanel:api:requester:enqueue', this);
			document.fire('sakurapanel:api:requester:insert', this);

			return queue;
		}
		,
		/**
		 *  Requester#tick() -> sakura.api.Requester
		**/
		tick: function _tick() {
			if (this.isRunning === false) return this;
			if (this.isEnded   === true) return this;

			if (this.count >= this.queues.length) {
				this.complete();
			} else {
				setTimeout(function() {
					this.request();
					++this.count;

					this.onTick();

					document.fire('sakurapanel:api:requester:tick', this);
				}.bind(this), this.interval);
			}

			return this;
		}//<--tick:
		,
		/**
		 *  Requester#request(queue) -> Instance
		 *
		 *  Request to API.
		**/
		request: function _request() {
			var queue = this.queues[this.count];

			queue.stat = 'request';

			this.api.request(queue.url, {
				method: queue.method || 'get',
				param : queue.param  || {}
				,
				onComplete: function(t, res) {
					queue.res = res;

					if (queue.onComplete) queue.onComplete(t, res);

					document.fire('sakurapanel:api:requester:request:complete', this);
				}.bind(this)
				,
				onSuccess: function(t, res) {
					if (!!queue.retryCheck && !queue.retryCheck(t, res)) {
						queue.stat = 'retry';

						--this.count;

						document.fire('sakurapanel:api:requester:request:retry', this);
					} else {
						queue.stat = 'success';

						if (queue.onSuccess) queue.onSuccess(t, res);

						document.fire('sakurapanel:api:requester:request:success', this);
					}

					this.tick();
				}.bind(this)
				,
				onFailure: function(t, res) {
					queue.stat = 'failure';

					if (queue.retryOnFailure) --this.count;

					if (queue.onFailure) queue.onFailure(t, res);

					document.fire('sakurapanel:api:requester:request:failure', this);

					if (!!this.ignoreFailure || !!queue.retryOnFailure) {
						this.tick();
					}
				}.bind(this)
			});

			this.onRequest();

			document.fire('sakurapanel:api:requester:request', this);

			return this;
		}//<--request:
		,
		/**
		 *  Requester#start() -> sakura.api.Requester
		**/
		start: function _start() {
			this.count = 0;
			this.isRunning = true;

			this.tick();

			this.onStart();

			document.fire('sakurapanel:api:requester:start', this);

			return this;
		}
		,
		/**
		 *  Requester#resume() -> sakura.api.Requester
		**/
		resume: function _restart() {
			this.isRunning = true;

			this.tick();

			this.onResume();

			document.fire('sakurapanel:api:requester:resume', this);

			return this;
		}
		,
		/**
		 *  Requester#pause() -> sakura.api.Requester
		**/
		pause: function _pause() {
			this.isRunning = false;

			this.onPause();

			document.fire('sakurapanel:api:requester:pause', this);

			return this;
		}
		,
		/**
		 *  Requester#stop() -> sakura.api.Requester
		**/
		stop: function _stop() {
			this.isRunning = false;

			this.onStop();

			document.fire('sakurapanel:api:requester:stop', this);

			return this;
		}
		,
		/**
		 *  Requester#end() -> sakura.api.Requester
		**/
		end: function _end() {
			this.isRunning = false;
			this.isEnded   = true;

			this.stop();

			this.onEnd();

			document.fire('sakurapanel:api:requester:end', this);

			return this;
		}
		,
		/**
		 *  Requester#complete() -> sakura.api.Requester
		**/
		complete: function _complete() {
			this.isRunning = false;

			this.end();

			this.onComplete();

			document.fire('sakurapanel:api:requester:complete', this);

			return this;
		}
		,
		/**
		 *  Requester#remove() -> sakura.api.Requester
		**/
		remove: function _remove() {
			this.isRunning = false;
			this.queues = [];

			this.onRemove();

			document.fire('sakurapanel:api:requester:remove', this);

			return this;
		}
	});//<--api.Requester

	//
	// util.Executer
	//
	util.Executer = Class.create({
		initialize: function() {
			this.functions = [];

			for (var i = 0; arguments.length > i; i++) {
				if (Object.isArray(arguments[i]) === true) {
					this.functions = this.functions.concat(arguments[i]);
				}

				if (Object.isFunction(arguments[i]) === true) {
					this.functions.push(arguments[i]);
				}
			}

			return this.run();
		},
		run: function() {
			for (var i = 0; this.functions.length > i; i++) {
				this.functions[i]()
			}

			return this;
		}
	});

	//
	// util.Countdown
	//
	util.Countdown = Class.create({
		initialize: function(pInitialValue, pFunction){
			this.i = pInitialValue;
			this.f = pFunction;
		},
		turn: function(){
			--this.i;
			if(this.i === 0){
				this.f();
			}
		}
	});

	/** section: util
	 *  class sakura.util.Loader
	**/
	util.Loader = Class.create({

		/**
		 *  new sakura.util.Loader(parameter) -> sakura.util.Loader
		 *  - parameter (Object) - parameter
		 *
		 *  ##### Parameter
		 *
		 *      sakura.loader({
		 *        url       : 'example.js',// resource URL.
		 *        ext       : 'js',// optional extension force.
		 *        callback  : function(){},// optional callback (for eval)
		 *        onCreate  : function(){},// optional callback
		 *        onComplete: function(){},// optional callback
		 *        onSuccess : function(){},// optional callback
		 *        onFailure : function(){}// optional callback
		 *      });
		 *
		 *  ##### Example
		 *
		 *      new sakura.util.Loader({url: 'example.css'});
		**/
		initialize: function _initLoader(opt) {
			var url        = opt.url     || null;
			if (url === null) return;

			var ext        = opt.ext        || url.match(/\.([^\.]+)$/)[1];
			var callback   = opt.callback   || null;
			var onCreate   = opt.onCreate   || function(){};
			var onComplete = opt.onComplete || function(){};
			var onSuccess  = opt.onSuccess  || function(){};
			var onFailure  = opt.onFailure  || function(){};

			var isDisableCache           = opt.isDisableCache           || false;
			var optionalRequestParameter = opt.optionalRequestParameter || null;

			// querystring
			if (isDisableCache || optionalRequestParameter !== null) {
				var qss = url.match(/\?([^#]+)/);
				var q   = {};

				if (qss !== null) {
					q = qss[1].toQueryParams();
				}

				if (isDisableCache) {
					q._nonce = new Date().getTime();
				}

				if (optionalRequestParameter !== null) {
					Object.extend(q, optionalRequestParameter);
				}

				var qs = Object.toQueryString(q);

				url = url.replace(/(\?[^#]*)?(#.+)?$/, '?' + qs + '$2');
			}

			if ((ext === 'js') && (!callback)) {

				var sc    = new Element('script', {
					type   : 'text/javascript',
					charset: 'utf-8',
					source : url,
					src    : url
				});

				if(Prototype.Browser.IE){
					try{
						sc.onreadystatechange = function(){
							if(this.readyState == 'loaded' || this.readyState == 'complete'){
								console.info('loader', 'success', url, ext);

								onComplete();
							}
						};
					}catch(e){
						sc.observe('load', function _onComplete() {
							console.info('loader', 'success', url, ext);

							onComplete();
						});
					}
				} else{
					sc.observe('load', function _onComplete() {
						console.info('loader', 'success', url, ext);

						onComplete();
					});
				};

				$$('script[source="' + url + '"]').each(function(e) {
					e.remove();
				});

				$$('head')[0].insert(sc);

				console.info('loader', 'create', url);

				onCreate();

			} else if ((ext === 'js') && (callback)) {

				var xhr = new XMLHttpRequest();

				xhr.onreadystatechange = function() {
					if (xhr.readyState === 4) { // DONE
						if (xhr.status === 200) { // OK
							console.info('loader', 'success', url, ext);

							callback(xhr.responseText);
						} else {
							console.warn('loader', 'failure', url, xhr.status);

							onFailure();
						}

						onComplete();
					}
				}

				xhr.open('GET', url);

				xhr.send();

				onCreate();

			} else {

				new Ajax.Request(url, {
					method  : 'get',
					onCreate: function _onCreate() {
						console.info('loader', 'create', url);

						onCreate();
					},
					onComplete: function _onComplete() {
						onComplete();
					},
					onSuccess: function _onSuccess(t) {
						console.info('loader', 'success', url, t.status);

						if (ext === 'css') {
							$$('head > style[source="' + url + '"]').each(function(el) {
								el.remove();
							});

							$$('head').first().insert(
								new Element('style', {
									type  : 'text/css',
									source: url
								}).insert(
									t.responseText
								)
							);
						}

						onSuccess();
					},
					onFailure: function _onFailure(t) {
						console.warn('loader', 'failure', url, t.status);

						onFailure();
					}
				});

			}

			return this;
		}
	});

	/** section: util
	 *  class sakura.util.Requires
	**/
	util.Requires = Class.create({

		/**
		 *  new sakura.util.Requires(requires, option) -> sakura.util.Requires
		 *  - requires (Array) - array of resource required.
		 *  - option   (Object | Function) - optional parameter or callback function.
		**/
		initialize: function(requires, option) {
			this.requires   = requires || [];
			this.onComplete = null;

			if (Object.isFunction(option) === true) {
				this.onComplete = option || null;
			} else if (typeof option === 'object') {
				this.onComplete               = option.onComplete || null;
				this.isDisableCache           = option.isDisableCache || false;
				this.optionalRequestParameter = option.optionalRequestParameter || null;
			}

			this.load();

			return this;
		},

		load: function() {
			if (this.requires.length === 0) {
				this.complete();

				return this;
			}

			new sakura.util.Loader({
				url                     : this.requires.shift(),
				onComplete              : this.load.bind(this),
				isDisableCache          : this.isDisableCache,
				optionalRequestParameter: this.optionalRequestParameter
			});

			return this;
		},

		complete: function() {
			if (this.onComplete !== null) this.onComplete();

			return this;
		}
	});

	/** section: page
	 * class sakura.page.Manager
	**/
	page.Manager = Class.create({

		/**
		 *  new sakura.page.Manager(parameter) -> sakura.page.Manager
		 *  - parameter (Object) - optional
		 *
		 *  ##### Parameter
		 *
		 *  * `hashPrefix`       (String; default `"!"`):
		 *  * `indexPath`        (String; default `"./page/"`):
		 *  * `indexName`        (String; default `"index.json"`):
		 *  * `onReady`          (Function):
		 *  * `onChangeCategory` (Function):
		 *  * `onChangePage`     (Function):
		 *  * `onLoadPage`       (Function):
		 *  * `onUnloadPage`     (Function):
		**/
		initialize: function _initPM(opt) {
			// application object
			this.app = opt.app || null;

			// config
			this.hashPrefix = opt.hashPrefix || '!';
			this.indexPath  = opt.indexPath  || './page/';
			this.indexName  = opt.indexName  || 'index';

			// events
			this.onReady          = opt.onReady          || function(){};
			this.onFailure        = opt.onFailure        || function(){};
			this.onChangeCategory = opt.onChangeCategory || function(){};
			this.onChangePage     = opt.onChangePage     || function(){};
			this.onLoadPage       = opt.onLoadPage       || function(){};
			this.onUnloadPage     = opt.onUnloadPage     || function(){};

			// internal container
			this.title   = new Element('h1');
			this.toolbar = new sakura.ui.Navbar();
			this.content = new Element('div');

			// index
			this.index    = null;
			this.category = null;
			this.page     = null;
			this.query    = null;
			this.pageData = null;
			this.p        = null;

			new Ajax.Request(this.indexPath + this.indexName + '.json', {
				method  : 'get',

				onCreate: function _onCreate(t) {
					console.info('page.Manager', 'create', t.request.url);
				},

				onSuccess: function _onSuccess(t) {
					console.info('page.Manager', 'success', t.request.url, t.status);

					this.index = t.responseJSON || t.responseText.evalJSON();

					this.onReady();
				}.bind(this),

				onFailure: function _onFailure(t) {
					console.warn('page.Manager', 'failure', t.request.url, t.status);

					this.onFailure();
				}.bind(this)
			});

			return this;
		},

		/**
		 *  sakura.page.Manager#enableHashControl() -> sakura.page.Manager
		**/
		enableHashControl: function _enableHashControlPM(reload) {
			if (this.hashControlInterval) {
				this.disableHashControl();
			}

			this.hashControlInterval = setInterval(this.realizeHash.bind(this), 250);
			setTimeout(this.realizeHash.bind(this), 0);

			if (reload && !!this.category && !!this.page) {
				this._lastHash = '';
				//this.load(this.category, this.page, this.query);
			}

			return this;
		},

		/**
		 *  sakura.page.Manager#disableHashControl() -> sakura.page.Manager
		**/
		disableHashControl: function _disableHashControlPM() {
			clearInterval(this.hashControlInterval);

			return this;
		},

		/**
		 *  sakura.page.Manager#realizeHash() -> sakura.page.Manager
		**/
		realizeHash: function _realizeHashPM(isForce) {
			var hash = window.location.hash.replace('#', '');

			if (this._lastHash && (this._lastHash === hash) && !isForce) return;
			this._lastHash = hash;

			if ((hash === '') || (hash.split('/')[0] !== this.hashPrefix) || !hash.split('/')[1]) {
				window.location.hash = [
					this.hashPrefix,
					this.index.defaultCategory,
					this.index.category[this.index.defaultCategory].defaultPage,
					''
				].join('/');

				console.info('page.Manager', 'REDIRECT', window.location.hash);

				return this;
			}

			this.unload();

			this.content.className = '';

			var h = hash.split('/');

			if (this.index.category[h[1]]) {
				if (h[2]) {
					if (this.index.category[h[1]].page[h[2]]) {
						var query = {};

						if (h[3]) query = h[3].toQueryParams();

						this.load(h[1], h[2], query);
					} else {
						this.content.update('Not Found (page)');
					}
				} else {
					window.location.hash = [
						this.hashPrefix,
						h[1],
						this.index.category[h[1]].defaultPage,
						''
					].join('/');
				}
			} else {
				this.content.update('Not Found (category)');
			}

			return this;
		},

		/**
		 *  sakura.page.Manager#load(category, page, query) -> sakura.page.Manager
		 *  - category (String)
		 *  - page     (String)
		 *  - query    (Object) - optional
		**/
		load: function _loadPM(category, page, query) {
			if (this.index === null) {
				return;
			}

			if (!this.index.category[category] || !this.index.category[category].page[page]) {
				return;
			}

			document.fire('sakurapanel:pm:reload');

			this.unload();

			this.content.className = 'loading';

			this.category = category;
			this.page     = page;
			this.query    = query || {};
			this.pageData = this.index.category[category].page[page];

			var url = this.indexPath + category + '/' + page + '.js';

			// load page
			var loadPage = function() {
				new sakura.util.Loader({
					url      : url,
					callback : this.initPage.bind(this),
					onComplete: function() {
						document.fire('sakurapanel:pm:complete');
					},
					onFailure: function() {
						this.title.update('Failed to load page script.');
						this.content.className = 'failure';
						document.fire('sakurapanel:pm:failure');
					}.bind(this)
				});
			}.bind(this);

			// load requires
			if (this.pageData.requires && (this.pageData.requires.length > 0)) {
				new sakura.util.Requires(this.pageData.requires, loadPage);
			} else {
				loadPage();
			}

			return this;
		},

		/**
		 *  sakura.page.Manager#unload() -> sakura.page.Manager
		**/
		unload: function _unloadPM() {
			if (this.p) {
				if (this.p.timer && Object.keys(this.p.timer).length >= 0) {
					for (var i in this.p.timer) {
						try {
							console.debug('clearing timer', i, this.p.timer[i]);
							clearTimeout(this.p.timer[i]);
							clearInterval(this.p.timer[i]);
						} catch (e) {
							console.error('unload', i, e);
						}
					}
				}

				if (this.p.draw) this.p.draw = Prototype.emptyFunction;
				if (this.p.deinit) this.p.deinit();

				this.p = null;
			}

			this.content.className = '';

			this.title.update();
			this.toolbar.removeAll();
			this.content.update();

			document.fire('sakurapanel:pm:unload');

			return this;
		},

		/**
		 *  sakura.page.Manager#initPage(script) -> sakura.page.Manager
		 *  - script (String) - PM formatted page script
		 *
		 *  (internal method)
		**/
		initPage: function _initPagePM(pageScriptText) {
			var P = Class.create({
				initialize: function(opt) {
					// env
					this.app   = opt.app;
					this.view  = opt.view;
					this.self  = opt.self;
					this.data  = {};
					this.timer = {};
					this.id    = new Date().getTime();

					// init
					this.init();
				},

				deinit: function _deinitDummy() { }
			});

			eval(pageScriptText);

			this.toolbar.removeAll();
			this.content.update();

			this.content.className = '';
			this.title.update(this.pageData.title);
			document.title = this.pageData.title;

			this.p = new P({
				app : this.app,
				view: {
					title  : this.title,
					toolbar: this.toolbar,
					content: this.content
				},
				self: {
					category: this.category,
					page    : this.page,
					pageData: this.pageData,
					url     : this.url,
					query   : this.query
				}
			});

			this.onLoadPage();
			document.fire('sakurapanel:pm:load');

			return this;
		}
	});//<--page.Manager

	/** section: ui
	 *  class sakura.ui.Body
	 *
	 *  ##### Example
	 *
	 *      var body = new sakura.ui.Body().clear();
	 *
	 *      var container = new sakura.ui.Container().render(body);
	 *
	**/
	ui.Body = Class.create({

		/**
		 *  new sakura.ui.Body() -> sakura.ui.Body
		 *
		 *  Initiates a controller for body.
		**/
		initialize: function _initBody() {
			this.entity = document.body || $$('body')[0];

			return this;
		},

		/**
		 *  sakura.ui.Body#clear() -> sakura.ui.Body
		 *
		 *  Clears the contents of the body.
		**/
		clear: function _clearBody() {
			this.entity.update();

			return this;
		}
	});//<--ui.Body

	/** section: ui
	 *  class sakura.ui.Element
	**/
	ui.Element = Class.create({

		/**
		 *  new sakura.ui.Element(options) -> sakura.ui.Element
		 *  - options (Object) - configuration for the container.
		 *
		 *  Create and initialize the sakuralized container element.
		 *
		 *  ##### Options
		 *
		 *  * `tagName`    (String; default `div`):
		 *  * `className`  (String):
		 *  * `style`      (Object): please refer to [Element.setStyle](http://api.prototypejs.org/dom/Element/setStyle/)
		 *  * `onRendered` (Function):
		**/
		initialize: function _initElement(opt) {
			if (!opt) var opt = {};

			this.tagName   = opt.tagName   || 'div';
			this.id        = opt.id        || null;
			this.className = opt.className || null;
			this.style     = opt.style     || null;
			this.attr      = opt.attr      || null;

			this.init(opt || null).create();

			return this;
		},

		init: function _iElement() { return this; },

		create: function _createElement() {
			this.entity = new Element(this.tagName, this.attr);

			if (this.className !== null) this.entity.className = this.className;

			if (this.id !== null) this.entity.id = this.id;

			if (this.style !== null) this.entity.setStyle(this.style);

			return this;
		},

		/**
		 *  sakura.ui.Element#render(target) -> sakura.ui.Element
		 *  - target (sakura.ui.Body | sakuraUiInstance | Element | String) - whitch to draw
		 *
		 *
		**/
		render: function _renderElement(target) {
			if (Object.isString(target)) {
				var container = $(target);
			} else if (Object.isElement(target)) {
				var container = target;
			} else if ((typeof target === 'object') && target.entity) {
				var container = target.entity;
			}

			container.insert(this.entity);

			if (this.onRendered) this.onRendered();

			return this;
		},

		/**
		 *  sakura.ui.Element#update([newContent]) -> sakura.ui.Element
		 *  - newContent (sakuraUiInstance | Element | String)
		 *
		 *  Replaces _the content_ of `element` with the `newContent` argument.
		**/
		update: function _updateElement(content) {
			if (content) {
				this.entity.update(content);
			} else {
				this.entity.update();
			}

			return this;
		},

		/**
		 *  sakura.ui.Elementr#insert(content) -> sakura.ui.Element
		 *  - content (sakuraUiInstance | Element | String) - The content to insert.
		 *
		 *  This method is wrapper for [Element.insert](http://api.prototypejs.org/dom/Element/insert/)
		**/
		insert: function _insertElement(content) {
			if (Object.isString(content)) {
				var element = content;
			} else if (Object.isElement(content)) {
				var element = content;
			} else if((typeof content === 'object') && content.entity) {
				var element = content.entity;
			}

			this.entity.insert(element);

			return this;
		},

		/**
		 *  sakura.ui.Container#show() -> sakura.ui.Container
		 *
		 *  Show a container.
		 *
		 *  This method is wrapper for [Element.show](http://api.prototypejs.org/dom/Element/show/)
		**/
		show: function _showElement() {
			this.entity.show();
			this.entity.fire('sakura:show');

			return this;
		},

		/**
		 *  sakura.ui.Element#hide() -> sakura.ui.Element
		 *
		 *  Hide a container.
		 *
		 *  This method is wrapper for [Element.hide](http://api.prototypejs.org/dom/Element/hide/)
		**/
		hide: function _hideElement() {
			this.entity.hide();
			this.entity.fire('sakura:hide');

			return this;
		},

		/**
		 *  sakura.ui.Element#remove() -> sakura.ui.Element
		 *
		 *  Remove a container.
		 *
		 *  This method is wrapper for [Element.remove](http://api.prototypejs.org/dom/Element/remove/)
		**/
		remove: function _removeElement() {
			try {
				this.entity.remove() && this.entity.fire('sakura:remove');
			} catch (e) {
				//console.debug(e);
			}

			return this;
		}
	});
	//<--ui.Element

	/** section: ui
	 *  class sakura.ui.Container
	 *
	 *  ##### Example
	 *
	 *      var container = new sakura.ui.Container({
	 *        className: 'header'
	 *      }).render(body);
	 *
	**/
	ui.Container = Class.create(ui.Element, {

		init: function _initContainer(opt) {
			this.tagName = opt.tagName   || 'div';

			return this;
		}

	});//<--ui.Container

	//
	// ui.Popover
	//
	ui.Popover = Class.create(ui.Element, {

		init: function _init(opt) {
			this.target = opt.target.entity || opt.target;
			this.html   = opt.html || opt.body || opt.content || opt.message;

			this.isShowing = false;

			this.target.observe('mouseover', function(e) {

				this.isShowing = true;

				this.entity.style.opacity = '0';
				$(document.body).insert(this.entity);
				this.render();

				var offset = this.target.cumulativeOffset();
				var scrl   = this.target.cumulativeScrollOffset();
				var width  = this.target.getWidth();
				var height = this.target.getHeight();

				var posX = offset.left - scrl.left + (width / 2) - (this.entity.getWidth() / 2);

				this.entity.style.left  = posX + 'px';
				this.entity.style.right = 'auto';

				if ($(document).height - this.target.getHeight() - 100 < e.y) {
					var posY = offset.top - scrl.top - 9;

					this.entity.addClassName('tail');
					this.entity.style.top    = 'auto';
					this.entity.style.bottom = ($(document).height - posY) + 'px';
				} else {
					var posY = offset.top - scrl.top + height + 9;

					this.entity.removeClassName('tail');
					this.entity.style.top    = posY + 'px';
					this.entity.style.bottom = 'auto';
				}

				this.entity.style.opacity = '1';
			}.bind(this));

			this.target.observe('mouseout', function(e) {

				this.isShowing = false;
				this.remove();
			}.bind(this));

			this.target.observe('sakura:remove', function(e) {

				this.isShowing = false;
				this.remove();
			}.bind(this));

			return this;
		},

		create: function _create() {

			this.entity = new Element('div', this.attr);

			this.entity.addClassName('sakura-popover');

			this.update(this.html);

			return this;
		},

		render: function _render() {

			return this;
		},

		remove: function() {

			try { this.entity.remove(); } catch (e) {}

			return this;
		}
	});//<--ui.Popover

	//
	// ui.Tooltip
	//
	ui.Tooltip = Class.create(ui.Element, {

		init: function _init(opt) {
			this.target = opt.target.entity || opt.target;
			this.html   = opt.html || opt.body || opt.content || opt.message;

			this.target.observe('mouseover', function(e) {

				$(document.body).insert(this.entity);

				if ($(document).width - 300 < e.x) {
					this.entity.style.left  = 'auto';
					this.entity.style.right = ($(document).width - e.x) + 'px';
				} else {
					this.entity.style.left  = e.x + 'px';
					this.entity.style.right = 'auto';
				}

				if ($(document).height - this.target.getHeight() - 100 < e.y) {
					this.entity.style.top    = 'auto';
					this.entity.style.bottom = ($(document).height - e.y) + 'px';
				} else {
					this.entity.style.top    = e.y + 'px';
					this.entity.style.bottom = 'auto';
				}

				this.render();
			}.bind(this));

			this.target.observe('mousemove', function(e) {

				if ($(document).width - 300 < e.x) {
					this.entity.style.left  = 'auto';
					this.entity.style.right = ($(document).width - e.x) + 'px';
				} else {
					this.entity.style.left  = e.x + 'px';
					this.entity.style.right = 'auto';
				}

				if ($(document).height - this.target.getHeight() - 20 < e.y) {
					this.entity.style.top    = 'auto';
					this.entity.style.bottom = ($(document).height - e.y) + 'px';
				} else {
					this.entity.style.top    = e.y + 'px';
					this.entity.style.bottom = 'auto';
				}
			}.bind(this));

			this.target.observe('mouseout', function(e) {
				this.remove();
			}.bind(this));

			this.target.observe('remove', function(e) {
				this.remove();
			}.bind(this));

			this.target.observe('sakura:remove', function(e) {
				this.remove();
			}.bind(this));

			return this;
		},

		create: function _create() {

			this.entity = new Element('div', this.attr);

			this.entity.insert(this.html);

			this.entity.addClassName('sakura-tooltip');

			return this;
		},

		render: function _renderDropdown() {

			return this;
		}
	});//<--ui.Tooltip

	//
	// ui.Tab
	//
	ui.Tab = Class.create(ui.Element, {

		init: function _init(opt) {
			this.tabs          = opt.tabs          || [];
			this.selectedIndex = opt.selectedIndex || 0;
			this.onSwitch      = opt.onSwitch      || Prototype.emptyFunction;

			if (typeof this.selectedIndex !== 'number') {
				this.selectedIndex = parseInt(this.selectedIndex, 10);
			}

			return this;
		},

		create: function _create() {
			this.entity = new Element('div', this.attr);

			if (this.className !== null) this.entity.className = this.className;

			if (this.id !== null) this.entity.id = this.id;

			if (this.style !== null) this.entity.setStyle(this.style);

			this.entity.addClassName('sakura-tab');

			this.entityBar     = new ui.Container({ className: 'sakura-tab-bar' });

			this.entityContent = new ui.Container({ className: 'sakura-tab-content' });

			this.entity.insert(this.entityBar.entity).insert(this.entityContent.entity);

			//tabs
			this.tabs.each(function(tab, i){
				tab._button = new ui.Button({
					label: tab.label     || '&nbsp;',
					icon : tab.icon      || null,
					onClick: function() {
						this.switcher(i);
					}.bind(this)
				}).render(this.entityBar);

				//content
				tab._content = new ui.Container().insert(tab.content);
				tab._content.render(this.entityContent);
			}.bind(this));//<--this.tabs.each()

			this.switcher(this.selectedIndex);

			return this;
		},

		switcher: function _switcher(index) {
			this.tabs.each(function(tab, i){
				if(i === index){
					tab._button.select();
					tab._content.show();

					if (tab.onClick) tab.onClick();
				} else {
					tab._button.unselect();
					tab._content.hide();
				}
			});

			this.onSwitch(index);

			return this;
		}

	});//<--ui.Tab

	//
	// ui.Navbar
	//
	ui.Navbar = Class.create(ui.Container, {

		init: function _initContainer(opt) {
			this.tagName   = opt.tagName   || 'div';
			this.className = opt.className || 'navbar';

			// index
			this.child    = {};
			this.children = [];

			return this;
		},

		add: function _add(opt) {
			var child = {
				key: opt.key,
				ui : opt.ui
			};

			this.insert(child.ui);

			// index
			this.child[child.key] = child;
			this.children.push(child);

			return this;
		},

		remove: function _remove(key) {
			if (!this.child[key]) return this;

			try {
				this.child[key].ui.remove();
			} catch (e) {
				console.error(e, key);
			}

			this.children = this.children.without(this.child[key]);
			delete this.child[key];

			return this;
		},

		removeAll: function _removeAll() {
			this.children.each(function(a) {
				this.remove(a.key);
			}.bind(this));

			this.children.each(function(a) {
				try {
					a.ui.remove();
				} catch (e) {
					console.error(e, a.key);
				}
			}.bind(this));

			this.children = [];

			return this;
		},

		one: function _one(key) {
			return this.child[key] && this.child[key].ui || null;
		},

		all: function _all() {
			var array = [];

			this.children.each(function(a) {
				array.push(a.ui);
			});

			return array;
		}

	});//<--ui.Navbar

	//
	// ui.Button
	//
	ui.Button = Class.create(ui.Element, {

		init: function _initButton(opt) {
			this.label    = opt.label    || '';
			this.icon     = opt.icon     || null;
			this.onClick  = opt.onClick  || Prototype.emptyFunction;
			this.onRemove = opt.onRemove || Prototype.emptyFunction;
			this.isRemovableByUser = opt.isRemovableByUser || false;

			return this;
		},

		create: function _createButton() {
			this.entity = new Element('a', this.attr).insert(this.label);

			if (this.className !== null) this.entity.className = this.className;

			if (this.id !== null) this.entity.id = this.id;

			if (this.style !== null) this.entity.setStyle(this.style);

			this.entity.addClassName('sakura-button');

			this.entity.observe('click', this.onClickHandler.bind(this));

			if (this.icon) {
				this.entity.addClassName('sakura-button-icon');
				this.entity.setStyle({
					backgroundImage: 'url(' + this.icon + ')'
				});
			}

			if (this.isRemovableByUser) {
				this.entity.insert(
					new Element('span', { className: 'remove' }).insert(
						'&times;'
					).observe('click', this.onRemoveHandler.bind(this))
				);
			}

			return this;
		},

		onClickHandler: function _onClickHandlerButton(e) {
			if (this.isEnabled()) {
				this.onClick(e);
			}
		},

		onRemoveHandler: function _onClickHandlerButton(e) {
			if (this.isEnabled()) {
				this.remove();
				this.onRemove(e);
			}
			e.stop();
		},

		hide: function _hideButton() {
			this.entity.hide();
			return this;
		},

		show: function _showButton() {
			this.entity.show();
			return this;
		},

		select: function _selectButton() {
			this.entity.addClassName('sakura-button-selected');
			return this;
		},

		unselect: function _unselectButton() {
			this.entity.removeClassName('sakura-button-selected');
			return this;
		},

		isSelected: function _isSelectedButton() {
			return this.entity.hasClassName('sakura-button-selected');
		},

		disable: function _disableButton() {
			this.entity.addClassName('sakura-button-disabled');
			return this;
		},

		enable: function _enableButton() {
			this.entity.removeClassName('sakura-button-disabled');
			return this;
		},

		isDisabled: function _isDisabledButton() {
			return this.entity.hasClassName('sakura-button-disabled');
		},

		isEnabled: function _isEnabledButton() {
			return !this.entity.hasClassName('sakura-button-disabled');
		}
	});//<--ui.Button

	//
	// ui.Pulldown
	//
	ui.Pulldown = Class.create(ui.Button, {

		init: function _initButton(opt) {
			this.label   = opt.label   || '';
			this.icon    = opt.icon    || null;
			this.items   = opt.items;

			return this;
		},

		create: function _createButton() {
			this.entity = new Element('a', this.attr).insert( this.label + ' <span>&#x25BC;</span>');

			if (this.className !== null) this.entity.className = this.className;

			if (this.id !== null) this.entity.id = this.id;

			if (this.style !== null) this.entity.setStyle(this.style);

			this.entity.addClassName('sakura-button');

			this.entity.observe('click', this.onClickHandler.bind(this));

			if (this.icon) {
				this.entity.addClassName('sakura-button-icon');
				this.entity.setStyle({
					backgroundImage: 'url(' + this.icon + ')'
				});
			}

			return this;
		},

		onClick: function _onClickButton() {
			new ui.Dropdown({
				target: this.entity,
				items : this.items
			}).render();

			return this;
		}

	});

	//
	// ui.SquareButton
	//
	ui.SquareButton = Class.create(ui.Button, {

		init: function _init(opt) {
			this.label    = opt.label    || '';
			this.note     = opt.note     || '';
			this.icon     = opt.icon     || null;
			this.onClick  = opt.onClick  || Prototype.emptyFunction;
			this.size     = opt.size     || '120px';

			return this;
		},

		create: function _createButton() {
			this.entityLabel = new Element('span', { className: 'label' }).insert(this.label);
			this.entityNote  = new Element('span', { className: 'note' }).insert(this.note);

			this.entity = new Element('a', this.attr).insert(this.entityLabel).insert(this.entityNote);

			this.entity.setStyle({
				width : this.size,
				height: this.size
			});

			if (this.className !== null) this.entity.className = this.className;

			if (this.id !== null) this.entity.id = this.id;

			if (this.style !== null) this.entity.setStyle(this.style);

			this.entity.addClassName('sakura-button');
			this.entity.addClassName('sakura-square-button');

			this.entity.observe('click', this.onClickHandler.bind(this));

			if (this.icon) {
				this.entity.addClassName('sakura-button-icon');
				this.entity.addClassName('sakura-square-button-icon');
				this.entity.setStyle({
					backgroundImage: 'url(' + this.icon + ')'
				});
			}

			return this;
		},

		updateLabel: function _updateLabel(content) {
			if (content) {
				this.entityLabel.update(content);
			} else {
				this.entityLabel.update();
			}

			return this;
		},

		updateNote: function _updateNote(content) {
			if (content) {
				this.entityNote.update(content);
			} else {
				this.entityNote.update();
			}

			return this;
		}

	});

	//
	// ui.Dropdown
	//
	ui.Dropdown = Class.create(ui.Element, {

		init: function _initDropdown(opt) {
			this.target = opt.target;
			this.items  = opt.items;

			return this;
		},

		create: function _createDropdown() {
			this.entity = new Element('div', this.attr);

			var container = new Element('div');
			this.entity.insert(container);

			if (this.className !== null) this.entity.className = this.className;

			if (this.id !== null) this.entity.id = this.id;

			if (this.style !== null) this.entity.setStyle(this.style);

			this.entity.addClassName('sakura-dropdown');

			this.items.each(function(a, i) {
				if (typeof a === 'string') {
					var btn = new Element('hr');
				} else {
					var btn = new Element('div').insert(a.label);

					if (a.icon) {
						btn.setStyle({ backgroundImage: 'url(' + a.icon + ')' });
						btn.addClassName('sakura-dropdown-icon');
					}

					btn.observe('click', function(e) {
						if (a.onClick) a.onClick(e);
					}.bind(this));
				}

				container.insert(btn);
			}.bind(this));

			this.entity.observe('click', this.remove.bind(this));

			var offset = this.target.cumulativeOffset();
			var scrl   = this.target.cumulativeScrollOffset();
			var width  = this.target.getWidth();
			var height = this.target.getHeight();

			var posX = offset.left - scrl.left + (width / 2) - 17;
			var posY = offset.top - scrl.top + height + 5;

			container.setStyle({
				top : posY.toString(10) + 'px',
				left: posX.toString(10) + 'px'
			});

			return this;
		},

		render: function _renderDropdown() {
			var container = $(document.body);

			container.insert(this.entity);

			if (this.onRendered) this.onRendered();

			return this;
		}
	});//<--ui.Dropdown

	//
	// ui.ContextMenu
	//
	ui.ContextMenu = Class.create(ui.Element, {

		init: function _init(opt) {
			this.target = opt.target.entity || opt.target;
			this.items  = opt.items;

			return this;
		},

		create: function _create() {

			this.entity = new Element('div', this.attr);

			if (this.className !== null) this.entity.className = this.className;

			if (this.id !== null) this.entity.id = this.id;

			if (this.style !== null) this.entity.setStyle(this.style);

			this.entity.addClassName('sakura-context-menu');

			this.target.observe('contextmenu', function(e) {

				this.target.fire('sakura:contextmenu');
				e.stop();

				var container = new Element('div');
				this.entity.update(container);

				$(document.body).insert(this.entity);

				this.items.each(function(a, i) {
					if (typeof a === 'string') {
						var btn = new Element('hr');
					} else {
						var btn = new Element('div').insert(a.label);

						if (a.icon) {
							btn.setStyle({ backgroundImage: 'url(' + a.icon + ')' });
							btn.addClassName('sakura-context-menu-icon');
						}

						btn.observe('click', function(e) {
							if (a.onSelect) a.onSelect(e);
						}.bind(this));
					}

					container.insert(btn);
				}.bind(this));

				var offset = $(document.body).cumulativeOffset();
				var scrl   = $(document.body).cumulativeScrollOffset();
				var vw     = document.viewport.getWidth();
				var vh     = document.viewport.getHeight();
				var w      = container.getWidth();
				var h      = container.getHeight();
				var x      = e.pointerX();
				var y      = e.pointerY();

				var posX = offset.left - scrl.left + x;
				var posY = offset.top  - scrl.top  + y;

				if (vw < x + w) posX -= w;
				if (vh < y + h) posY -= h;

				this.entity.style.left = posX + 'px';
				this.entity.style.top  = posY + 'px';

				var remover = function() {
					clearTimeout(timerMouseObservingDelay);
					$(document.body).stopObserving('mouseup', remover);
					$(document.body).stopObserving('click', remover);
					$(document.body).stopObserving('contextmenu', remover);
					$(document.body).stopObserving('sakura:contextmenu', remover);

					setTimeout(function() {
						try { container.remove(); } catch (e) {}
						container = null;
					}, 10);
				};

				var timerMouseObservingDelay = setTimeout(function() {
					$(document.body).observe('mouseup', remover);
				}, 100);
				$(document.body).observe('click', remover);
				$(document.body).observe('contextmenu', remover);
				$(document.body).observe('sakura:contextmenu', remover);
			}.bind(this));

			this.target.observe('sakura:remove', function(e) {

				this.remove();
			}.bind(this));

			this.target.observe('remove', function(e) {

				this.remove();
			}.bind(this));

			return this;
		},

		render: function _render() {

			return this;
		},

		remove: function() {

			try { this.entity.remove(); } catch (e) {}

			return this;
		}
	});//<--ui.ContextMenu

	//
	// ui.Headbar
	//
	ui.Headbar = Class.create(ui.Navbar, {

		init: function _initContainer(opt) {
			this.tagName   = opt.tagName   || 'div';
			this.className = opt.className || 'header';

			// index
			this.child    = {};
			this.children = [];

			return this;
		}

	});//<--ui.Headbar

	//
	// ui.Sidebar
	//
	ui.Sidebar = Class.create(ui.Navbar, {

		init: function _initContainer(opt) {
			this.tagName   = opt.tagName   || 'div';
			this.className = opt.className || 'sidebar';

			// index
			this.child    = {};
			this.children = [];

			return this;
		}

	});//<--ui.Sidebar

	//
	// ui.Split
	//
	ui.Split = Class.create({
	});//<--ui.Split

	//
	// ui.Alert
	//
	ui.Alert = Class.create(ui.Element, {

		init: function _initAlert(opt) {
			this.title   = opt.title || null;
			this.body    = opt.body  || opt.content || null;
			this.level   = opt.level || opt.type || 'info';
			this.onClose = opt.onClose || Prototype.emptyFunction;
			this.disableClose = opt.disableClose || false;

			return this;
		},

		create: function _createAlert() {
			this.entity = new Element('div', this.attr);

			var container = new Element('div');
			this.entity.insert(container);

			if (this.className !== null) this.entity.className = this.className;

			if (this.id !== null) this.entity.id = this.id;

			if (this.style !== null) this.entity.setStyle(this.style);

			this.entity.addClassName('sakura-alert').addClassName('sakura-alert-' + this.level);

			if (!this.disableClose) {
				container.insert(
					new Element('button').insert('&times;').observe('click', function() {
						this.remove();
						this.onClose();
					}.bind(this))
				);
			}

			if (this.title) {
				container.insert(
					new Element('strong').insert(this.title + ':')
				);
			}

			if (this.body) {
				container.insert(
					new Element('span').insert(this.body)
				);
			}

			return this;
		}

	});//<--ui.Alert

	//
	// ui.ColorSamples
	//
	ui.ColorSamples = Class.create(ui.Element, {

		init: function _initColorSamples(opt) {
			this.title = opt.title || null;
			this.items = opt.items || [];

			return this;
		},

		create: function _createColorSamples() {
			this.entity = new Element('div', this.attr);

			var container = new Element('div');
			this.entity.insert(container);

			if (this.className !== null) this.entity.className = this.className;

			if (this.id !== null) this.entity.id = this.id;

			if (this.style !== null) this.entity.setStyle(this.style);

			this.entity.addClassName('sakura-color-samples');

			if (this.title) {
				container.insert(
					new Element('strong').insert(this.title + ':')
				);
			}

			this.items.each(function(a) {
				container.insert(
					new Element('span').setStyle({ borderColor: a.color }).insert(a.label)
				);
			});

			return this;
		}

	});//<--ui.ColorSamples

	//
	// ui.Progressbar
	//
	ui.Progressbar = Class.create({
	});//<--ui.Progressbar

	//
	// ui.Input
	//
	ui.Input = Class.create(ui.Element, {

		init: function _initInput(opt) {
			this.tagName = opt.tagName   || 'input';

			this.attr = {
				type       : opt.type        || 'text',
				placeholder: opt.placeholder || false,
				value      : opt.value       || false,
				checked    : opt.checked     || false
			};

			return this;
		}
	});//<--ui.Input

	//
	// ui.Help
	//
	ui.Help = Class.create(ui.Element, {

		init: function _initHelp(opt) {

			this.closeMsg = opt.closeMsg || 'Help: click to close';
			this.elements = [];

			opt.elements.each(function(el, i) {

				if (Object.isElement(el.target)) {

					this.elements.push(el);
				} else if (Object.isString(el.target)) {
					$$(el.target).each(function(a) {

						var x = Object.toJSON(el).evalJSON();

						x.target = a;

						this.elements.push(x);
					}.bind(this));
				} else if (typeof el.target === 'object' && !!el.target.entity) {

					el.target = el.target.entity;

					this.elements.push(el);
				}
			}.bind(this));

			return this;
		},

		create: function _createHelp() {

			this.entity = new Element('div', this.attr);

			var head = new Element('div', { className: 'head' }).insert(this.closeMsg);
			this.entity.insert(head);

			var container = new Element('div', { className: 'main' });
			this.entity.insert(container);

			if (this.className !== null) this.entity.className = this.className;

			if (this.id !== null) this.entity.id = this.id;

			if (this.style !== null) this.entity.setStyle(this.style);

			this.entity.addClassName('sakura-help');

			this.entity.observe('click', function() {

				this.elements.each(function(el, i) {
					el._tooltip.remove();
				});

				this.remove();
			}.bind(this));

			this.elements.each(function(el, i) {

				var width  = el.target.getWidth();
				var height = el.target.getHeight();
				var left   = el.target.cumulativeOffset().left - el.target.cumulativeScrollOffset().left;
				var top    = el.target.cumulativeOffset().top - el.target.cumulativeScrollOffset().top;

				var c = new ui.Container({
					style: {
						width : width  + 'px',
						height: height + 'px',
						left  : left   + 'px',
						top   : top    + 'px'
					}
				}).render(container);

				if (!!el.name) c.insert('<div>' + el.name + '</div>');

				el._tooltip = new ui.Tooltip({
					target: c,
					html  : el.description
				}).render();
			}.bind(this));

			return this;
		}
	});//<--ui.Help

})();