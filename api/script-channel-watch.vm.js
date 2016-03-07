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
		case 'mp4':
		case 'webm':
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
				case 'mp4':
					d.f      = 'mp4';
					d['c:v'] = d['c:v'] || 'libx264';
					d['c:a'] = d['c:a'] || 'aac';
					break;
				case 'webm':
					d.f      = 'webm';
					d['c:v'] = d['c:v'] || 'libvpx';
					d['c:a'] = d['c:a'] || 'libvorbis';
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

			args.push('-filter:v', 'yadif');

			if (d['b:v']) args.push('-b:v', d['b:v']);
			if (d['b:a']) args.push('-b:a', d['b:a']);

			if (d['c:v'] === 'libx264') {
				args.push('-profile:v', 'baseline');
				args.push('-preset', 'ultrafast');
				args.push('-tune', 'fastdecode,zerolatency');
			}
			if (d['c:v'] === 'libvpx') {
				args.push('-deadline', 'realtime');
				args.push('-cpu-used', '-16');
			}

			if (d.f === 'mp4') {
				args.push('-movflags', 'frag_keyframe+empty_moov+faststart+default_base_moof');
			}

			args.push('-y', '-f', d.f, 'pipe:1');

			// チューナーを選ぶ
			var tuner = chinachu.getFreeTunerSync(config.tuners, channel.type, false, 1);

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
				chinachu.lockTunerSync(tuner, 1);
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
			children.push(recProc.pid);
			chinachu.writeTunerPidSync(tuner, recProc.pid, 1);
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
				children.push(ffmpeg.pid);
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

			return;
	}//<--switch

}());
