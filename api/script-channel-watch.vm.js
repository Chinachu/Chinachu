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

			var d = {
				s    : request.query.s      || null, //size(WxH)
				f    : request.query.f      || null, //format
				'c:v': request.query['c:v'] || null, //vcodec
				'c:a': request.query['c:a'] || null, //acodec
				'b:v': request.query['b:v'] || null, //bitrate
				'b:a': request.query['b:a'] || null, //ab
				ar   : request.query.ar     || null, //ar(Hz)
				r    : request.query.r      || null  //rate(fps)
			};

			switch (request.type) {
				case 'm2ts':
					d.f = 'mpegts';
					d['c:v'] = d['c:v'] || 'copy';
					d['c:a'] = d['c:a'] || 'copy';
					break;
				case 'mp4':
					d.f = 'mp4';
					d['c:v'] = d['c:v'] || 'h264';
					d['c:a'] = d['c:a'] || 'aac';
					break;
			}

			var args = [];

			if (!request.query.debug) args.push('-v', '0');

			if (config.vaapiEnabled === true) {
				args.push("-vaapi_device", config.vaapiDevice || '/dev/dri/renderD128');
				args.push("-hwaccel", "vaapi");
				args.push("-hwaccel_output_format", "yuv420p");
			}

			args.push('-re');
			args.push('-i', 'pipe:0');
			args.push('-threads', '0');

			if (config.vaapiEnabled === true) {
				let scale = "";
				if (d.s) {
					let [width, height] = d.s.split("x");
					scale = `,scale_vaapi=w=${width}:h=${height}`;
				}
				args.push("-vf", `format=nv12|vaapi,hwupload,deinterlace_vaapi${scale}`);
				args.push("-aspect", "16:9")
			} else {
				args.push('-filter:v', 'yadif');
			}

			if (d['c:v']) {
				if (config.vaapiEnabled === true) {
					if (d['c:v'] === "mpeg2video") {
						d['c:v'] = "mpeg2_vaapi";
					}
					if (d['c:v'] === "h264") {
						d['c:v'] = "h264_vaapi";
					}
				}
				args.push('-c:v', d['c:v']);
			}
			if (d['c:a']) args.push('-c:a', d['c:a']);

			if (d.s) {
				if (config.vaapiEnabled !== true) {
					args.push('-s', d.s);
				}
			}
			if (d.r)  args.push('-r', d.r);
			if (d.ar) args.push('-ar', d.ar);

			if (d['b:v']) {
				args.push('-b:v', d['b:v']);
				args.push('-minrate:v', d['b:v'], '-maxrate:v', d['b:v']);
			}
			if (d['b:a']) {
				args.push('-b:a', d['b:a'], '-minrate:a', d['b:a'], '-maxrate:a', d['b:a']);
			}

			if (d['c:v'] === 'h264') {
				args.push('-profile:v', 'baseline');
				args.push('-preset', 'ultrafast');
				args.push('-tune', 'fastdecode,zerolatency');
			}
			if (d['c:v'] === 'h264_vaapi') {
				args.push('-profile', '77');
				args.push('-level', '41');
			}

			if (d.f === 'mp4') {
				args.push('-movflags', 'frag_keyframe+empty_moov+faststart+default_base_moof');
			}

			args.push('-y', '-f', d.f, 'pipe:1');

			let stream = null;;

			request.once('close', () => {

				if (stream) {
					stream.unpipe();
					stream.req.abort();
				}
			});

			// get stream
			mirakurun.getServiceStream(parseInt(channel.id, 36), true)
				.then(_stream => {
					stream = _stream;

					response.head(200);

					// 無変換 or エンコ
					if (d['c:v'] === 'copy' && d['c:a'] === 'copy') {
						// ts -> response
						stream.pipe(response);
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
						stream.pipe(ffmpeg.stdin);

						ffmpeg.stderr.on('data', function(data) {
							data = data.toString();
							util.log(data);
							util.log('#ffmpeg: ' + data.replace(/\n/g, ' ').trim());
						});

						ffmpeg.on('exit', function(code) {
							response.end();
						});
					}
				})
				.catch(err => {

					if (stream) {
						// 既に録画開始
						return;
					}

					if (err.req) {
						return response.error(err.statusCode);
					} else {
						return response.error(503);
					}
				});

			return;
	}//<--switch

}());
