/*!
 *  Chinachu WebUI Client Application (chinachu-wui-client)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://chinachu.akkar.in/
**/
(function _init_chinachu() {
	
	"use strict";
	
	var PARAM = window.location.search.replace('?', '').toQueryParams();
	window.location.query = PARAM;
	
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
	
	console.info('[welcome]', 'initializing application.');
	
	//
	// 設定
	//
	var MAIN_JS      = './chinachu.js';
	var INDEX_PATH   = './page/';
	var LOCALES      = ['ja'];
	var LOCALES_PATH = './locales/';
	
	var API_ROOT = PARAM.api || '/api/';
	console.info('API_ROOT:', API_ROOT);
	
	var COLOUR = PARAM.colour || localStorage.getItem('colour') || null;
	
	//
	// 必要なライブラリ等
	//
	var REQUIRES = [
		/* socket.io */
		'./socket.io/socket.io.js',
		
		/* hypers */
		'./lib/hyperform.js',
		'./lib/hyperform.css',
		
		/* date.format */
		'./lib/date.format.js',
		
		/* chinachu */
		'./chinachu.css',
		'./class.js'
	];
	
	// _|_
	// \ /
	//  v
	function init() {
		//
		// アプリケーションオブジェクト
		//
		var app = {};
		
		if (DEBUG) window.app = app;//デバッグ用
		
		app.view = {};
		app.stat = {};
		app.env  = {};
		app.api  = {};
		app.f    = {};
		app.def  = {};
		app.timer= {};
		
		app.socket = null;
		
		app.chinachu = {
			status   : {},
			rules    : [],
			reserves : [],
			schedule : [],
			recording: [],
			recorded : []
		}
		
		
		// global
		window.global = {
			chinachu: app.chinachu
		};
		
		// misc
		app.def.apiRoot = API_ROOT;
		
		app.def.colors  = [
			'#6495ed',
			'#f39700',
			'#769164',
			'#e60012',
			'#663300',
			'#ec6d71',
			'#1e50a2'
		];
		
		app.def.categoryColor = {
			anime      : '#fcbde1',
			information: '#bdfce8',
			news       : '#d7fcbd',
			sports     : '#bdf1fc',
			variety    : '#fbfcbd',
			drama      : '#fce1c4',
			music      : '#bdc9fc',
			cinema     : '#d6bdfc',
			etc        : '#eeeeee'
		};
		
		//
		// 画面の初期化
		//
		app.view.body = new sakura.ui.Body().clear();
		
		//
		// ローディングマスク
		//
		app.view.loadingMask = new sakura.ui.Container({className: 'fullmask loading'}).render(app.view.body);
		app.view.panicMask   = new sakura.ui.Container({className: 'fullmask panic'}).render(app.view.body).hide();
		
		//
		// 多言語化
		//
		var localization = new sakura.i18n.Localization({
			locales    : LOCALES,
			localesPath: LOCALES_PATH
		});
		
		var __ = localization.convert;
		
		Object.extend(String.prototype, {
			__: function(keywords){
				if (keywords) {
					return localization.convert(this, keywords);
				} else {
					return localization.convert(this);
				}
			}
		});
		
		//
		// ベースカラー変更
		//
		if (COLOUR) {
			var colour = '#' + COLOUR;
			
			app.view.body.entity.insert(
				new Element('style').insert(
					'body { background: ' + colour + '; }'
				)
			);
		}
		
		//
		// メイン読み込み
		//
		var loadMain = function _loadMain() {
			// ページマネージャー
			app.pm = new sakura.page.Manager({
				app: app,
				
				indexPath: INDEX_PATH,
				
				onReady: function _onReadyPM() {
					// main.js
					new sakura.util.Loader({
						url     : MAIN_JS,
						callback: function _callback(script) {
							eval(script);
						}
					});
				}
			});//<--pm
		};//<--loadMain
		
		if (isLoadedRequires) {
			loadMain();
		} else {
			// JSとCSSの読み込み
			new sakura.util.Requires(REQUIRES, function _main() {
				console.log('[application]', 'initializing done.');
				
				loadMain();
				
				isLoadedRequires = true;
			});
		}
	}//<--init
	
	var isLoadedRequires = false;
	
	Event.observe(window, 'load', init, false);

})();