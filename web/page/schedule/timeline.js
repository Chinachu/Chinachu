P = Class.create(P, {
	
	init: function _initPage() {
		this.view.content.className = 'loading';
		
		this.time = new Date().getTime();
		
		this.draw();
		
		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:schedule', this.onNotify);
		
		return this;
	},
	
	deinit: function _deinit() {
		this.tick = Prototype.emptyFunction;
		!!this.renderer && this.renderer.domElement.remove();
		!!this.stats && this.stats.domElement.remove();
		
		return this;
	},
	
	refresh: function _refresh() {
		document.stopObserving('chinachu:schedule', this.onNotify);
		
		this.app.pm.realizeHash(true);
		
		return this;
	},
	
	draw: function _draw() {
		this.view.content.className = 'fullscreen timeline noscroll';
		this.view.content.update();
		
		if (global.chinachu.schedule.length === 0) {
			return;
		}
		
		/*var loading = new chinachu.ui.ContentLoading({
			onComplete: function() {
				setTimeout(function() {
					loading.remove();
					loading = null;
				}, 50);
			}
		}).render(this.view.content);*/
		
		// stats.js
		this.stats = new Stats();
		this.stats.setMode(0);
		this.stats.domElement.setStyle({
			position: 'absolute',
			top     : '5px',
			right   : '5px'
		});
		this.view.content.insert(this.stats.domElement);
		
		// init
		this.clock = new THREE.Clock();
		
		// レンダラーを初期化
		if (( function () { try { return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); } catch( e ) { return false; } } )()) {
			this.renderer = new THREE.WebGLRenderer({antialias: true});
		} else {
			this.renderer = new THREE.CanvasRenderer();
		}
		
		this.renderer.setClearColorHex(0x555555);
		this.renderer.setSize(this.view.content.getWidth(), this.view.content.getHeight());
		
		this.timer.resize = setInterval(function() {
			if (
				(this.renderer.domElement.width  !== this.view.content.getWidth()) ||
				(this.renderer.domElement.height !== this.view.content.getHeight())
			) {
				this.renderer.setSize(this.view.content.getWidth(), this.view.content.getHeight());
				
				this.camera.aspect = this.view.content.getWidth() / this.view.content.getHeight();
				this.camera.updateProjectionMatrix();
			}
		}.bind(this), 500);
		
		// Canvasを挿入
		this.view.content.insert(this.renderer.domElement);
		
		// カメラを作成
		this.camera = new THREE.PerspectiveCamera(75, this.view.content.getWidth() / this.view.content.getHeight(), 1, 2000);
		this.camera.position.z = 600;
		
		// カメラ操作
		this.cameraControls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
		this.cameraControls.target.set( 0, 0, 0 );
		this.cameraControls.noRotate    = true;
		this.cameraControls.minDistance = 100;
		//this.cameraControls.maxDistance = 1500;
		
		// シーンを作成
		this.scene = new THREE.Scene();
		
		// オブジェクトグループ作成
		this.board = new THREE.Object3D();
		this.scene.add(this.board);
		
		var createLabelMaterial = function(text, size, color, w, h) {
			
			var x    = document.createElement('canvas');
			var xc   = x.getContext('2d');
			x.width  = w;
			x.height = h;
			
			xc.fillStyle    = color || 'black';
			xc.font         = size + 'px "Meiryo UI", "メイリオ", arial';
			xc.textBaseline = 'top';
			xc.fillText(text, 0, 0);
			
			var map = new THREE.Texture(x);
			map.needsUpdate = true;
			
			var material = new THREE.MeshBasicMaterial({ map: map, transparent: true });
			return material;
		};
		
		//オブジェクト生成
		
		
		//var text = new THREE.Mesh(new THREE.PlaneGeometry( 100, 25 ), generateLabelMaterial('test'));
		//text.position.set(0, -150, 50);
		
		//this.board.add(text);
		
		
		
		var param = {
			//unit        : parseInt(window.localStorage.getItem('schedule-param-unit') || 25, 10),
			unit        : 50,
			//line        : parseInt(window.localStorage.getItem('schedule-param-line') || 50, 10),
			line        : 50,
			types       : eval(window.localStorage.getItem('schedule-param-types') || "['GR','BS','CS','EX']"),
			categories  : eval(window.localStorage.getItem('schedule-param-categories') || "['anime', 'information', 'news', 'sports', 'variety', 'drama', 'music', 'cinema', 'etc']"),
			hideChannels: eval(window.localStorage.getItem('schedule-param-hide-channels') || "[]"),
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
			},
			dateIndex  : [],
			dateBtns   : [],
			points     : [0, 0],
			scrolls    : eval(window.sessionStorage.getItem('schedule-param-scrolls') || "[0, 0]"),
			isScrolling: false
		};
		
		var total  = 0;
		var count  = 0;
		var maxlen = 0;
		
		var piece  = this.piece  = {};// piece of canvas programs
		var pieces = this.pieces = [];// array of program pieces
		
		var counter = function _counter() {
			++count;
			loading.update(Math.floor(count / total * 100));
		};
		
		var k = 0;
		
		global.chinachu.schedule.forEach(function(channel, i) {
			if (channel.programs.length === 0) return;
			if (param.types.indexOf(channel.type) === -1) return;
			if (param.hideChannels.indexOf(channel.id) !== -1) return;
			
			var y = k;
			
			channel.programs.forEach(function(program, j) {
				if ((program.end - this.time) < 0) {
					channel.programs = channel.programs.without(program);
					return;
				}
				
				if (maxlen < program.end) maxlen = program.end;
				
				//var points = [0, 0];
				
				setTimeout(function() {
					var posX   = (program.start - this.time) / 1000 / 1000 * param.unit + 150;
					var posY   = -(5 + y * (5 + param.line));
					var width  = program.seconds / 1000 * param.unit;
					var height = param.line;
					
					var rect = new THREE.Mesh(
						new THREE.PlaneGeometry(width - 0.5, height),
						new THREE.MeshBasicMaterial({
							color: this.app.def.categoryColor[program.category] || '#ffffff'
						})
					);
					rect.position.set(
						posX + (width / 2),
						posY - (height / 2),
						0
					);
					
					this.board.add(rect);
					
					var title = new THREE.Mesh(
						new THREE.PlaneGeometry(width - 5, height - 20),
						createLabelMaterial(
							program.title,
							(height - 10) / 2,
							'black',
							width,
							height - 20
						)
					);
					title.position.set(
						posX + (width / 2),
						posY - (height / 2),
						0.1
					);
					
					this.board.add(title);
					
					/*
					
					
					rect.onPress = function(e) {
						points = [ e.nativeEvent.x || e.nativeEvent.pageX, e.nativeEvent.y || e.nativeEvent.pageY ];
					};
					
					rect.onClick = function(e) {
						var pts = [ e.nativeEvent.x || e.nativeEvent.pageX, e.nativeEvent.y || e.nativeEvent.pageY ];
						
						if ((pts[0] === points[0]) && (pts[1] === points[1]) && e.nativeEvent.isLeftClick()) {
							window.location.hash = '/program?id=' + program.id;
						}
					};
					
					if (param.categories.indexOf(program.category) === -1) {
						rect.alpha  = 0.3;
						title.alpha = 0.3;
						if (desc) desc.alpha = 0.3;
						eop.alpha  = 0;
					}
					
					// add to piece
					piece[program.id] = {
						id     : program.id,
						isAdded: false,
						rect   : rect,
						title  : title,
						desc   : desc || null,
						eop    : eop,
						posX   : posX,
						posY   : posY,
						width  : width,
						height : height
					};
					
					pieces.push(piece[program.id]);
					*/
					//counter();
				}.bind(this), 0);
			}.bind(this));
			
			++k;
			total += channel.programs.length;
		}.bind(this));
		
		// 現在時刻表示線
		this.hand = new THREE.Mesh(
			new THREE.PlaneGeometry(1, k * (5 + param.line)),
			new THREE.MeshBasicMaterial( { color: 0xff0000 } )
		);
		this.hand.position.set(150, -(k * (5 + param.line) / 2), 10 )
		
		this.board.add(this.hand);
		
		
		// カメラ位置調整
		this.camera.position.y = -(k * (5 + param.line) / 2);
		this.cameraControls.target.set( 0, this.camera.position.y, 0 );
		
		
		// start
		this.tick();
		
		return this;
	},//<--draw
	
	tick: function _tick() {
		
		this.stats.begin();
		
		// window.requestAnimationFrame
		(
			window.requestAnimationFrame || window.mozRequestAnimationFrame ||
			window.webkitRequestAnimationFrame || window.msRequestAnimationFrame
		)(
			this.tick.bind(this)
		);
		
		this.render();
		
		this.stats.end();
		
		return this;
	},//<--animate
	
	render: function _render() {
		
		var delta = this.clock.getDelta();
		
		this.cameraControls.update( delta );
		
		if (this.camera.position.z > 1500) this.camera.position.z = 1500;
		
		this.renderer.render(this.scene, this.camera);
		
		return this;
	}//<--render
});