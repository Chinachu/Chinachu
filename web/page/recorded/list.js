P = Class.create(P, {
	
	init: function() {
		
		this.view.content.className = 'loading';
		
		this.initToolbar();
		this.draw();
		
		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:recorded', this.onNotify);
		
		return this;
	}
	,
	deinit: function() {
		
		document.stopObserving('chinachu:recorded', this.onNotify);
		
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
			key: 'execute-scheduler',
			ui : new sakura.ui.Button({
				label  : 'EXECUTE {0}'.__('CLEANUP'.__()),
				icon   : './icons/eraser.png',
				onClick: function() {
					new chinachu.ui.Cleanup();
				}.bind(this)
			})
		});

		this.view.toolbar.add({
			key: 'search recored programs',
			ui : new sakura.ui.Button({
				label  : '{0}'.__('SEARCH RECORDED PROGRAMS'.__()),
				icon   : './icons/calendar-search-result.png',
				onClick: function() {
					window.location.href = '#!/recorded/search/'
				}.bind(this)
			})
		});
		
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
				this.app.pm._lastHash = '!/recorded/list/page=' + this.grid.pagePosition + '/';
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
		
		for (var i = 0, l = global.chinachu.recorded.length; i < l; i++) {
			programs.push(global.chinachu.recorded[i]);
		}
		
		programs.sort(function(a, b) {
			return b.start - a.start;
		});
		
		programs.each(function(program, i) {
			
			var row = {
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
						label   : '録画履歴の削除...',
						icon    : './icons/eraser.png',
						onSelect: function() {
							new chinachu.ui.RemoveRecordedProgram(program.id);
						}
					},
					{
						label   : '録画ファイルの削除...',
						icon    : './icons/cross-script.png',
						onSelect: function() {
							new chinachu.ui.RemoveRecordedFile(program.id);
						}
					},
					'------------------------------------------',
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
			if (program.subTitle && program.title.match(program.subTitle) === null) {
				titleHtml += '<span class="subtitle">' + program.subTitle + '</span>';
			}
			if (typeof program.episode !== 'undefined' && program.episode !== null) {
				titleHtml += '<span class="episode">#' + program.episode + '</span>';
			}
			titleHtml += '<span class="id">#' + program.id + '</span>';
			
			if (program.isManualReserved) {
				titleHtml = '<span class="flag manual">手動</span>' + titleHtml;
			}
			
			row.cell.title = {
				sortAlt    : program.title + (program.episode || 0).toString(36),
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