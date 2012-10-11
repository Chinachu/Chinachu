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
			var duration = parseInt(request.query.duration || 10, 10);
			var vcodec   = request.query.vcodec   || 'libx264';
			var acodec   = request.query.acodec   || 'libfaac';
			var bitrate  = request.query.bitrate  || '1000k';
			var ar       = request.query.ar       || '44100';
			var ab       = request.query.ab       || '96k';
			var size     = request.query.size     || '1024x576';
			var rate     = request.query.rate     || '24';
			
			response.write('#EXTM3U\n');
			response.write('#EXT-X-TARGETDURATION:' + duration + '\n');
			response.write('#EXT-X-MEDIA-SEQUENCE:0\n');
			
			var target = request.query.prefix || '';
			target += 'watch.m2ts?duration=' + duration + '&vcodec=' + vcodec + '&acodec=' + acodec;
			target += '&bitrate=' + bitrate + '&size=' + size + '&ar=' + ar + '&ab=' + ab + '&rate=' + rate;
			
			for (var i = 0; i < current; i += duration) {
				response.write('#EXTINF:' + duration + ',\n');
				response.write(target + '&start=' + i + '\n');
			}
			
			response.exit('#EXT-X-ENDLIST');
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
			response.head(200);
			
			util.log('[streamer] streaming: ' + program.recorded);
			
			var start    = request.query.start    || '0';
			var duration = request.query.duration || null;
			var vcodec   = request.query.vcodec   || 'copy';
			var acodec   = request.query.acodec   || 'copy';
			var bitrate  = request.query.bitrate  || '1000k';
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
				if (acodec === 'copy') { acodec = 'libfaac'; }
			} else if (request.type === 'webm') {
				format = 'matroska';
				
				if (vcodec === 'copy') { vcodec = 'libvpx'; }
				if (acodec === 'copy') { acodec = 'libvorbis'; }
			}
			
			var args = [];
			
			args.push('-v', '0');
			args.push('-threads', data.status.system.core.toString(10));
			
			args.push('-ss', start);
			if (duration) { args.push('-t', duration); }
			
			args.push('-re', '-i', program.recorded);
			args.push('-vcodec', vcodec, '-acodec', acodec);
			//args.push('-map', '0.0', '-map', '0.1');
			
			if (size)                 { args.push('-s', size); }
			if (rate)                 { args.push('-r', rate); }
			if (bitrate)              { args.push('-b', bitrate); }
			if (acodec !== 'copy')    { args.push('-ar', ar, '-ab', ab); }
			if (format === 'mpegts')  { args.push('-copyts'); }
			if (format === 'flv')     { args.push('-vsync', '2'); }
			if (vcodec === 'libx264') { args.push('-coder', '0', '-bf', '0', '-subq', '1', '-intra'); }
			
			args.push('-y', '-f', format, 'pipe:1');
			
			var ffmpeg = child_process.spawn('ffmpeg', args);
			
			ffmpeg.stdout.on('data', function(d) {
				if (ffmpeg) response.write(d, 'binary');
			});
			
			ffmpeg.stderr.on('data', function(d) {
				if (ffmpeg) util.puts(d);
			});
			
			ffmpeg.on('exit', function(code) {
				ffmpeg = null;
				
				response.exit();
			});
			
			request.on('close', function() {
				ffmpeg.stdout.removeAllListeners('data');
				ffmpeg.stderr.removeAllListeners('data');
				ffmpeg.kill('SIGKILL');
				ffmpeg = null;
			});
			
			return;
	}//<--switch

})();