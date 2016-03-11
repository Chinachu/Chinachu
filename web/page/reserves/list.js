P = Class.create(P, {
	
	init: function() {
		
		this.view.content.className = 'loading';
		
		this.initToolbar();
		this.draw();
		
		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:reserves', this.onNotify);
		
		return this;
	}
	,
	deinit: function() {
		
		document.stopObserving('chinachu:reserves', this.onNotify);
		
		return this;
	}
	,
	refresh: function() {
		
		this.drawMain();
		
		return this;
	}
	,
	initToolbar: function _initToolbar() {
		
		return this;
	}
	,
	updateToolbar: function() {
		
		if (!this.grid) return;
		
		var selected = this.grid.getSelectedRows();
		
		if (selected.length === 0) {
			
		} else if (selected.length === 1) {
			
		} else {
			
		}
	}
	,
	draw: function() {
		
		this.view.content.className = '';
		this.view.content.update();
		
		this.grid = new flagrate.Grid({
			multiSelect  : false,
			disableSelect: true,
			pagination   : true,
			fill         : true,
			cols: [
				{
					key  : 'type',
					label: '放送波',
					width: 45,
					align: 'center',
					disableResize: true
				},
				{
					key  : 'category',
					label: 'ジャンル',
					width: 70,
					align: 'center',
				},
				{
					key  : 'channel',
					label: 'ch',
					width: 140
				},
				{
					key  : 'title',
					label: 'タイトル'
				},
				{
					key  : 'datetime',
					label: '放送日時',
					width: 210
				},
				{
					key  : 'duration',
					label: '長さ',
					width: 50,
					align: 'center',
				}
			],
			onClick: function(e, row) {
				window.location.href = '#!/program/view/id=' + row.data.id + '/';
			},
			onRendered: function() {
				this.app.pm._lastHash = '!/reserves/list/page=' + this.grid.pagePosition + '/';
				history.replaceState(null, null, '#' + this.app.pm._lastHash);
			}.bind(this)
		}).insertTo(this.view.content);
		
		if (this.self.query.page) {
			this.grid.pagePosition = parseInt(this.self.query.page, 10);
		}
		
		this.drawMain();
		
		return this;
	}
	,
	drawMain: function() {
		
		var rows = [];
		
		var programs = [];
		
		for (var i = 0, l = global.chinachu.reserves.length; i < l; i++) {
			programs.push(global.chinachu.reserves[i]);
		}
		
		programs.sort(function(a, b) {
			return a.start - b.start;
		});
		
		programs.each(function(program, i) {
			
			var row = {
				className: '',
				data: program,
				cell: {
					id: {
						className: 'id',
						sortAlt  : i,
						text     : program.id
					}
				},
				menuItems: [
					{
						label   : 'ルール作成...',
						icon    : './icons/regular-expression.png',
						onSelect: function() {
							new chinachu.ui.CreateRuleByProgram(program.id);
						}
					},
					'------------------------------------------',
					{
						label   : 'ツイート...',
						icon    : 'https://abs.twimg.com/favicons/favicon.ico',
						onSelect: function() {
							var left = (screen.width - 640) / 2;
							var top  = (screen.height - 265) / 2;
							
							var tweetWindow = window.open(
								'https://twitter.com/share?url=&text=' + encodeURIComponent(chinachu.util.scotify(program)),
								'chinachu-tweet-' + program.id,
								'width=640,height=265,left=' + left + ',top=' + top + ',menubar=no'
							);
						}
					},
					'------------------------------------------',
					{
						label   : 'SCOT形式でコピー...',
						onSelect: function(e) {
							window.prompt('コピーしてください:', chinachu.util.scotify(program));
						}
					},
					{
						label   : 'IDをコピー...',
						onSelect: function() {
							window.prompt('コピーしてください:', program.id);
						}
					},
					{
						label   : 'タイトルをコピー...',
						onSelect: function() {
							window.prompt('コピーしてください:', program.title);
						}
					},
					{
						label   : '説明をコピー...',
						onSelect: function() {
							window.prompt('コピーしてください:', program.detail);
						}
					},
					'------------------------------------------',
					{
						label   : '関連サイト',
						icon    : './icons/document-page-next.png',
						onSelect: function() {
							window.open("https://www.google.com/search?btnI=I'm+Feeling+Lucky&q=" + program.title);
						}
					},
					{
						label   : 'Google検索',
						icon    : './icons/ui-search-field.png',
						onSelect: function() {
							window.open("https://www.google.com/search?q=" + program.title);
						}
					},
					{
						label   : 'Wikipedia',
						icon    : './icons/book-open-text-image.png',
						onSelect: function() {
							window.open("https://ja.wikipedia.org/wiki/" + program.title);
						}
					}
				]
			};
			
			row.cell.type = {
				sortAlt  : program.channel.type,
				className: 'types',
				html     : '<span class="' + program.channel.type + '">' + program.channel.type + '</span>'
			};
			
			row.cell.category = {
				sortAlt    : program.category,
				className  : 'categories',
				html       : '<span class="bg-cat-' + program.category + '">' + program.category + '</span>'
			};
			
			row.cell.channel = {
				sortAlt    : program.channel.id,
				text       : program.channel.name,
				attribute  : {
					title: program.channel.id
				}
			};
			
			var titleHtml = program.flags.invoke('sub', /.+/, '<span class="flag #{0}">#{0}</span>').join('') + program.title;
			if (program.subTitle && program.title.indexOf(program.subTitle) === -1) {
				titleHtml += '<span class="subtitle">' + program.subTitle + '</span>';
			}
			if (typeof program.episode !== 'undefined' && program.episode !== null) {
				titleHtml += '<span class="episode">#' + program.episode + '</span>';
			}
			titleHtml += '<span class="id">#' + program.id + '</span>';
			
			row.menuItems.unshift('--');
			if (program.isManualReserved) {
				titleHtml = '<span class="flag manual">手動</span>' + titleHtml;
				
				row.menuItems.unshift({
					label   : '予約取消...',
					icon    : './icons/cross-script.png',
					onSelect: function() {
						new chinachu.ui.Unreserve(program.id);
					}
				});
			} else {
				if (program.isSkip) {
					titleHtml = '<span class="flag skip">スキップ</span>' + titleHtml;
					row.className += ' disabled';
					
					row.menuItems.unshift({
						label   : 'スキップの取消...',
						icon    : './icons/tick-circle.png',
						onSelect: function() {
							new chinachu.ui.Unskip(program.id);
						}
					});
				} else {
					row.menuItems.unshift({
						label   : 'スキップ...',
						icon    : './icons/exclamation-red.png',
						onSelect: function() {
							new chinachu.ui.Skip(program.id);
						}
					});
				}
			}
			if (program.isConflict) {
				titleHtml = '<span class="flag conflict">競合</span>' + titleHtml;
				row.className += ' disabled';
			}
			
			row.cell.title = {
				sortAlt    : program.title,
				html       : titleHtml,
				attribute  : {
					title: program.fullTitle + ' - ' + program.detail
				}
			};
			
			row.cell.duration = {
				sortAlt    : program.seconds,
				text       : program.seconds / 60 + 'm'
			};
			
			row.cell.datetime = {
				sortAlt    : program.start,
				element    : new chinachu.ui.DynamicTime({
					tagName: 'div',
					type   : 'full',
					time   : program.start
				}).entity
			};
			
			rows.push(row);
		});
		
		this.grid.splice(0, void 0, rows);
		
		return this;
	}
});
