P = Class.create(P, {

	init: function _initPage() {

		this.view.content.className = 'loading';

		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:storage', this.onNotify);

		this.draw();

		return this;
	}
	,
	refresh: function() {

		this.draw();

		return this;
	}
	,
	deinit: function _deinit() {

		document.stopObserving('chinachu:storage', this.onNotify);

		return this;
	}
	,
	draw: function _draw() {

		this.view.content.className = '';
		this.view.content.update();

		var chart = dc.pieChart(this.view.content);
		d3.json("./api/storage.json", function(error, data) {

			function readableFilesize(size) {
				var postfix = ["B","KB","MB","GB","TB","PB"];
				var i = 0;
				var sz = size;
				var base = 1;
				while(sz>=1024) {
					i++;
					sz = sz/1024;
					base *= 1024;
				}
				return (size/base).toFixed(1) + postfix[i];
			}

			var pickBgColor = function(klass) {
				var x = new Element('span');
				x.setAttribute('class', klass);
				this.view.content.appendChild(x);
				var d3bgcol = d3.rgb( window.getComputedStyle(x).backgroundColor );
				this.view.content.removeChild(x);
				if( d3bgcol['3'] === undefined ) d3bgcol['3'] = 1.0; //d3.rgb has sloppy rgba support.
				return d3bgcol;
			}.bind(this);

			var d3rgb2rgba = function(h) { return "rgba("+h['r']+","+h['g']+","+h['b']+","+h['3']+")"; }
			var d3rgb_transparent = function(h, tr) { h['3'] = tr; return h; }



			var catList   = ['RECORDED', 'FREE', 'USED BY OTHER PROGRAMS'].map(function(x) { return x.__();} );
			var colorList = [	pickBgColor("bg-chinachu"),
						d3rgb_transparent( pickBgColor("bg-chinachu"), 0.4),
						pickBgColor('bg-silver')
					].map(function(a) { return d3rgb2rgba(a) } );
			var colorMap = catList.reduce( function(p, c, i, s) { p[c] = colorList[i]; return p; }, {});
			var orderMap = catList.reduce( function(p, c, i, s) { p[c] = i+1; return p; }, {});

			var w = 400;
			var h = 400;
			var width = Math.min(w,h) * 0.8;
			var height = width;
			var radius = width * 0.4;

			var storageUsage = [
				{ category: catList[0], value: data.recorded },
				{ category: catList[1], value: data.avail},
				{ category: catList[2], value: data.used - data.recorded}
			];

			var ndx = crossfilter(storageUsage);
			var category = ndx.dimension(function(d) {return d.category;});
			var valueGroup = category.group().reduceSum(function(d) {return d.value;});


			chart
			 .width(width)
			 .height(height)
			 .slicesCap(4)
			 .innerRadius(radius*0.3)
			 .dimension(category)
			 .group(valueGroup)
			 .colors(d3.scale.ordinal().domain(catList).range(colorList) )
			 .label( function(d) { return d.data.key + ':' + readableFilesize(d.data.value); } )
			 .ordering( function(d) { return orderMap[d.key]; })
			 .title( function(d) { return readableFilesize(d.data.value); } );

			chart.render();
		}.bind(this));

		return this;
	}
});
