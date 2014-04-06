(function() {
	
	var program = chinachu.getProgramById(request.param.id, data.recorded);
	
	if (program === null) return response.error(404);
	
	if (!data.status.feature.streamer) return response.error(403);
	
	if (program.tuner && program.tuner.isScrambling) return response.error(409);
	
	if (!fs.existsSync(program.recorded)) return response.error(410);
	
	switch (request.type) {
		// HTTP Live Streaming (Experimental)
		case 'txt'://for debug
		case 'm3u8':
			response.head(200);
			
			var current  = (program.end - program.start) / 1000;
			
			var d = {
				t    : request.query.t      || '10',//duration(seconds)
				s    : request.query.s      || '1024x576',//size(WxH)
				'c:v': request.query['c:v'] || 'libx264',//vcodec
				'c:a': request.query['c:a'] || 'libfdk_aac',//acodec
				'b:v': request.query['b:v'] || '1M',//bitrate
				'b:a': request.query['b:a'] || '96k'//ab
			};
			
			d.t = parseInt(d.t, 10);
			
			response.write('#EXTM3U\n');
			response.write('#EXT-X-VERSION:3\n');
			response.write('#EXT-X-TARGETDURATION:' + d.t + '\n');
			response.write('#EXT-X-MEDIA-SEQUENCE:0\n');
			
			var target = request.query.prefix || '';
			target += 'watch.m2ts?t=' + d.t + '&c:v=' + d['c:v'] + '&c:a=' + d['c:a'];
			target += '&b:v=' + d['b:v'] + '&s=' + d.s + '&b:a=' + d['b:a'];
			
			for (var i = 0; i < current; i += d.t) {
				response.write('#EXTINF:' + d.t + ',\n');
				response.write(target + '&ss=' + i + '\n');
			}
			
			response.end('#EXT-X-ENDLIST');
			return;
		
		case 'xspf':
			response.setHeader('content-disposition', 'attachment; filename="' + program.id + '.xspf"');
			response.head(200);
			
			var ext    = request.query.ext || 'm2ts';
			var prefix = request.query.prefix || '';
			
			var target = prefix + 'watch.' + ext  + url.parse(request.url).search;
			
			response.write('<?xml version="1.0" encoding="UTF-8"?>\n');
			response.write('<playlist version="1" xmlns="http://xspf.org/ns/0/">\n');
			response.write('<trackList>\n');
			response.write('<track>\n<location>' + target.replace(/&/g, '&amp;') + '</location>\n');
			response.write('<title>' + program.title + '</title>\n</track>\n');
			response.write('</trackList>\n');
			response.write('</playlist>\n');
			
			response.end();
			return;
		
		case 'm2ts':
		case 'f4v':
		case 'flv':
		case 'webm':
		case 'asf':
			util.log('STREAMING: ' + request.url);
			
			var d = {
				ss   : request.query.ss     || '0', //start(seconds)
				t    : request.query.t      || null,//duration(seconds)
				s    : request.query.s      || null,//size(WxH)
				f    : request.query.f      || null,//format
				'c:v': request.query['c:v'] || null,//vcodec
				'c:a': request.query['c:a'] || null,//acodec
				'b:v': request.query['b:v'] || null,//bitrate
				'b:a': request.query['b:a'] || null,//ab
				ar   : request.query.ar     || null,//ar(Hz)
				r    : request.query.r      || null//rate(fps)
			};
			
			// Convert humanized size String to Bitrate
			var bitrate = 0;
			var videoBitrate = 0;
			var audioBitrate = 0;
			if (d['b:v'] !== null) {
				if (d['b:v'].match(/^[0-9]+k$/i)) {
					videoBitrate = parseInt(d['b:v'].match(/^([0-9]+)k$/i)[1], 10) * 1024;
				} else if (d['b:v'].match(/^[0-9]+m$/i)) {
					videoBitrate = parseInt(d['b:v'].match(/^([0-9]+)m$/i)[1], 10) * 1024 * 1024;
				}
			}
			if (d['b:a'] !== null) {
				if (d['b:a'].match(/^[0-9]+k$/i)) {
					videoBitrate = parseInt(d['b:a'].match(/^([0-9]+)k$/i)[1], 10) * 1024;
				} else if (d['b:a'].match(/^[0-9]+m$/i)) {
					videoBitrate = parseInt(d['b:a'].match(/^([0-9]+)m$/i)[1], 10) * 1024 * 1024;
				}
			}
			if (videoBitrate !== 0 && audioBitrate !== 0) {
				bitrate = videoBitrate + audioBitrate;
			}
			
			// Caluculate Total Size
			var fstat = fs.statSync(program.recorded);
			var tsize = fstat.size;
			if (bitrate !== 0) {
				tsize = bitrate / 8 * program.seconds;
			}
			if (d.t) {
				tsize = Math.floor(tsize / program.seconds * parseInt(d.t, 10));
			}
			
			// Ranges Support
			var range = {};
			if (request.headers.range) {
				var bytes = request.headers.range.replace(/bytes=/, '').split('-');
				range.start = parseInt(bytes[0], 10);
				range.end   = parseInt(bytes[1], 10) || tsize - 1;

				if (range.start > tsize || range.end > tsize) {
					return response.error(416);
				}
				
				response.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + tsize);
				response.setHeader('Content-Length', range.end - range.start + 1);
				
				response.head(206);
			} else {
				response.setHeader('Accept-Ranges', 'bytes');
				if (d.ss === '0' && d.t === null) {
					response.setHeader('Content-Length', tsize);
				}

				response.head(200);
			}
			
			switch (request.type) {
				case 'm2ts':
					d.f      = 'mpegts';
					break;
				case 'webm':
					d.f      = 'webm';
					d['c:v'] = d['c:v'] || 'libvpx';
					d['c:a'] = d['c:a'] || 'libvorbis';
					break;
				case 'flv':
					d.f      = 'flv';
					d['c:v'] = d['c:v'] || 'flv';
					d['c:a'] = d['c:a'] || 'libfdk_aac';
					break;
				case 'f4v':
					d.f      = 'flv';
					d['c:v'] = d['c:v'] || 'libx264';
					d['c:a'] = d['c:a'] || 'libfdk_aac';
					break;
				case 'asf':
					d.f      = 'asf';
					d['c:v'] = d['c:v'] || 'wmv2';
					d['c:a'] = d['c:a'] || 'wmav2';//or libfdk_aac ?
					break;
			}
			
			var args = [];
			
			if (!request.query.debug) args.push('-v', '0');
			
			args.push('-ss', (parseInt(d.ss, 10) - 1) + '');
			
			args.push('-i', program.recorded);
			args.push('-ss', '1');
			
			if (d.t) { args.push('-t', d.t); }
			
			args.push('-threads', 'auto');
			
			if (d['c:v']) args.push('-c:v', d['c:v']);
			if (d['c:a']) args.push('-c:a', d['c:a']);
			
			if (d.s)  args.push('-s', d.s);
			if (d.r)  args.push('-r', d.r);
			if (d.ar) args.push('-ar', d.ar);
			
			if (d['b:v']) args.push('-b:v', d['b:v']);
			if (d['b:a']) args.push('-b:a', d['b:a']);
			
			//if (format === 'flv')     { args.push('-vsync', '2'); }
			if (d['c:v'] === 'libx264') args.push('-preset', 'ultrafast');
			if (d['c:v'] === 'libvpx')  args.push('-deadline', 'realtime');
			
			//args.push('-metadata', 'Title=Chinachu');
			//args.push('-metadata', 'Duration=30');
			
			args.push('-y', '-f', d.f, 'pipe:1');
			
			if (d['c:v'] === 'copy' && d['c:a'] === 'copy' && d.ss === '0' && !d.t) {
				fs.createReadStream(program.recorded, range || {}).pipe(response);
			} else {
				var avconv = child_process.spawn('avconv', args);

				avconv.stdout.pipe(response);

				avconv.stderr.on('data', function(d) {
					util.log('avconv strerr: ' + d);
				});

				avconv.on('exit', function(code) {
					setTimeout(function() { response.end(); }, 1000);
				});

				request.on('close', function() {
					avconv.stdout.removeAllListeners('data');
					avconv.stderr.removeAllListeners('data');
					avconv.kill('SIGKILL');
				});

				children.push(avconv);// 安全対策
			}
			
			return;
	}//<--switch

})();
