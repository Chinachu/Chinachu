P = Class.create(P, {
	
	init: function _initPage() {
		this.view.content.className = 'loading';
		
		this.draw();
		this.timer.loadAsync = setTimeout(function() {
			//this.load();
		}.bind(this), 100);
		
		return this;
	},
	
	draw: function _draw() {
		this.view.content.className = 'bg-chinachu';
		this.view.content.update();
		
		return this;
		
		this.view.overview = new sakura.ui.Container({
			// className: 'bg-smoke',
			style: {
				lineHeight: '0px'
			}
		}).render(this.view.content);
		
		var overviewGrid = new Hypergrid({
			disableResize: true,
			disableSelect: true,
			tableWidth   : '100%',
			tableClass   : 'hypergrid hypergrid-padded hypergrid-nohead hypergrid-noborder',
			colModel: [
				{
					key      : 'left',
					width    : '50%'
				},
				{
					key      : 'right',
					width    : '50%'
				}
			]
		});
		
		this.view.overviewBillAmount = new sakura.ui.Element({
			tagName: 'span'
		}).insert('...');
		
		this.view.overviewServerCount = new sakura.ui.Element({
			tagName: 'span'
		}).insert('...');
		
		this.view.overviewDiskCount = new sakura.ui.Element({
			tagName: 'span'
		}).insert('...');
		
		this.view.overviewArchiveCount = new sakura.ui.Element({
			tagName: 'span'
		}).insert('...');
		
		this.view.overviewCDROMCount = new sakura.ui.Element({
			tagName: 'span'
		}).insert('...');
		
		this.view.overviewNetworkCount = new sakura.ui.Element({
			tagName: 'span'
		}).insert('...');
		
		overviewGrid.push({
			cell: {
				left : {
					icon     : './sacloud/img/fugue/icons/money-coin.png',
					innerHTML: 'NEXT BILLING AMOUNT'.__()
				},
				right: {
					align    : 'right',
					innerHTML: this.view.overviewBillAmount.entity
				}
			},
			onClick: function() {
				window.location.hash = '!/status/bill/';
			}
		});
		
		overviewGrid.push({
			cell: {
				left : {
					icon     : './sacloud/img/fugue/icons/globe-green.png',
					innerHTML: 'USAGE OF REGION'.__()
				},
				right: {
					align    : 'right',
					innerHTML: this.app.stat.currentRegion.name
				}
			}
		});
		
		overviewGrid.push({
			cell: {
				left : {
					icon     : './sacloud/img/fugue/icons/computer.png',
					innerHTML: this.view.overviewServerCount.entity,
					onClick  : function() {
						window.location.hash = '!/server/list/';
					}
				},
				right: {
					icon     : './sacloud/img/fugue/icons/drive.png',
					innerHTML: this.view.overviewDiskCount.entity,
					onClick  : function() {
						window.location.hash = '!/storage/disk/';
					}
				}
			}
		});
		
		overviewGrid.push({
			cell: {
				left : {
					icon     : './sacloud/img/fugue/icons/disk.png',
					innerHTML: this.view.overviewArchiveCount.entity,
					onClick  : function() {
						window.location.hash = '!/storage/archive/';
					}
				},
				right: {
					icon     : './sacloud/img/fugue/icons/disc.png',
					innerHTML: this.view.overviewCDROMCount.entity,
					onClick  : function() {
						window.location.hash = '!/storage/iso-image/';
					}
				}
			}
		});
		
		overviewGrid.push({
			cell: {
				left : {
					icon     : './sacloud/img/fugue/icons/network-hub.png',
					innerHTML: this.view.overviewNetworkCount.entity,
					onClick  : function() {
						window.location.hash = '!/network/switch/';
					}
				},
				right: {
					innerHTML: ''
				}
			}
		});
		
		overviewGrid.render(this.view.overview.entity);
		
		new sakura.ui.Container({
			className: 'muted',
			style: {
				fontSize: '11px'
			}
		}).insert('MSG_DISCLAIMER_NEXT_BILL_AMOUNT'.__()).render(this.view.content);
		
		this.view.news = new sakura.ui.Container({
			style: {
				marginTop: '10px'
			}
		}).render(this.view.content);
		
		this.view.newsAll   = new sakura.ui.Container();
		this.view.newsInfo  = new sakura.ui.Container();
		this.view.newsCloud = new sakura.ui.Container();
		this.view.newsAlert = new sakura.ui.Container();
		
		new sakura.ui.Tab({
			tabs: [
				{
					label  : 'ALL'.__(),
					icon   : './sacloud/img/fugue/icons/home-medium.png',
					content: this.view.newsAll
				},
				{
					label  : 'NOTICE'.__(),
					icon   : './sacloud/img/fugue/icons/information-balloon.png',
					content: this.view.newsInfo
				},
				{
					label  : 'CLOUD NEWS'.__(),
					icon   : './sacloud/img/fugue/icons/megaphone.png',
					content: this.view.newsCloud
				},
				{
					label  : 'OBSTRUCTION'.__() + ' / ' + 'MAINTENANCE'.__(),
					icon   : './sacloud/img/fugue/icons/hard-hat.png',
					content: this.view.newsAlert
				}
			]
		}).render(this.view.news);
		
		// ヘルプビュー用
		this.help = {
			elements: [
				{
					target     : this.view.overview,
					name       : 'OVERVIEW'.__(),
					description: 'HELP_DESC_STATUS_TOP_OVERVIEW'.__()
				},
				{
					target     : '.sakura-tab > .sakura-tab-bar',
					//name       : 'TAB BAR'.__(),
					description: 'HELP_DESC_TAB_BAR'.__()
				}
			]
		};
		
		return this;
	},
	
	load: function() {
		// bill amount
		var isLastOfYear = ((new Date().getMonth() + 1) === 12);
		var nextYear     = isLastOfYear ? (new Date().getFullYear() + 1) : new Date().getFullYear();
		var nextMonth    = isLastOfYear ? 1 : (new Date().getMonth() + 2);
		this.app.api.request('system/1.0/bill/by-contract/' + this.app.api.credential.account.id + '/' + nextYear + '/' + nextMonth, {
			onSuccess: function(t, res) {
				this.view.overviewBillAmount.update(cloud.formatNumber(res.bills[0].amount) + 'JPY'.__());
			}.bind(this)
		});
		
		// server
		this.app.api.request('cloud/0.2/server', {
			param: {
				Filter : { 'Zone.Region.ID': this.app.stat.currentRegionId },
				Include: [ 'Instance.Status' ]
			},
			onSuccess: function(t, res) {
				this.view.overviewServerCount.update(res.Count.toString(10) + ' ' + 'SERVER'.__());
			}.bind(this)
		});
		
		// disk
		this.app.api.request('cloud/0.2/disk', {
			param: {
				Filter : { 'Storage.Zone.Region.ID': this.app.stat.currentRegionId },
				Include: [ 'SizeMB' ]
			},
			onSuccess: function(t, res) {
				this.view.overviewDiskCount.update(res.Count.toString(10) + ' ' + 'DISK'.__());
			}.bind(this)
		});
		
		// archive
		this.app.api.request('cloud/0.2/archive', {
			param: {
				Filter : {
					'Storage.Zone.Region.ID': this.app.stat.currentRegionId,
					'Scope'                 : 'user'
				},
				Include: [ 'SizeMB' ]
			},
			onSuccess: function(t, res) {
				this.view.overviewArchiveCount.update(res.Count.toString(10) + ' ' + 'ARCHIVE'.__());
			}.bind(this)
		});
		
		// cdrom
		this.app.api.request('cloud/0.2/region/' + this.app.stat.currentRegionId + '/cdrom', {
			param: {
				Filter : {
					'Scope': 'user'
				},
				Include: [ 'SizeMB' ]
			},
			onSuccess: function(t, res) {
				this.view.overviewCDROMCount.update(res.Count.toString(10) + ' ' + 'ISO IMAGE'.__());
			}.bind(this)
		});
		
		// network
		this.app.api.request('cloud/0.2/switch', {
			param: {
				Filter : { 'Zone.Region.ID': this.app.stat.currentRegionId },
				Include: [ 'Scope' ]
			},
			onSuccess: function(t, res) {
				this.view.overviewNetworkCount.update(res.Count.toString(10) + ' ' + 'SWITCH'.__());
			}.bind(this)
		});
		
		// rss
		var newsFeeds  = [];
		var infoFeeds  = [];
		var cloudFeeds = [];
		
		var reqs = [
			function() {
				new Ajax.Request('/rss/sakuranews/getfeeds.php?service=cloud&format=json&_nonce=' + new Date().getTime(), {
					method: 'get',
					onSuccess: function(t) {
						var items = t.responseJSON;
						
						items.each(function(a) {
							newsFeeds.push({
								title  : a.title,
								url    : a.url,
								icon   : './sacloud/img/fugue/icons/hard-hat.png',
								date   : parseInt(a.date, 10) * 1000
							});
						});
						
						createGrid( createRows( sortFeeds( newsFeeds ) ) ).render(this.view.newsAlert.entity);
						
						countdown.turn();
					}.bind(this)
				});
			}.bind(this)
			,
			function() {
				new Ajax.Request('/rss/sakurainfo/getfeeds.php?service=cloud&format=json&_nonce=' + new Date().getTime(), {
					method: 'get',
					onSuccess: function(t) {
						var items = t.responseJSON;
						
						items.each(function(a, i) {
							infoFeeds.push({
								title  : a.title,
								url    : a.url,
								icon   : './sacloud/img/fugue/icons/information-balloon.png',
								date   : parseInt(a.date, 10) * 1000
							});
						});
						
						infoFeeds = infoFeeds.slice(-10);//最新10件だけにする
						
						createGrid( createRows( sortFeeds( infoFeeds ) ) ).render(this.view.newsInfo.entity);
						
						countdown.turn();
					}.bind(this)
				});
			}.bind(this)
			,
			function() {
				new Ajax.Request('/cloud/_rss/?_nonce=' + new Date().getTime(), {
					method: 'get',
					onSuccess: function(t) {
						var items = t.responseJSON.channel['item'];
						
						items.each(function(a) {
							cloudFeeds.push({
								title  : a.title,
								url    : a.guid,
								icon   : './sacloud/img/fugue/icons/megaphone.png',
								date   : new Date(a.pubDate).getTime()
							});
						});
						
						createGrid( createRows( sortFeeds( cloudFeeds ) ) ).render(this.view.newsCloud.entity);
						
						countdown.turn();
					}.bind(this)
				});
			}.bind(this)
		];
		
		var sortFeeds = function(a) {
			return a.sortBy(function(b) {
				return b.date * -1;
			});
		};
		
		var createRows = function(a) {
			var rows = [];
			
			a.each(function(b) {
				rows.push(createRow(b));
			});
			
			return rows;
		};
		
		var createRow = function(a) {
			return {
				cell: {
					date: {
						innerHTML: cloud.dateToString(new Date(a.date), true)
					},
					title: {
						icon     : a.icon || null,
						innerHTML: a.title
					}
				},
				onClick: function() {
					window.open(a.url);
				}
			};
		};
		
		var createGrid = function(rows) {
			return new Hypergrid({
				tableWidth   : '100%',
				multiSelect  : false,
				disableSelect: true,
				disableSort  : true,
				disableResize: true,
				tableClass   : 'hypergrid hypergrid-noborder hypergrid-nohead',
				colModel: [
					{
						key      : 'date',
						innerHTML: '&nbsp;',
						width    : 120
					},
					{
						key      : 'title',
						innerHTML: '&nbsp;'
					}
				],
				rows: rows
			});
		};
		
		var countdown = new sakura.util.Countdown(reqs.length, function() {
			createGrid(
				createRows(
					sortFeeds( newsFeeds.concat(infoFeeds).concat(cloudFeeds) )
				)
			).render(this.view.newsAll.entity);
		}.bind(this));
		
		new sakura.util.Executer(reqs);
		
		return this;
	}
});