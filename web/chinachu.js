/*!
 *  Chinachu WebUI Client Application (chinachu-wui-client)
 *
 *  Copyright (c) 2012 Yuki KAN and Chinachu Project Contributors
 *  http://akkar.in/projects/chinachu/
**/

var app = {
	socket: null,
	notify: null,
	chinachu: {
		status   : {},
		rules    : [],
		reserves : [],
		schedule : [],
		recording: [],
		recorded : []
	},
	ui: {}
};

YUI().use('get', 'node-load', 'router', function _initYUI(Y) {
	window.Y = Y;
	
	var router = new Y.Router({
		html5: false,
		routes: [
			{
				path: /.*/,
				callback: function _cbRouterRoot(a) {
					var path = a.path;
					
					if (path === '/') { path = '/dashboard'; }
					
					document.fire('chinachu:reload');
					
					Y.Node.one('section#content').load('./page' + path + '.html', function() {
						Y.Get.js('./page' + path + '.js', function(err) {
							if (err) {
								router.save('/');
							}
						});
					});
					
					Y.Node.all('header > div > ul > li > a').removeClass('selected');
					Y.Node.one('header > div > ul > li > a[href="#' + path + '"]').addClass('selected');
				}
			}
		]
	});
	
	router.save(window.location.hash.replace('#', ''));
});

Event.observe(window, 'load', function _init() {
	app.socket = io.connect(window.location.protocol + '//' + window.location.host, {
		connectTimeout: 3000
	});
	
	app.socket.on('connect', socketOnConnect);
	app.socket.on('disconnect', socketOnDisconnect);
	
	app.socket.on('status', socketOnStatus);
	app.socket.on('rules', socketOnRules);
	app.socket.on('reserves', socketOnReserves);
	app.socket.on('schedule', socketOnSchedule);
	app.socket.on('recording', socketOnRecording);
	app.socket.on('recorded', socketOnRecorded);
	
	app.notify = new Hypernotifier(null, {
		hMargin: 30,
		timeout: 3
	});
});

function socketOnConnect() {
	$('loading').hide();
	document.fire('chinachu:connect');
	
	app.notify.create({ title: 'Chinachu', message: '接続されました' });
}

function socketOnDisconnect() {
	$('loading').show();
	document.fire('chinachu:disconnect');
	
	$('footer-status').update('<span class="color-red">切断</span>');
	app.notify.create({ title: 'Chinachu', message: '切断されました' });
}

function socketOnStatus(data) {
	app.chinachu.status = data;
	document.fire('chinachu:status');
	
	$('footer-status').update('<span class="color-green">接続済</span>(' + data.connectedCount + ')');
}

function socketOnRules(data) {
	app.chinachu.rules = data;
	document.fire('chinachu:rules');
	
	$('rules-count').update(data.length.toString(10));
}

function socketOnReserves(data) {
	app.chinachu.reserves = data;
	document.fire('chinachu:reserves');
	
	$('reserves-count').update(data.length.toString(10));
}

function socketOnSchedule(data) {
	app.chinachu.schedule = data;
	document.fire('chinachu:schedule');
}

function socketOnRecording(data) {
	app.chinachu.recording = data;
	document.fire('chinachu:recording');
	
	$('recording-count').update(data.length.toString(10));
	
	if (data.length === 0) {
		$('favicon').href = './favicon.ico';
	} else {
		$('favicon').href = './favicon-active.ico';
	}
}

function socketOnRecorded(data) {
	app.chinachu.recorded = data;
	document.fire('chinachu:recorded');
	
	$('recorded-count').update(data.length.toString(10));
}

app.ui.ContentLoading = Class.create({
	initialize: function _init(opt) {
		if (!opt) { var opt = {}; }
		
		this.progress   = 0;
		this.target     = $('content');
		this.onComplete = opt.onComplete || function _empty() {};
		
		this.create();
		
		return this;
	},
	create: function _draw() {
		this.entity = {
			container: new Element('div', {id: 'content-loading'}),
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
	render: function _render() {
		this.target.insert({top: this.entity.container});
		
		return this;
	},
	remove: function _remove() {
		this.entity.bar.remove();
		this.entity.frame.remove();
		this.entity.container.remove();
		
		this.entity.bar = null;
		this.entity.frame = null;
		this.entity.container = null;
		
		delete this.entity;
		delete this.target;
		delete this.progress;
		delete this;
		
		return true;
	}
});