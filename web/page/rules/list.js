P = Class.create(P, {
	
	init: function() {
		
		this.view.content.className = 'loading';
		
		this.initToolbar();
		this.draw();
		
		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:rules', this.onNotify);
		
		return this;
	}
	,
	deinit: function() {
		
		document.stopObserving('chinachu:rules', this.onNotify);
		
		return this;
	}
	,
	refresh: function() {
		
		this.drawMain();
		
		return this;
	}
	,
	initToolbar: function _initToolbar() {
		
		this.view.toolbar.add({
			key: 'add',
			ui : new sakura.ui.Button({
				label  : 'ADD'.__(),
				icon   : './icons/plus-circle.png',
				onClick: function() {
					
				}.bind(this)
			})
		});
		
		this.view.toolbar.add({ key: '--', ui: new sakura.ui.Element({ tagName: 'hr' }) });
		
		this.view.toolbar.add({
			key: 'execute-scheduler',
			ui : new sakura.ui.Button({
				label  : 'EXECUTE {0}'.__('SCHEDULER'.__()),
				icon   : './icons/calendar-import.png',
				onClick: function() {
					
				}.bind(this)
			})
		});
		
		this.view.toolbar.add({ key: '--', ui: new sakura.ui.Element({ tagName: 'hr' }) });
		
		this.view.toolbar.add({
			key: 'modify',
			ui : new sakura.ui.Button({
				label  : 'MODIFY'.__(),
				icon   : './icons/hammer.png',
				onClick: function() {
					
				}.bind(this)
			})
		});
		
		this.view.toolbar.add({
			key: 'copy',
			ui : new sakura.ui.Button({
				label  : 'COPY'.__(),
				icon   : './icons/document-copy.png',
				onClick: function() {
					
				}.bind(this)
			})
		});
		
		this.view.toolbar.add({
			key: 'delete',
			ui : new sakura.ui.Button({
				label  : 'DELETE'.__(),
				icon   : './icons/cross-script.png',
				onClick: function() {
					
				}.bind(this)
			})
		});
		
		return this;
	}
	,
	draw: function() {
		
		this.view.content.className = '';
		this.view.content.update();
		
		this.grid = new flagrate.Grid({
			multiSelect: true,
			cols: [
				{
					key  : 'n',
					label: '#',
					width: 40,
					disableResize: true
				},
				{
					key  : 'types',
					label: '放送波',
					width: 70
				},
				{
					key  : 'categories',
					label: 'ジャンル',
					width: 70
				},
				{
					key  : 'channels',
					label: 'ch',
					width: 70
				},
				{
					key  : 'ignore_channels',
					label: '無視ch',
					width: 70
				},
				{
					key  : 'reserve_flags',
					label: 'フラグ',
					width: 60
				},
				{
					key  : 'ignore_flags',
					label: '無視ﾌﾗｸﾞ',
					width: 60
				},
				{
					key  : 'hour',
					label: '時間帯',
					width: 55
				},
				{
					key  : 'duration',
					label: '長さ(分)',
					width: 70
				},
				{
					key  : 'reserve_titles',
					label: '対象タイトル'
				},
				{
					key  : 'ignore_titles',
					label: '無視タイトル'
				},
				{
					key  : 'reserve_descriptions',
					label: '対象説明文'
				},
				{
					key  : 'ignore_descriptions',
					label: '無視説明文'
				}
			]
		}).insertTo(this.view.content);
		
		this.drawMain();
		
		return this;
	}
	,
	drawMain: function() {
		
		var rows = [];
		
		global.chinachu.rules.each(function(rule, i) {
			
			var row = {
				cell: {
					n: {
						sortAlt: i,
						text   : i.toString(10)
					}
				}
			};
			
			if (rule.types) {
				row.cell.types = {
					sortKey  : rule.types[0],
					className: 'types',
					html     : rule.types.invoke('sub', /^(.{1}).*$/, '<span class="#{0}">#{1}</span>').join('')
				};
			} else {
				row.cell.types = {
					className: 'default',
					sortKey  : 0,
					text     : 'any'
				};
			}
			
			if (rule.categories) {
				row.cell.categories = {
					sortKey    : rule.categories[0],
					className  : 'categories',
					html       : rule.categories.invoke('sub', /.+/, '<span class="bg-cat-#{0}">#{0}</span>').join(''),
					postProcess: function(td) {
						if (rule.categories.length > 1) {
							new flagrate.Popover({
								target: td,
								text  : rule.categories.join(', ')
							});
						}
					}
				};
			} else {
				row.cell.categories = {
					className: 'default',
					sortKey  : 0,
					text     : 'any'
				};
			}
			
			if (rule.channels) {
				row.cell.channels = {
					text       : rule.channels.join(', '),
					postProcess: function(td) {
						new flagrate.Popover({
							target: td,
							text  : rule.channels.join(', ')
						});
					}
				};
			} else {
				row.cell.channels = {
					className: 'default',
					sortKey  : 0,
					text     : 'any'
				};
			}
			
			if (rule.ignore_channels) {
				row.cell.ignore_channels = {
					text       : rule.ignore_channels.join(', '),
					postProcess: function(td) {
						new flagrate.Popover({
							target: td,
							text  : rule.ignore_channels.join(', ')
						});
					}
				};
			} else {
				row.cell.ignore_channels = {
					className: 'default',
					sortKey  : 0,
					text     : 'none'
				};
			}
			
			if (rule.reserve_flags) {
				row.cell.reserve_flags = {
					text       : rule.reserve_flags.join(', '),
					postProcess: function(td) {
						new flagrate.Popover({
							target: td,
							text  : rule.reserve_flags.join(', ')
						});
					}
				};
			} else {
				row.cell.reserve_flags = {
					className: 'default',
					sortKey  : 0,
					text     : 'any'
				};
			}
			
			if (rule.ignore_flags) {
				row.cell.ignore_flags = {
					text       : rule.ignore_flags.join(', '),
					postProcess: function(td) {
						new flagrate.Popover({
							target: td,
							text  : rule.ignore_flags.join(', ')
						});
					}
				};
			} else {
				row.cell.ignore_flags = {
					className: 'default',
					sortKey  : 0,
					text     : 'none'
				};
			}
			
			if (rule.hour) {
				row.cell.hour = {
					sortKey  : rule.hour.start || 0,
					text     : [rule.hour.start || 0, rule.hour.end || 0].invoke('toPaddedString', 2).join('~')
				};
			} else {
				row.cell.hour = {
					className: 'default',
					sortKey  : 0,
					text     : 'all'
				};
			}
			
			if (rule.duration) {
				row.cell.duration = {
					sortKey  : rule.duration.min || 0,
					text     : [
						Math.round((rule.duration.min || 0) / 60),
						Math.round((rule.duration.max || 0) / 60)
					].invoke('toPaddedString', 2).join('~')
				};
			} else {
				row.cell.duration = {
					className: 'default',
					sortKey  : 0,
					text     : 'all'
				};
			}
			
			if (rule.reserve_titles) {
				row.cell.reserve_titles = {
					text       : rule.reserve_titles.join(', '),
					postProcess: function(td) {
						new flagrate.Popover({
							target: td,
							text  : rule.reserve_titles.join(', ')
						});
					}
				};
			} else {
				row.cell.reserve_titles = {
					className: 'default',
					sortKey  : 0,
					text     : 'any'
				};
			}
			
			if (rule.ignore_titles) {
				row.cell.ignore_titles = {
					text       : rule.ignore_titles.join(', '),
					postProcess: function(td) {
						new flagrate.Popover({
							target: td,
							text  : rule.ignore_titles.join(', ')
						});
					}
				};
			} else {
				row.cell.ignore_titles = {
					className: 'default',
					sortKey  : 0,
					text     : 'none'
				};
			}
			
			if (rule.reserve_descriptions) {
				row.cell.reserve_descriptions = {
					text       : rule.reserve_descriptions.join(', '),
					postProcess: function(td) {
						new flagrate.Popover({
							target: td,
							text  : rule.reserve_descriptions.join(', ')
						});
					}
				};
			} else {
				row.cell.reserve_descriptions = {
					className: 'default',
					sortKey  : 0,
					text     : 'any'
				};
			}
			
			if (rule.ignore_descriptions) {
				row.cell.ignore_descriptions = {
					text       : rule.ignore_descriptions.join(', '),
					postProcess: function(td) {
						new flagrate.Popover({
							target: td,
							text  : rule.ignore_descriptions.join(', ')
						});
					}
				};
			} else {
				row.cell.ignore_descriptions = {
					className: 'default',
					sortKey  : 0,
					text     : 'none'
				};
			}
			
			rows.push(row);
		});
		
		this.grid.splice(0, null, rows);
		
		return this;
	}
});