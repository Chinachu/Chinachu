/*
Usushio では使わない
*/
(function() {
	
	var channel = null;
	
	data.schedule.forEach(function(ch) {
		if (ch.id === request.param.chid) {
			channel = ch;
		}
	});
	
	if (channel === null) return response.error(404);
	
	if (!data.status.feature.streamer) return response.error(403);
	
	switch (request.type) {
		case 'xspf':
			response.setHeader('content-disposition', 'attachment; filename="' + channel.id + '.xspf"');
			response.head(200);
			
			var ext    = request.query.ext || 'm2ts';
			var prefix = request.query.prefix || '';

			var target = prefix + 'watch.' + ext  + url.parse(request.url).search;
			
			response.write('<?xml version="1.0" encoding="UTF-8"?>\n');
			response.write('<playlist version="1" xmlns="http://xspf.org/ns/0/">\n');
			response.write('<trackList>\n');
			response.write('<track>\n<location>' + target.replace(/&/g, '&amp;') + '</location>\n');
			response.write('<title>' + channel.name + '</title>\n</track>\n');
			response.write('</trackList>\n');
			response.write('</playlist>\n');
			
			response.end();
			return;
		
		case 'm2ts':
		case 'f4v':
		case 'flv':
		case 'webm':
		case 'asf':
			response.head(200);
			
			// util.log('[streamer] streaming: ' + program.recorded);
			
			var d = {
				s    : request.query.s      || null,//size(WxH)
				f    : request.query.f      || null,//format
				'c:v': request.query['c:v'] || null,//vcodec
				'c:a': request.query['c:a'] || null,//acodec
				'b:v': request.query['b:v'] || null,//bitrate
				'b:a': request.query['b:a'] || null,//ab
				ar   : request.query.ar     || null,//ar(Hz)
				r    : request.query.r      || null//rate(fps)
			};
			
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
			
			args.push('-re');
			args.push('-i', 'pipe:0');
			args.push('-threads', 'auto');
			
			if (d['c:v']) args.push('-c:v', d['c:v']);
			if (d['c:a']) args.push('-c:a', d['c:a']);
			
			if (d.s)  args.push('-s', d.s);
			if (d.r)  args.push('-r', d.r);
			if (d.ar) args.push('-ar', d.ar);
			
			if (!d.s || d.s === '1920x1080') {
				args.push('-filter:v', 'yadif');
			}
			
			if (d['b:v']) args.push('-b:v', d['b:v']);
			if (d['b:a']) args.push('-b:a', d['b:a']);
			
			//if (format === 'flv')     { args.push('-vsync', '2'); }
			if (d['c:v'] === 'libx264') args.push('-preset', 'ultrafast');
			if (d['c:v'] === 'libvpx')  args.push('-deadline', 'realtime');
			
			args.push('-y', '-f', d.f, 'pipe:1');

			// チューナーを選ぶ
			var tuner = chinachu.getFreeTunerSync(config.tuners, channel.type);
			
			// チューナーが見つからない
			if (tuner === null) {
				util.log('WARNING: 利用可能なチューナーが見つかりません (存在しないかロックされています)');
				response.setHeader('retry-after', '10');
				return response.error(503);
			}
			
			// スクランブルされている
			if (tuner.isScrambling) {
				return response.error(409);
			}
			
			// チューナーをロック
			try {
				chinachu.lockTunerSync(tuner);
			} catch (e) {
				util.log('WARNING: チューナー(' + tuner.n + ')のロックに失敗しました');
				return response.error(500);
			}
			util.log('LOCK: ' + tuner.name + ' (n=' + tuner.n + ')');
			
			// 録画コマンド
			var recCmd = tuner.command;
			recCmd = recCmd.replace('<sid>', channel.sid);
			recCmd = recCmd.replace('<channel>', channel.channel);
			
			var recProc = child_process.spawn(recCmd.split(' ')[0], recCmd.replace(/[^ ]+ /, '').split(' '));
			chinachu.writeTunerPid(tuner, recProc.pid);
			util.log('SPAWN: ' + recCmd + ' (pid=' + recProc.pid + ')');
			
			recProc.on('exit', function () {
				// チューナーのロックを解除
				try {
					chinachu.unlockTunerSync(tuner);
					util.log('UNLOCK: ' + tuner.name + ' (n=' + tuner.n + ')');
				} catch (e) {
					util.log(e);
				}
			});
			
			request.on('close', function() {
				recProc.kill('SIGTERM');
			});
			
			// ログ出力
			recProc.stderr.on('data', function (data) {
				util.log('#' + (recCmd.split(' ')[0] + ': ' + data).replace(/\n/g, ' ').trim());
			});
			
			// 無変換 or エンコ
			if (d['c:v'] === 'copy' && d['c:a'] === 'copy') {
				// ts -> response
				recProc.stdout.pipe(response);
			} else {
				var ffmpeg = child_process.spawn('ffmpeg', args);
				children.push(ffmpeg);// 安全対策
				util.log('SPAWN: ffmpeg ' + args.join(' ') + ' (pid=' + ffmpeg.pid + ')');

				request.on('close', function() {
					ffmpeg.stdout.removeAllListeners('data');
					ffmpeg.stderr.removeAllListeners('data');
					ffmpeg.kill('SIGKILL');
				});

				// * -> response
				ffmpeg.stdout.pipe(response);

				// ts - *
				recProc.stdout.pipe(ffmpeg.stdin);

				ffmpeg.stderr.on('data', function(data) {
					util.log(data);
					util.log('#ffmpeg: ' + data.replace(/\n/g, ' ').trim());
				});

				ffmpeg.on('exit', function(code) {
					response.end();
				});
			}
			
			children.push(recProc);// 安全対策
			
			return;
	}//<--switch

}());