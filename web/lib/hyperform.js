/*!
 * Hyperform/1.2 for Prototype.js
 *
 * Copyright (c) 2012 Yuki KAN
 * Licensed under the MIT-License.
 *
 * http://akkar.in/projects/hyperform/
**/
var Hyperform = Class.create({
	
	/** 
	 *  new Hyperform(option) -> Hyperform
	 *
	 *  Constructor.
	**/
	initialize: function _initHyperform(opt) {
		this.fields      = opt.fields      || [];
		this.formID      = opt.formID      || null;
		this.formClass   = opt.formClass   || 'hyperform';
		this.formWidth   = opt.formWidth   || 'auto';
		this.formStyle   = opt.formStyle   || {};
		this.labelWidth  = opt.labelWidth  || '120px';
		this.labelAlign  = opt.labelAlign  || 'left';
		this.labelValign = opt.labelValign || 'middle';
		this.submitLabel = opt.submitLabel || 'Submit';
		this.validator   = opt.validator   || {};
		this.onSubmit    = opt.onSubmit    || null;
		this.onRendered  = opt.onRendered  || null;
		this.onValid     = opt.onValid     || null;
		this.onInvalid   = opt.onInvalid   || null;
		
		this.disableFormWhenSubmit = opt.disableFormWhenSubmit || false;
		this.disableSubmitButton   = opt.disableSubmitButton   || false;
		
		return this;
	},//<--initialize()
	
	/**
	 *  Hyperform#render(element) -> Hyperform
	 *
	 *  Render the Hyperform.
	 *
	 *  ##### Examples
	 *
	 *      var form = new Hyperform({...});
	 *
	 *      var container = new Element('div');
	 *      form.render(container);
	 *      // -> Hyperform
	 *
	 *      //<div id="this-is-not-recommended"></div>
	 *      form.render('this-is-not-recommended');
	 *      // -> Hyperform
	**/
	render: function(p) {
		var target = $(p);//target element
		
		// create table element
		var table = this._table = new Element('table', {
			className: this.formClass
		});
		if (this.formID !== null) {
			table.writeAttribute('id', this.formID);
		}
		table.setStyle({
			width: this.formWidth
		});
		
		if ((this.formStyle !== {}) && (typeof this.formStyle === 'object')) {
			table.setStyle(this.formStyle);
		}
		
		// insert table to target
		if (target.innerHTML.empty() === false) {
			try {
				target.innerHTML = '';
				target.appendChild(table);
			} catch(e) {
				target.update(table);
			}
		} else {
			target.insert(table);
		}
		
		// create tbody element
		var tbody = new Element('tbody');
		table.insert(tbody);
		
		// fields
		this.fields.each(function(field, i) {
			var tr = field._tr = new Element('tr');//insert row
			tbody.insert(tr);
			
			//
			// th
			//
			var th = new Element('th');
			
			th.setStyle({
				width        : this.labelWidth,
				textAlign    : this.labelAlign,
				verticalAlign: this.labelValign
			});
			
			var label = new Element('label').insert(field.label || '&nbsp;');
			
			if (typeof field.icon !== 'undefined') {
				label.addClassName('hyperform-icon');
				label.setStyle({
					backgroundImage: 'url(' + field.icon + ')'
				})
			}
			
			th.insert(label);
			
			tr.insert(th);
			
			// adjust size by browser
			if (Prototype.Browser.WebKit === true) {
				setTimeout(function _adjustSizeWebkit() {
					if (this.labelWidth && (this.formWidth !== 'auto') && (table.getStyle('table-layout') === 'fixed')) {
						// adjust
						th.style.width = (
							parseInt(this.labelWidth.replace('px', ''), 10) +
							parseInt(th.getStyle('padding-left').replace('px', ''), 10) +
							parseInt(th.getStyle('padding-right').replace('px', ''), 10) +
							parseInt(th.getStyle('border-left-width').replace('px', ''), 10) +
							parseInt(th.getStyle('border-right-width').replace('px', ''), 10)
						) + 'px';
					}
				}.bind(this), 0);
			}
			
			//
			// td
			//
			// input/textarea
			if (typeof field.input !== 'undefined') {
				field._d = field.input;
				
				// basic input
				var isBasicInput = (
					(field.input.type === 'text') ||
					(field.input.type === 'password') ||
					(field.input.type === 'password-no-confirm')
				);
				if (isBasicInput) {
					// create input element
					field._f = new Element('input', {
						type       : (field.input.type === 'text') ? 'text' : 'password'
					});
					
					// create input container
					field._c = new Element('div', {className: 'input'}).insert(field._f);
					
					if (typeof field.input.maxlength !== 'undefined') {
						field._f.writeAttribute('maxlength', field.input.maxlength);
					}
					
					if (typeof field.input.placeholder !== 'undefined') {
						field._f.writeAttribute('placeholder', field.input.placeholder);
					}
					
					if (typeof field.input.value !== 'undefined') {
						field._f.writeAttribute('value', field.input.value);
					}
					
					if (typeof field.input.width !== 'undefined') {
						field._f.setStyle({width: field.input.width + 'px'});
					} else {
						field._f.setStyle({width: '200px'});
					}
					
					// observe onChange
					field._f.observe('change', function() {
						field.validate();
					});
					
					// for confirm input
					if (field.input.type === 'password') {
						// create input element
						field._fc = new Element('input', {
							type: 'password'
						});
						
						field._c.insert(field._fc);
						
						if (typeof field.input.maxlength !== 'undefined') {
							field._fc.writeAttribute('maxlength', field.input.maxlength);
						}
						
						if (typeof field.input.placeholder !== 'undefined') {
							field._fc.writeAttribute('placeholder', field.input.placeholder);
						}
						
						if (typeof field.input.value !== 'undefined') {
							field._fc.writeAttribute('value', field.input.value);
						}
						
						if (typeof field.input.width !== 'undefined') {
							field._fc.setStyle({width: field.input.width + 'px'});
						} else {
							field._fc.setStyle({width: '200px'});
						}
						
						// observe onChange
						field._fc.observe('change', function() {
							field.validate();
						});
					}
					
					// if appendText
					if (typeof field.input.appendText !== 'undefined') {
						field._c.insert(
							new Element('span', {className: 'append'}).insert(field.input.appendText)
						);
					}
					
					// if prependText
					if (typeof field.input.prependText !== 'undefined') {
						field._c.insert({top:
							new Element('span', {className: 'prepend'}).insert(field.input.prependText)
						});
					}
					
					// field method
					field.setValue = function _setValueInput(value) {
						field._f.value = value;
						return field;
					}.bind(this);
				}//<--if
				
				// textarea
				if (field.input.type === 'textarea') {
					// create textarea element
					field._f = new Element('textarea');
					
					if (typeof field.input.maxlength !== 'undefined') {
						field._f.writeAttribute('maxlength', field.input.maxlength);
					}
					
					if (typeof field.input.placeholder !== 'undefined') {
						field._f.writeAttribute('placeholder', field.input.placeholder);
					}
					
					if (typeof field.input.value !== 'undefined') {
						field._f.insert(!!field.input.value ? field.input.value.escapeHTML() : '');
					}
					
					if (typeof field.input.width !== 'undefined') {
						field._f.setStyle({width: field.input.width + 'px'});
					} else {
						field._f.setStyle({width: '300px'});
					}
					
					if (typeof field.input.height !== 'undefined') {
						field._f.setStyle({height: field.input.height + 'px'});
					} else {
						field._f.setStyle({height: '50px'});
					}
					
					// observe onChange
					field._f.observe('change', function() {
						field.validate();
					});
					
					// field method
					field.setValue = function _setValueTextarea(value) {
						field._f.value = value;
						return field;
					}.bind(this);
				}//<--if
				
				// radio
				if ((field.input.type === 'radio') || (field.input.type === 'radio-block')) {
					// create value object
					field._o = null;
					
					if (typeof field.input.value !== 'undefined') {
						field._o = field.input.value;
					}
					
					// create *interface* container
					field._i = new Element('div', {className: 'radio'});
					
					if (field.input.type === 'radio-block') {
						field._i.addClassName('radio-block');
					}
					
					// each items
					field.input.items.each(function _eachItemsInput(a) {
						// create radio button
						var button = a._entity = new Element('button');
						field._i.insert(button);
						
						var label = new Element('label').insert(a.label);
						button.insert(label);
						
						if (typeof a.icon !== 'undefined') {
							label.addClassName('hyperform-icon');
							label.setStyle({
								backgroundImage: 'url(' + a.icon + ')'
							});
						}
						
						// observe onClick
						button.observe('click', function _onClickRadioBtn() {
							// write value
							field._o = a.value;
							
							// rewrite selected className
							field._i.select('button').each(function _eachRadioBtns(b) {
								b.removeClassName('selected');
							});
							this.addClassName('selected');
							
							// validate
							field.validate();
						});
						
						// selected state
						if ((typeof a.isSelected !== 'undefined') && (a.isSelected === true)) {
							button.addClassName('selected');
							field._o = a.value;
						}
						
						// button style customization
						if (typeof field.input.style !== 'undefined') {
							button.setStyle(field.input.style);
						}
					});//<--#each
					
					// field method
					field.selectItem = function _selectItemRadio(value) {
						field.input.items.each(function _eachItemsInput(a) {
							if (a.value !== value) {
								return;// continue
							}
							
							field._o = a.value;
							
							field._i.select('button').each(function _eachRadioBtns(b) {
								b.removeClassName('selected');
							});
							a._entity.addClassName('selected');
						});
						
						return field;
					}.bind(this);
				}//<--if
				
				// checkbox
				if ((field.input.type === 'checkbox') || (field.input.type === 'checkbox-block')) {
					// create object (array)
					field._o = [];
					
					// create *interface* container
					field._i = new Element('div', {className: 'checkbox'});
					
					if (field.input.type === 'checkbox-block') {
						field._i.addClassName('checkbox-block');
					}
					
					// each items
					field.input.items.each(function _eachItemsInput(a) {
						// create radio button
						var button = a._entity = new Element('button');
						
						var label = new Element('label').insert(a.label);
						
						if (typeof a.icon !== 'undefined') {
							label.addClassName('hyperform-icon');
							label.setStyle({
								backgroundImage: 'url(' + a.icon + ')'
							});
						}
						
						button.insert(label);
						
						// observe onClick
						button.observe('click', function _onClickChkboxBtn() {
							if (this.hasClassName('selected') === true) {
								// remove
								field._o = field._o.without(a.value);
								this.removeClassName('selected');
							} else {
								// add
								field._o.push(a.value);
								this.addClassName('selected');
							}
							
							// validate
							field.validate();
						});
						
						// insert to *interface* container
						field._i.insert(button);
						
						// selected state
						if ((typeof a.isSelected !== 'undefined') && (a.isSelected === true)) {
							button.addClassName('selected');
							field._o.push(a.value);
						}
						
						// button style customization
						if (typeof field.input.style !== 'undefined') {
							button.setStyle(field.input.style);
						}
					});//<--#each
					
					// field methods
					field.selectItem = function _selectItemChkbox(value) {
						field.input.items.each(function _eachItemsInput(a) {
							if (a.value !== value) {
								return;// continue
							}
							
							if (a._entity.hasClassName('selected') === true) {
								return;
							}
							
							field._o.push(a.value);
							a._entity.addClassName('selected');
						});
						
						return field;
					}.bind(this);
					
					field.unselectItem = function _unselectItemChkbox(value) {
						field.input.items.each(function _eachItemsInput(a) {
							if (a.value !== value) {
								return;// continue
							}
							
							if (a._entity.hasClassName('selected') === false) {
								return;
							}
							
							field._o = field._o.without(a.value);
							a._entity.removeClassName('selected');
						});
						
						return field;
					}.bind(this);
				}//<--if
				
				// pulldown
				if (field.input.type === 'pulldown') {
					// create value object
					field._o = null;
					
					if (typeof field.input.value !== 'undefined') {
						field._o = field.input.value;
					}
					
					// create *interface* container
					field._i = new Element('div', {className: 'pulldown'});
					
					// interface
					var button = new Element('button');
					field._i.insert(button);
					
					var label = new Element('label');
					button.insert(label);
					
					var list = new Element('div', {className: 'pulldown-list'}).hide();
					field._i.insert(list);
					
					if (!!field.input.isForcePut) {
						list.addClassName('pulldown-list-put');
					}
					
					button.observe('click', function _onClickBtnPulldown(e) {
						e.stop();
						button.toggleClassName('selecting');
						list.toggle();
						
						if (list.visible() === false) {
							return;
						}
						
						// positioning
						var isOut = (
							(
								(table.cumulativeOffset().top + table.getHeight())
								- (list.cumulativeOffset().top + list.getHeight())
							) <= 0
						);
						if (isOut) {
							var isOver = ((table.getHeight() - list.getHeight()) < 0);
							if (isOver) {
								if (list.hasClassName('pulldown-list-put') === false) {
									list.addClassName('pulldown-list-put');
								}
							} else {
								if (list.hasClassName('pulldown-list-upper') === false) {
									list.addClassName('pulldown-list-upper');
								}
							}
						}
					});
					
					table.observe('click', function _onClickTablePulldown() {
						if (list.visible() === true) {
							button.removeClassName('selecting');
							list.hide();
						}
					});
					
					field.input.items.unshift({
						label: '&mdash;',
						value: null
					});
					
					var selectItem = function _selectItem(n) {
						field._o = field.input.items[n].value;
						
						label.update(field.input.items[n].label);
						
						if (typeof field.input.items[n].icon === 'undefined') {
							label.removeClassName('hyperform-icon');
							label.setStyle({
								backgroundImage: 'none'
							});
						} else {
							label.addClassName('hyperform-icon');
							label.setStyle({
								backgroundImage: 'url(' + field.input.items[n].icon + ')'
							});
						}
					};
					
					selectItem(0);
					
					// each items
					field.input.items.each(function _eachItemsInput(a, i) {
						var b = new Element('div').insert(a.label).observe('click', function(e) {
							selectItem(i);
							button.removeClassName('selecting');
							list.hide();
							
							// validate
							field.validate();
							
							e.stop();
						});
						list.insert(b);
						
						if (typeof a.icon !== 'undefined') {
							b.addClassName('hyperform-icon');
							b.setStyle({
								backgroundImage: 'url(' + a.icon + ')'
							});
						}
						
						if (typeof a.isSelected === 'undefined') {
							return;//continue
						}
						
						if (a.isSelected === true) {
							selectItem(i);
						}
					});
					
					// field method
					field.selectItem = function _selectItemPulldown(value) {
						field.input.items.each(function _eachItemsInput(a, i) {
							if (a.value !== value) {
								return;// continue
							}
							
							selectItem(i);
							field.validate();
						});
						
						return field;
					}.bind(this);
				}//<--if
				
				// slider
				if (field.input.type === 'slider') {
					// create value object
					field._o = null;
					
					if (typeof field.input.value !== 'undefined') {
						field._o = field.input.value;
					}
					
					// create *interface* container
					field._i = new Element('div', {className: 'slider'});
					
					// interface
					var base = new Element('div', {className: 'slider-base'});
					field._i.insert(base);
					
					var fill = new Element('div', {className: 'slider-fill'});
					base.insert(fill);
					
					var handle = new Element('div', {className: 'slider-handle'});
					fill.insert(handle);
					
					var display = new Element('div', {className: 'slider-display'});
					field._i.insert(display);
					
					var isDragging   = false;
					var lastPosition = 0;
					var baseWidth    = field.input.width || 300;
					var fillWidth    = 0;
					var unitWidth    = baseWidth / (((field.input.items.length === 1) ? 2 : field.input.items.length) - 1);
					
					(field.input.items.length - 2).times(function(n) {
						var pos = (n + 1) * unitWidth;
						
						base.insert(
							new Element('div', {className: 'slider-scale'}).setStyle({
								left: pos + 'px'
							})
						);
					});
					
					base.setStyle({
						width: baseWidth + 'px'
					});
					
					if (field.input.items.length === 1) {
						handle.hide();
						display.update(field.input.items.first().label);
					}
					
					// each items
					field.input.items.each(function _eachItemsInput(a, i) {
						a._sliderPosition = i * unitWidth;
						
						if (a.isSelected === true && i !== 0) {
							lastPosition = i * unitWidth - 1;
							fillWidth    = i * unitWidth - 1;
						}
					});
					
					var updateSlider = function _updateSlider(isSnap) {
						fill.setStyle({
							width: fillWidth + 'px'
						});
						
						var isBefore = ((fillWidth % unitWidth) < (unitWidth / 2));
						
						field.input.items.each(function _eachItemsInput(a, i) {
							var itemPos = i * unitWidth;
							
							if (fillWidth >= itemPos) {
								return;//continue
							}
							
							if (isBefore) {
								var label = field.input.items[i - 1].label;
								var value = field.input.items[i - 1].value;
								itemPos -= unitWidth;
							} else {
								var label = a.label;
								var value = a.value;
							}
							
							field._o = value;
							
							display.update(label);
							
							if (isSnap) {
								fillWidth = itemPos;
								updateSlider();
							}
							
							throw $break;
						});
					};
					updateSlider();
					
					var onDragStart = function _onDragStart(e) {
						isDragging   = true;
						lastPosition = e.pointerX();
						
						var onMove = function(e) {
							if (isDragging === true) {
								var delta = e.pointerX() - lastPosition;
								fillWidth    = fillWidth + delta;
								
								if (fillWidth < 0) {
									fillWidth = 0;
								} else if (fillWidth > baseWidth) {
									fillWidth = baseWidth;
								} else {
									lastPosition = e.pointerX();
								}
								
								updateSlider();
							}
							
							e.stop();
							return false;
						};
						
						var onUp = function(e) {
							isDragging = false;
							
							$(document.body).stopObserving('mousemove', onMove);
							$(document.body).stopObserving('touchmove', onMove);
							$(document.body).stopObserving('mouseup', onUp);
							$(document.body).stopObserving('touchend', onUp);
							
							updateSlider(true);
							
							e.stop();
							return false;
						};
						
						$(document.body).observe('mousemove', onMove);
						$(document.body).observe('touchmove', onMove);
						$(document.body).observe('mouseup', onUp);
						$(document.body).observe('touchend', onUp);
						
						e.stop();
						return false;
					};
					
					var onClickBase = function(e) {
						if (isDragging === false) {
							lastPosition = e.pointerX();
							fillWidth = e.offsetX;
							updateSlider(true);
						}
						
						e.stop();
						return false;
					};
					
					// event observe
					handle.observe('mousedown', onDragStart);
					handle.observe('touchstart', onDragStart);
					base.observe('mousedown', onClickBase);
					
					// field method
					field.selectItem = function _selectItemSlider(value) {
						field.input.items.each(function _eachItemsInput(a, i) {
							if (a.value !== value) {
								return;// continue
							}
							
							lastPosition = i * unitWidth - 1;
							fillWidth    = i * unitWidth - 1;
							updateSlider(true);
						});
						
						return field;
					}.bind(this);
				}//<--if slider
				
				// if tag
				if (field.input.type === 'tag') {
					// create object (array)
					field._o = !!field.input.values ? field.input.values.invoke('escapeHTML') : [];
					
					// create *interface* container
					field._i = new Element('div', {className: 'tag'})
					
					// create tag input
					var input = new Element('input');
					field._i.insert(input);
					
					if (typeof field.input.maxlength !== 'undefined') {
						input.writeAttribute('maxlength', field.input.maxlength);
					}
					
					if (typeof field.input.placeholder !== 'undefined') {
						input.writeAttribute('placeholder', field.input.placeholder);
					}
					
					if (typeof field.input.width !== 'undefined') {
						input.setStyle({width: field.input.width + 'px'});
					} else {
						input.setStyle({width: '100px'});
					}
					
					// create tag add button
					var addButton = new Element('button').insert('&#x2b;');// (v1.0:&#x25B8;)
					field._i.insert(addButton);
					
					// create tag list container
					var tagListContainer = new Element('div');
					field._i.insert(tagListContainer);
					
					function makeTagList() {
						tagListContainer.update();
						
						if (field._o.length === 0) {
							tagListContainer.hide();
							return;
						} else {
							tagListContainer.show();
						}
						field._o.each(function(tag) {
							var label = new Element('span').insert(tag);
							
							var delButton = new Element('button').insert('&times;');
							delButton.observe('click', function() {
								field._o = field._o.without(tag);
								
								makeTagList();
							});
							
							label.insert(delButton);
							tagListContainer.insert(label);
						});
					};
					makeTagList();
					
					function addTag() {
						var value = $F(input).strip().escapeHTML();
						
						if (value === '') {
							return;
						}
						
						field._o = field._o.without(value);
						field._o.push(value);
						
						input.value = '';
						makeTagList();
					};
					
					input.observe('keydown', function _onKeydown(e) {
						if (e.keyCode === 13) {
							addTag();
							e.stop();
						}
					});
					addButton.observe('click', addTag);
					
					// field methods
					field.addValue = function _addValueTag(value) {
						input.value = value;
						addTag();
						
						return field;
					}.bind(this);
					
					field.removeValue = function _removeValueTag(value) {
						field._o = field._o.without(value);
						
						makeTagList();
						
						return field;
					}.bind(this);
				}//<--if tag
			}//<--if
			
			// insert
			
			var td = new Element('td').setStyle({
				textAlign: field.align || 'left'
			});
			
			if (typeof field.style !== 'undefined') {
				td.setStyle(field.style);
			}
			
			if (typeof field._i !== 'undefined') {
				td.insert(field._i);
			}
			
			if (typeof field._c !== 'undefined') {
				td.insert(field._c);
			} else {
				if (typeof field._f !== 'undefined') {
					td.insert(field._f);
				}
			}
			
			if (typeof field.text !== 'undefined') {
				td.insert(new Element('div', {className: 'text'}).insert(('' + field.text).escapeHTML()));
			}
			
			if (typeof field.description !== 'undefined') {
				td.insert(new Element('div', {className: 'text'}).insert(('' + field.description).escapeHTML()));
			}
			
			if (typeof field.html !== 'undefined') {
				td.insert(new Element('div').insert(field.html));
			}
			
			if (typeof field.innerHTML !== 'undefined') {
				td.insert(new Element('div').insert(field.innerHTML));
			}
			
			// warn
			if (typeof field._d !== 'undefined') {
				field._warn = new Element('ul', {className:'warn'})
				td.insert({
					top: field._warn
				});
			}
			// insert
			tr.insert(td);
			
			// validate
			field.validate = function _validateRow() {
				this.validate(field.key);
				return field;
			}.bind(this);
			
			// leave a dependency check
			this.reliance(field);
		}.bind(this));
		
		//submit
		if ((this.onSubmit !== null) && (this.disableSubmitButton === false)) {
			var tr =  new Element('tr');//insert row
			tbody.insert(tr);
			
			table._submit = tr;
			//insert
			tr.insert(
				new Element('td', {
					align    : 'left',
					colspan  : 2,
					className: 'submit'
				}).insert(
					new Element('button').observe('click', this.submit.bind(this)).insert(this.submitLabel)
				)
			);
		}
		
		this.applyStyle();
		
		if (this.onRendered !== null) {
			this.onRendered(this);
		}
		
		return this;
	},//<--render
	
	/**
	 *  Hyperform#validate(key) -> Boolean
	 *  - key (String) - optional
	 *
	 *  Validate the value of the specified item or all items of the form.
	 *  Will return a boolean as a result.
	**/
	validate: function(key) {
		this.fields.each(function(field) {
			// ignore
			if ((typeof key !== 'undefined') && (key !== field.key)) {
				return;//continue
			}
			
			if ((typeof field.input === 'undefined') || (field.key === null)) {
				return;//continue
			}
			
			field._valid = true;
			field._warn.update();
			
			// if unvisible
			if (field._tr.visible() === false) {
				return;//continue
			}
			
			if (typeof field._f !== 'undefined') {
				var value = $F(field._f).strip();
				
				// if require
				if ((field._d.isRequired === true) && (value === '')) {
					field._valid = false;
				}
				
				// minlength
				if ((value !== '') && (field._d.minlength) && (field._d.minlength > value.length)) {
					field._valid = false;
				}
				
				// maxlength
				if ((value !== '') && (field._d.maxlength) && (field._d.maxlength < value.length)) {
					field._valid = false;
				}
				
				// if validator
				if ((value !== '') && (typeof field._d.validator !== 'undefined')) {
					if (Object.isString(field._d.validator) === true) {
						if (value.replace(/\n/g, '').match(this.validator[field._d.validator].regex) === null) {
							field._valid = false;
							field._warn.insert(new Element('li').insert(this.validator[field._d.validator].warning));
						}
					}
					
					if (Object.isFunction(field._d.validator) === true) {
						var result = field._d.validator(value);
						if (result !== true) {
							field._valid = false;
							if (Object.isString(result) === true) {
								field._warn.insert(new Element('li').insert(result));
							}
						}
					}
				}//<--if
				
				// if fc
				if (typeof field._fc !== 'undefined') {
					if (value !== $F(field._fc)) {
						field._valid = false;
					}
				}
			}
			
			if (typeof field._o !== 'undefined') {
				var isNull = (field._o === null);
				if (isNull) {
					if (field._d.isRequired === true) {
						field._valid = false;
					}
				}
				
				
			}
		}.bind(this));
		
		this.applyStyle();
		
		var isValid = true;
		
		this.fields.each(function(field) {
			if (typeof field._valid == 'undefined') return;
			
			if (field._valid === false) {
				isValid = false;
				throw $break;
			}
		}.bind(this));
		
		return isValid;
	},//<--validate
	
	/**
	 *  Hyperform#submit() -> Hyperform
	 *
	 *  Submit the form.
	 *
	 *  That said, does not mean to send data automatically to somewhere.
	 *  Validates the entire form, call back the result to onSubmit If it is correct.
	**/
	submit: function() {
		// validate
		if (this.validate() === false) {
			return this;
		}
		
		// disable
		if (this.disableFormWhenSubmit === true) {
			this.disable();
		}
		
		if (this.onSubmit !== null) {
			this.onSubmit(this.result(), this);
		}
		
		return this;
	},//<--submit
	
	/**
	 *  Hyperform#result() -> Object
	 *
	 *  Convert form data to the Object.
	**/
	result: function() {
		var result = {};
		
		this.fields.each(function(field) {
			if ((typeof field.key === 'undefined') || (field.key === null)) {
				return;//continue
			}
			
			if (field._tr.visible() === false) {
				return;//continue
			}
			
			result[field.key] = this.getValue(field);
		}.bind(this));
		
		return result;
	},//<--result
	
	/**
	 *  Hyperform#getField(key) -> Field object
	 *  - key (String)
	**/
	getField: function _getField(key) {
		var result = null;
		
		this.fields.each(function(field) {
			if ((typeof field.key === 'undefined') || (field.key === null)) {
				return;//continue
			}
			
			if (field._tr.visible() === false) {
				return;//continue
			}
			
			if (field.key !== key) {
				return;
			}
			
			result = field;
		}.bind(this));
		
		return result;
	},//<--getField
	
	/**
	 *  Hyperform#getValue(field) -> null | Number | String | Array | Date
	 *  - field - (object)
	 *
	 *  Get the value of the item.
	**/
	getValue: function _getValue(field) {
		if ((typeof field._f === 'undefined') && (typeof field._o === 'undefined')) {
			return null;
		}
		
		if (typeof field._d === 'undefined') {
			return null;
		}
		
		if (field._tr.visible() === false) {
			return null;
		}
		
		var toNumber = ((typeof field._d.toNumber !== 'undefined') && (field._d.toNumber === true));
		
		var isNull = ((typeof field._o !== 'undefined') && (field._o === null));
		if (isNull) {
			if (toNumber) {
				return 0;
			} else {
				return null;
			}
		}
		
		var isNumber = ((typeof field._o !== 'undefined') && (Object.isNumber(field._o) === true));
		if (isNumber) {
			return field._o;
		}
		
		var isString = ((typeof field._o !== 'undefined') && (Object.isString(field._o) === true));
		if (isString) {
			if (toNumber) {
				return parseInt(field._o, 10);
			} else {
				return field._o;
			}
		}
		
		var isArray = ((typeof field._o !== 'undefined') && (Object.isArray(field._o) === true));
		if (isArray) {
			if (toNumber) {
				var result = [];
				
				for (var i = 0; i < field._o.length; i++) {
					result.push(parseInt(field._o[i], 10));
				}
				
				return result;
			} else {
				return field._o;
			}
		}
		
		var isDate = ((typeof field._o !== 'undefined') && (Object.isDate(field._o) === true));
		if (isDate) {
			if (toNumber) {
				return new Date(field._o).getTime();
			} else {
				return field._o;
			}
		}
		
		var isElement = ((typeof field._f !== 'undefined') && (Object.isElement(field._f) === true));
		if (isElement) {
			if (toNumber) {
				return parseInt($F(field._f).strip(), 10);
			} else {
				return $F(field._f).strip();
			}
		}
		
		return null;
	},//<--getValue
	
	/**
	 *  Hyperform#disable() -> Hyperform
	**/
	disable: function _disable() {
		this.fields.each(function(field) {
			if (typeof field._f === 'undefined') {
				return;
			}
			
			field._f.disable();
		});
		
		this._table._submit.hide();
		
		return this;
	},//<--disable
	
	/**
	 *  Hyperform#enable() -> Hyperform
	**/
	enable: function _enable() {
		this.fields.each(function(field) {
			if (typeof field._f === 'undefined') {
				return;
			}
			
			field._f.enable();
		});
		
		this._table._submit.show();
		
		return this;
	},//<--enable
	
	/**
	 *  Hyperform#reliance(field) -> Boolean
	**/
	reliance: function _reliance(field) {
		if (typeof field.depends === 'undefined') {
			return false;
		}
		
		if ((field.depends.length === 0) || (Object.isArray(field.depends) === false)) {
			return false;
		}
		
		var depends = [];
		var entities= [];
		
		this.fields.each(function(r) {
			field.depends.findAll(function _findDepends(f) {
				return (f.key === r.key);
			}).each(function _eachDepends(f) {
				depends.push(f);
				entities.push(r);
			});
		});
		
		delete field.depends;
		
		if ((depends.length === 0) || (entities.length === 0) || (depends.length !== entities.length)) {
			return false;
		}
		
		var checker = function _checkDependency() {
			var isActivation = true;
			
			for (var i = 0; i < depends.length; i++) {
				var value = this.getValue(entities[i]);
				
				if (typeof depends[i].operator === 'undefined') {
					if (typeof depends[i].value === 'undefined') {
						if (value === null) {
							isActivation = false;
						}
					} else {
						if (value !== depends[i].value) {
							isActivation = false;
						}
					}
				} else {
					if (eval(Object.inspect(value) + depends[i].operator + Object.inspect(depends[i].value))) {
						
					} else {
						isActivation = false;
					}
				}
			}
			
			var isChanged = false;
			
			if (isActivation) {
				if (field._tr.visible() === false) {
					isChanged = true;
					field._tr.show();
				}
			} else {
				if (field._tr.visible() === true) {
					isChanged = true;
					field._tr.hide();
				}
			}
			
			if (isChanged) {
				this.applyStyle();
			}
		}.bind(this);
		
		var ticket = 100;
		setInterval(function () {
			if (ticket < 0) {
				return;
			}
			
			checker();
			--ticket;
		}, 10);
		checker();
		
		var reloadTicket = function _reloadTicket() {
			ticket = 100;
		};
		
		this._table.observe('click', reloadTicket);
		this._table.observe('mousemove', reloadTicket);
		
		return true;
	},//<--reliance
	
	/**
	 *  Hyperform#applyStyle() -> Hyperform
	 *
	 *  Apply styles to the fields.
	**/
	applyStyle: function _applyStyle() {
		this.fields.findAll(function _findVisibleRows(field) {
			return ((typeof field._tr !== 'undefined') && field._tr.visible());
		}).each(function _eachRows(field, i) {
			// odd style
			if (i % 2 === 0) {
				field._tr.addClassName('hyperform-odd');
			} else {
				field._tr.removeClassName('hyperform-odd');
			}
			
			// intelli validations
			if (typeof field._valid !== 'undefined') {
				if (field._valid === true) {
					field._tr.removeClassName('invalid');
					field._tr.addClassName('valid');
				} else {
					field._tr.removeClassName('valid');
					field._tr.addClassName('invalid');
				}
			}
		});
		
		return this;
	}//<--applyStyle
});