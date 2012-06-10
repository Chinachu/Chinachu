/*!
 * Hypermodal/1.12 for Prototype.js
 *
 * Copyright (c) 2012 Yuki KAN
 * Licensed under the MIT-License.
 *
 * http://akkar.in/projects/hypermodal/
**/
var Hypermodal = Class.create({
	/**
	 * Constructor
	**/
	initialize: function _init(p) {
		this.modalID     = p.modalID     || null;
		this.modalClass  = p.modalClass  || 'hypermodal';
		this.modalWidth  = p.modalWidth  || '500px';
		this.modalHeight = p.modalHeight || 'auto';
		
		this.title       = p.title       || p.subject || '';
		this.description = p.description || p.message || '';
		this.content     = p.content     || p.body    || '';
		this.buttons     = p.buttons     || p.btns    || null;
		
		this.onBeforeClose = p.onBeforeClose || null;
		this.onClose       = p.onClose       || null;
		this.onRendered    = p.onRendered    || null;
		
		this.disableCloseButton = p.disableCloseButton || false;
		this.disableCloseByMask = p.disableCloseByMask || false;
		
		return this;
	}//<--initialize()
	,
	/**
	 * Render
	**/
	render: function _render(e) {
		// where to render?
		if (typeof e === 'undefined') {
			e = document.getElementsByTagName('body')[0] || $$('body').first();
		}
		
		this._e = e;
		
		// create modal
		var modal = this._modal = new Element('div').setStyle({
			width : this.modalWidth,
			height: this.modalHeight
		}).observe('click', function _safeArea(e) {
			e.stop();
		});
		
		// header
		var header = this._modalHeader = new Element('div', {className: 'hypermodal-header'}).insert(
			(this.disableCloseButton)
			? null
			: new Element('span', {className: 'hypermodal-button hypermodal-button-close'}).insert(
				'&times;'
			).observe('click', this.close.bind(this))
		).insert(
			new Element('h3').insert(this.title)
		).insert(
			new Element('p').insert(this.description)
		);
		modal.insert(this._modalHeader);
		
		// content
		if (this.content !== '') {
			var content = this._modalContent = new Element('div', {className: 'hypermodal-content'}).insert(this.content);
			modal.insert(content);
		}
		
		// footer
		if (this.buttons === null) {
			this.buttons = [
				{
					label   : 'OK',
					color   : '@blue',
					onClick : this.close.bind(this),
					disabled: false
				}
			];
		}
		
		var footer = this._modalFooter = new Element('div', {className: 'hypermodal-footer hypermodal-clearfix'});
		
		this.buttons.each(function _eachBtns(btn) {
			var button = btn._button = new Element('span', {className: 'hypermodal-button'}).insert(btn.label);
			
			// button methods
			btn.init = function _initBtn() {
				if (btn.disabled === true) {
					button.addClassName('hypermodal-button-disabled');
					button.stopObserving('click');
				} else {
					button.removeClassName('hypermodal-button-disabled');
					if (typeof btn.onClick !== 'undefined') {
						button.observe('click', function _onClickButton(e) {
							btn.onClick(e, btn, this);
						}.bind(this));
					}
				}
				
				// coloring
				if (typeof btn.color !== 'undefined') {
					if (btn.color.charAt(0) === '@') {
						button.addClassName('hypermodal-button-color-' + btn.color.slice(1));
					} else {
						button.style.backgroundColor = btn.color;
					}
				}
			}.bind(this);
			
			btn.enable = function _enableBtn() {
				btn.disabled = false;
				btn.init();
			};
			
			btn.disable = function _disableBtn() {
				btn.disabled = true;
				btn.init();
			};
			
			btn.init();
			footer.insert(button);
		}.bind(this));
		
		modal.insert(footer);
		
		// create base
		var base = this._base = new Element('div', {
			className: this.modalClass
		}).insert(
			new Element('div').insert(
				modal
			)
		);
		
		if (this.disableCloseByMask === false) {
			base.observe('click', this.close.bind(this));
		}
		
		// set id attr
		if (this.modalID !== null) {
			base.setAttribute('id', this.modalID);
		}
		
		// insert container to render element
		$(e).insert(base);
		
		// positioning
		this.positioning();
		
		// appear
		this._modal.setOpacity(0);
		
		this.showTimer = setTimeout(function _showTimr() {
			this._modal.setOpacity(1);
		}.bind(this), 50);
		
		// Event: onRendered
		if (this.onRendered !== null) this.onRendered(this);
		
		return this;
	}//<--render()
	,
	/**
	 * Close
	**/
	close: function _close(e) {
		// stop bubbling
		if (typeof e !== 'undefined') try { e.stop(); } catch (e) {}
		
		// Event: onBeforeClose
		if (this.onBeforeClose !== null) {
			if (this.onBeforeClose(this) === false) {
				return this;//abort closing
			}
		}
		
		// clear
		clearTimeout(this.showTimer);
		clearInterval(this.positioningInterval);
		
		// remove
		this.buttons.each(function _eachBtns(btn) {
			btn._button.stopObserving();
		});
		
		this._modal.setOpacity(0);
		this._base.style.background = 'none';
		
		setTimeout(function _remover() {
			try { this._base.remove(); } catch (e) {}
		}.bind(this), 200);
		
		// Event: onClose
		if (this.onClose !== null) this.onClose(this);
		
		return this;
	}//<--close()
	,
	/**
	 * Positioning
	**/
	positioning: function _positioning() {
		clearInterval(this.positioningInterval);
		
		var baseHeight  = 0;
		var modalHeight = 0;
		
		this.positioningInterval = setInterval(function _posIntrvl() {
			if ((baseHeight === this._base.getHeight()) && (modalHeight === this._modal.getHeight())) {
				return;
			}
			
			baseHeight  = this._base.getHeight();
			modalHeight = this._modal.getHeight();
			
			var modalTop          = parseInt(this._base.firstChild.getStyle('top').replace('px', ''), 10);
			var modalHeaderHeight = this._modalHeader.getHeight();
			var modalFooterHeight = this._modalFooter.getHeight();
			
			var pos = (baseHeight / 2) - (modalHeight / 2);
			var lim = modalHeight + baseHeight - modalHeight - (modalTop * 2) - modalHeaderHeight - modalFooterHeight;
			
			if (pos < 0) {
				this._modalContent.style.height = lim + 'px';
			} else {
				this._base.firstChild.style.top = pos + 'px';
			}
		}.bind(this), 50);
		
		return this;
	}//<--positioning()
});