(function() {
	
	var program = chinachu.getProgramById(request.param.id, data.recording);
	
	if (program === null) return response.error(404);
	
	if (!data.status.feature.streamer) return response.error(403);
	
	if (!program.pid) return response.error(503);
	
	if (program.tuner && program.tuner.isScrambling) return response.error(409);
	
	if (!fs.existsSync(program.recorded)) return response.error(410);
	
	switch (request.type) {
		// HTTP Live Streaming (Experimental)
		case 'txt'://for debug
		case 'm3u8':
			response.head(200);
			
			var current  = (new Date().getTime() - program.start) / 1000;
			var duration = parseInt(request.query.duration || 10, 5);
			var vcodec   = request.query.vcodec   || 'libx264';
			var acodec   = request.query.acodec   || 'libfdk_aac';
			var bitrate  = request.query.bitrate  || '1000k';
			var ar       = request.query.ar       || '44100';
			var ab       = request.query.ab       || '96k';
			var size     = request.query.size     || '1024x576';
			var rate     = request.query.rate     || '24';
			
			response.write('#EXTM3U\n');
			response.write('#EXT-X-TARGETDURATION:' + duration + '\n');
			response.write('#EXT-X-MEDIA-SEQUENCE:' + Math.floor(current / duration) + '\n');
			
			var target = request.query.prefix || '';
			target += 'watch.m2ts?duration=' + duration + '&vcodec=' + vcodec + '&acodec=' + acodec;
			target += '&bitrate=' + bitrate + '&size=' + size + '&ar=' + ar + '&ab=' + ab + '&rate=' + rate;
			
			for (var i = 0; i < current; i += duration) {
				if (current - i > 60) { continue; }
				response.write('#EXTINF:' + duration + ',\n');
				response.write(target + '&start=' + i + '\n');
			}
			
			response.exit();
			return;
		
		case 'xspf':
			response.setHeader('content-disposition', 'attachment; filename="' + program.id + '.xspf"');
			response.head(200);
			
			var ext    = request.query.format || 'm2ts';
			var prefix = request.query.prefix || '';
			
			var target = prefix + 'watch.' + ext  + url.parse(request.url).search;
			
			response.write('<?xml version="1.0" encoding="UTF-8"?>\n');
			response.write('<playlist version="1" xmlns="http://xspf.org/ns/0/">\n');
			response.write('<trackList>\n');
			response.write('<track>\n<location>' + target.replace(/&/g, '&amp;') + '</location>\n');
			response.write('<title>' + program.title + '</title>\n</track>\n');
			response.write('</trackList>\n');
			response.write('</playlist>\n');
			
			response.exit();
			return;
		
		case 'm2ts':
		case 'f4v':
		case 'flv':
		case 'webm':
		case 'asf':
			response.head(200);
			
			util.log('[streamer] streaming: ' + program.recorded);
			
			var start    = request.query.start    || 'live';
			var duration = request.query.duration || null;
			var vcodec   = request.query.vcodec   || 'copy';
			var acodec   = request.query.acodec   || 'copy';
			var bitrate  = request.query.bitrate  || '1500k';
			var ar       = request.query.ar       || '44100';
			var ab       = request.query.ab       || '128k';
			var format   = request.query.format   || null;
			var size     = request.query.size     || null;
			var rate     = request.query.rate     || null;
			
			if (request.type === 'm2ts') {
				format = 'mpegts';
				
				if ((vcodec === 'copy') && size) { vcodec = 'mpeg2video'; }
			} else if ((request.type === 'flv') || (request.type === 'f4v')) {
				format = 'flv';
				
				if (vcodec === 'copy') { vcodec = 'libx264'; }
				if (acodec === 'copy') { acodec = 'libfdk_aac'; }
			} else if (request.type === 'webm') {
				format = 'webm';
				
				if (vcodec === 'copy') { vcodec = 'libvpx'; }
				if (acodec === 'copy') { acodec = 'libvorbis'; }
			} else if (request.type === 'asf') {
				format = 'asf';
				
				if (vcodec === 'copy') { vcodec = 'wmv2'; }
				if (acodec === 'copy') { acodec = 'libfdk_aac'; }
			}
			
			var args = [];
			
			if (!request.query.debug) args.push('-v', '0');
			
			if (start !== 'live')    { args.push('-ss', (parseInt(start, 10) - 1) + ''); }
			
			args.push('-re', '-i', (start === 'live') ? 'pipe:0' : program.recorded);
			args.push('-ss', '1');
			
			if (duration) { args.push('-t', duration); }
			
			args.push('-threads', data.status.system.core.toString(10));
			
			args.push('-codec:v', vcodec, '-codec:a', acodec);
			//args.push('-map', '0:0', '-map', '0:1');
			
			if (size)                 { args.push('-s', size); }
			if (rate)                 { args.push('-r', rate); }
			if (bitrate)              { args.push('-b', bitrate); }
			if (acodec !== 'copy')    { args.push('-ar', ar, '-ab', ab); }
			//if (format === 'mpegts')  { args.push('-copyts'); }
			if (format === 'flv')     { args.push('-vsync', '2'); }
			if (vcodec === 'libx264') { args.push('-preset', 'ultrafast'); }
			if (vcodec === 'libvpx')  { args.push('-deadline', 'realtime'); }
			
			args.push('-y', '-f', format, 'pipe:1');
			
			if ((start === 'live') && (vcodec === 'copy') && (acodec === 'copy') && (request.type === 'm2ts')) {
				var tailf = child_process.spawn('tail', ['-f', '-c', '61440', program.recorded]);// 1KB
				children.push(tailf);// 安全対策
				
				tailf.stdout.pipe(response);
				
				tailf.on('exit', function(code) {
					response.exit();
					tailf = null;
				});
				
				request.on('close', function() {
					if (tailf) {
						tailf.stdout.removeAllListeners('data');
						tailf.stderr.removeAllListeners('data');
						tailf.kill('SIGKILL');
					}
				});
			} else {
				var avconv = child_process.spawn('avconv', args);
				children.push(avconv);// 安全対策
				
				if (start === 'live') {
					var tailf = child_process.spawn('tail', ['-f', program.recorded]);
					children.push(tailf);// 安全対策
					
					tailf.stdout.pipe(avconv.stdin);
					
					tailf.on('exit', function(code) {
						if (avconv) avconv.kill('SIGKILL');
						tailf = null;
					});
				}
				
				avconv.stdout.pipe(response);
				
				avconv.stderr.on('data', function(d) {
					util.log(d);
				});
				
				avconv.on('exit', function(code) {
					if (tailf) {
						tailf.stdout.removeAllListeners('data');
						tailf.stderr.removeAllListeners('data');
						tailf.kill('SIGKILL');
						tailf = null;
					} else {
						avconv = null;
					}
					
					setTimeout(response.exit, 1000);
				});
				
				request.on('close', function() {
					if (tailf) {
						tailf.stdout.removeAllListeners('data');
						tailf.stderr.removeAllListeners('data');
						tailf.kill('SIGKILL');
					} else {
						avconv.stdout.removeAllListeners('data');
						avconv.stderr.removeAllListeners('data');
						avconv.kill('SIGKILL');
						avconv = null;
					}
				});
			}
			
			return;
	}//<--switch

})();