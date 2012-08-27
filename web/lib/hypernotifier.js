/*!
 * Hypernotifier/1.0 for Prototype.js
 *
 * Copyright (c) 2012 Yuki KAN
 * Licensed under the MIT-License.
 *
 * http://akkar.in/projects/hypernotifier/
**/
var Hypernotifier = Class.create({
	/**
	 * Constructor
	**/
	initialize: function _init(targetElement, opt) {
		/*- Target element -*/
		this.target      = $(targetElement || document.body);
		
		if (!opt) var opt = {};
		
		/*- Options -*/
		this.classPrefix   = opt.classPrefix   || 'hypernotifier';
		this.desktopNotify = opt.desktopNotify || false;//Notification API(experimental)
		
		this.hAlign  = opt.hAlign  || 'right';
		this.vAlign  = opt.vAlign  || 'bottom';
		this.hMargin = opt.hMargin || 10;//pixels
		this.vMargin = opt.vMargin || 10;//pixels
		this.spacing = opt.spacing || 10;//pixels
		this.timeout = opt.timeout || 5;//seconds
		
		this.title   = opt.title   || 'Notification';
		
		this.notifies = [];
		
		return this;
	}//<--initialize()
	,
	/**
	 * Create
	**/
	create: function _create(opt) {
		/*- Desktop notify -*/
		if (this.desktopNotify === true) {
			if (this.createDesktopNotify(opt) === true) {
				return this;
			}
		}
		
		/*- Setting up -*/
		var title   = opt.title   || this.title;
		var message = opt.message || opt.body || opt.content || opt.text || null;
		var onClick = opt.onClick || null;
		var onClose = opt.onClose || null;
		var timeout = (typeof opt.timeout !== 'undefined') ? opt.timeout : this.timeout;
		
		var isAlive = true;
		var closeTimer;
		
		/*- Positions -*/
		var hPosition   = this.hMargin;
		var vPosition   = this.vMargin;
		
		/*- Create a new element for notify -*/
		//
		// <div class="hypernotifier-notify">
		//   <div class="hypernotifier-title">Notification</div>
		//   <div class="hypernotifier-message">yadda yadda yadda..</div>
		//   <div class="hypernotifier-close">&#xd7;</div>
		// </div>
		//
		var notify = new Element('div', {className: this.classPrefix + '-notify'}).insert(
			//title
			new Element('div', {className: this.classPrefix + '-title'}).insert(title)
		).insert(
			//message
			new Element('div', {className: this.classPrefix + '-message'}).insert(message)
		).insert(
			//close
			new Element('div', {className: this.classPrefix + '-close'}).insert('&#xd7;').observe('click', function(e) {
				e.stop();
				if (isAlive) {
					closeNotify();
				}
			})
		).hide();
		
		notify.style.position      = 'absolute';
		notify.style[this.hAlign] = hPosition + 'px';
		notify.style[this.vAlign] = vPosition + 'px';
		
		/*- onClick event -*/
		if (onClick === null) {
			notify.observe('click', function(e) {
				closeNotify();
			});
		} else {
			notify.style.cursor = 'pointer';
			notify.observe('click', function(e) {
				e.stop();
				onClick();
				closeNotify();
			});
		}
		
		/*- Insert to the target -*/
		this.target.insert(notify);
		
		/*- Show notify -*/
		notify.show();
		setTimeout(function() {
			notify.style.opacity = 1;
		}, 10);
		
		/*- Set timeout -*/
		if (timeout !== 0) {
			function onTimeout() {
				if (isAlive) {
					closeNotify();
				}
			}
			
			closeTimer = setTimeout(onTimeout, timeout * 1000);
			
			//Clear timeout
			notify.observe('mouseover', function() {
				clearTimeout(closeTimer);
				closeTimer = setTimeout(onTimeout, timeout * 1000);
			});
		}
		
		/*- Remove a notify element -*/
		var closeNotify = function() {
			isAlive = false;
			
			if (Prototype.Browser.IE) {
				notify.hide();
			} else {
				notify.style.opacity = 0;
			}
			
			//onClose event
			if (onClose !== null) {
				onClose();
			}
			
			setTimeout(function() {
				notify.remove();
				
				this.notifies = this.notifies.without(notify);
				this.positioner();
			}.bind(this), 300);
		}.bind(this);
		
		this.notifies.push(notify);
		this.positioner();
		
		return this;
	}//<--create()
	,
	createDesktopNotify: function _createDesktopNotify(opt) {
		/*- Setting up -*/
		var title   = opt.title   || this.title;
		var message = opt.message || opt.body || opt.content || opt.text || null;
		var onClick = opt.onClick || null;
		var onClose = opt.onClose || null;
		var timeout = (typeof opt.timeout !== 'undefined') ? opt.timeout : this.timeout;
		
		var isAlive = true;
		var notify  = null;
		var vendor  = null;
		var closeTimer;
		
		/*- Check supported -*/
		if (typeof window.webkitNotifications == 'undefined') {
			return false;
		} else {
			vendor = 'webkit';
		}
		
		/*- Get Permissions -*/
		if ((vendor == 'webkit') && (window.webkitNotifications.checkPermission() !== 0)) {
			window.webkitNotifications.requestPermission(function() { this.createDesktopNotify(opt) }.bind(this));
			return false;
		}
		
		/*- Create a desktop notification -*/
		if (vendor == 'webkit') {
			notify = window.webkitNotifications.createNotification(null, title, message.stripTags());
		}
		
		/*- Set timeout -*/
		if (timeout !== 0) {
			closeTimer = setTimeout(function() {
				if (isAlive) {
					notify.cancel();
				}
			}, timeout * 1000);
		}
		
		/*- onClick event -*/
		notify.onclick = function() {
			if (onClick !== null) {
				onClick();
			}
			notify.cancel();
		};
		
		/*- onClose event -*/
		notify.onclose = function() {
			isAlive = false;
			if (onClose !== null) {
				onClose();
			}
		};
		
		/*- Show notify -*/
		notify.show();
		
		return true;
	}//<--createDesktopNotify()
	,
	positioner: function _positioner() {
		var tH = (this.target === document.body) ? (window.innerHeight || document.body.clientHeight) : this.target.getHeight();
		var pX = 0;
		var pY = 0;
		
		this.notifies.each(function(notify, i) {
			var x = this.vMargin + pX;
			var y = this.hMargin + pY;
			
			notify.style[this.hAlign] = x.toString(10) + 'px';
			notify.style[this.vAlign] = y.toString(10) + 'px';
			
			pY += this.spacing + notify.getHeight();
			
			if ((pY + notify.getHeight() + this.vMargin + this.spacing) >= tH) {
				pY  = 0;
				pX += this.spacing + notify.getWidth();
			}
		}.bind(this));
	}
});