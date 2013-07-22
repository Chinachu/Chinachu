(function() {
	
	document.observe('chinachu:reload', function() {
		document.stopObserving('chinachu:reload', arguments.callee);
		document.stopObserving('chinachu:schedule', viewSchedule);
		//clearInterval(viewScheduleCurrentTimeInterval);
	});
	
	var contentBodyHead           = $('content-body-head');
	var contentBodyTimescale      = $('content-body-timescale');
	var contentBodyTimeline       = $('content-body-timeline');
	var contentBodyTimelineHeader = $('content-body-timeline-header');
	
	var param = {
		unit       : 25,
		dateIndex  : [],
		dateBtns   : [],
		points     : [0, 0],
		isScrolling: false
	};
	
	// 目盛のポインタ
	var pointer = new Element('div', { className: 'timescale-pointer' }).setStyle({
		left: '-1px'
	});
	
	function timelineOnMousedown() {
		param.isScrolling = true;
	}
	
	function timelineOnMouseup() {
		param.isScrolling = false;
	}
	
	function timelineOnMouseout() {
		pointer.style.left = '-1px';
		pointer.innerHTML  = '';
	}
	
	function timelineOnMousemove(e) {
		var points = [ e.x || e.pageX, e.y || e.pageY ];
		
		if (param.isScrolling) {
			contentBodyTimeline.scrollTop  += param.points[1] - points[1];
			contentBodyTimeline.scrollLeft += param.points[0] - points[0];
			
			var scrollLeft = contentBodyTimeline.scrollLeft;
			
			contentBodyTimelineHeader.scrollTop = contentBodyTimeline.scrollTop;
			contentBodyTimescale.scrollLeft = scrollLeft;
			
			setTimeout(function() {
				for (var i = param.dateIndex.length - 1; i >= 0; i--) {
					param.dateBtns[i].className = '';
				}
				
				for (var i = param.dateIndex.length - 1; i >= 0; i--) {
					param.dateBtns[i].className = '';
					
					if (scrollLeft >= param.dateIndex[i]) {
						param.dateBtns[i].className = 'selected';
						break;
					}
				}
			}, 0);
		}
		
		param.points = [ points[0], points[1] ];
		
		var position = contentBodyTimeline.scrollLeft + param.points[0];
		
		pointer.style.left = position + 'px';
		pointer.innerHTML  = ':' + new Date(param.cur + ((position - 150) / param.unit * 1000 * 1000)).getMinutes().toPaddedString(2);
	}
	
	function timelineOnScroll(e) {
		contentBodyTimescale.scrollLeft = contentBodyTimeline.scrollLeft;
		contentBodyTimelineHeader.scrollTop = contentBodyTimeline.scrollTop;
	}
	
	if (Prototype.Browser.MobileSafari) {
		contentBodyTimeline.style.overflow = 'scroll';
		contentBodyTimeline.observe('scroll', timelineOnScroll);
	} else {
		contentBodyTimeline.observe('mouseout', timelineOnMouseout);
		contentBodyTimeline.observe('mousedown', timelineOnMousedown);
		contentBodyTimeline.observe('mouseup', timelineOnMouseup);
		contentBodyTimeline.observe('mousemove', timelineOnMousemove);
	}
	
	// ビュー: スケジュール
	function viewSchedule() {
		if (app.chinachu.schedule.length === 0) return;
		
		var loading = new app.ui.ContentLoading({
			onComplete: function() {
				loading.remove();
				loading = null;
			}
		}).render();
		
		var total  = 0;
		var count  = 0;
		var maxlen = 0;
		
		function counter() {
			++count;
			loading.update(Math.floor(count / total * 100));
		}
		
		param.cur = new Date().getTime();
		
		contentBodyHead.update();
		contentBodyTimescale.update();
		contentBodyTimeline.update();
		contentBodyTimelineHeader.update();
		
		app.chinachu.schedule.each(function(channel, i) {
			if (channel.programs.length === 0) return;
			
			var header = new Element('div');
			header.addClassName('channel-type-' + channel.type).addClassName('channel-id-' + channel.id);
			header.insert(new Element('div', { className: 'name' }).insert(channel.name));
			header.insert(new Element('div', { className: 'meta' }).insert(channel.id + ' (' + channel.channel + ')'));
			contentBodyTimelineHeader.insert(header);
			
			var programs = new Element('div');
			programs.addClassName('channel-type-' + channel.type).addClassName('channel-id-' + channel.id);
			contentBodyTimeline.insert(programs);
			
			channel.programs.each(function(program, j) {
				if ((program.end - param.cur) < 0) {
					channel.programs = channel.programs.without(program);
					return;
				}
				
				if (maxlen < program.end) maxlen = program.end;
				
				var points = [0, 0];
				
				setTimeout(function() {
					programs.insert(
						new Element('div', {
							className: 'cat-' + program.category + ' ' + program.id
						}).setStyle({
							left : ((program.start - param.cur) / 1000 / 1000 * param.unit) + 'px',
							width: (program.seconds / 1000 * param.unit) + 'px'
						}).insert(
							new Element('div', { className: 'title' }).insert(program.title)
						).observe('mousedown', function(e) {
							points = [ e.x || e.pageX, e.y || e.pageY ];
						}).observe('mouseup', function(e) {
							var pts = [ e.x || e.pageX, e.y || e.pageY ];
							
							if ((pts[0] === points[0]) && (pts[1] === points[1]) && e.isLeftClick()) {
								window.location.hash = '/program?id=' + program.id;
							}
						})
					);
					
					counter();
				}, 0);
			});
			
			if (channel.programs.length === 0) {
				header.remove();
				programs.remove();
				return;
			}
			
			programs.setStyle({
				width: ((channel.programs.last().end - param.cur) / 1000 / 1000 * param.unit) + 'px'
			});
			
			total += channel.programs.length;
		});
		
		// 目盛と日付
		
		param.dateIndex = [];
		param.dateBtns  = [];
		var ld  = -1;
		var lm  = -1;
		var day = [
			'<span class="sun">日</span>',
			'<span>月</span>',
			'<span>火</span>',
			'<span>水</span>',
			'<span>木</span>',
			'<span>金</span>',
			'<span class="sat">土</span>'
		];
		for (var i = param.cur; maxlen > i; i += 60000) {
			var date = new Date(i);
			var d    = date.getDate();
			var m    = date.getMinutes();
			
			if (ld !== d) {
				ld = d;
				
				(function(i, date) {
					var position = (i - param.cur) / 1000 / 1000 * param.unit;
					
					
					var btn = new Element('a').insert(
						date.getDate() + '日' + day[date.getDay()]
					).observe('click', function() {
						contentBodyTimeline.scrollLeft  = position;
						contentBodyTimescale.scrollLeft = position;
						
						param.dateBtns.each(function(a) {
							a.removeClassName('selected');
						});
						
						this.addClassName('selected');
					});
					contentBodyHead.insert(btn);
					
					param.dateIndex.push(position);
					param.dateBtns.push(btn);
				})(i, date);
			}
			
			if ((m === 0) && (lm !== m)) {
				lm = m;
				
				contentBodyTimescale.insert(
					new Element('div', { className: 'timescale-long' }).setStyle({
						left: ((i - param.cur) / 1000 / 1000 * param.unit) + 'px'
					}).insert(date.getHours().toPaddedString(2))
				);
			}
			
			if ((m === 30) && (lm !== m)) {
				lm = m;
				
				contentBodyTimescale.insert(
					new Element('div', { className: 'timescale-middle' }).setStyle({
						left: ((i - param.cur) / 1000 / 1000 * param.unit) + 'px'
					})
				);
			}
			
			if (((m === 10) || (m === 20) || (m === 40) || (m === 50)) && (lm !== m)) {
				lm = m;
				
				contentBodyTimescale.insert(
					new Element('div', { className: 'timescale-short' }).setStyle({
						left: ((i - param.cur) / 1000 / 1000 * param.unit) + 'px'
					})
				);
			}
		}
		
		contentBodyTimescale.insert(pointer);
	}
	viewSchedule();
	document.observe('chinachu:schedule', viewSchedule);
	
	
})();
