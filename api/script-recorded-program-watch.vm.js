var program = chinachu.getProgramById(request.param.id, data.recorded);
if (program === null) {
	response.error(404);
} else {
	init();
}

function init() {

	if (!data.status.feature.streamer) return response.error(403);

	if (program.tuner && program.tuner.isScrambling) return response.error(409);

	if (!fs.existsSync(program.recorded)) return response.error(410);

	// probing
	child_process.exec('ffprobe -v 0 -show_format -of json "' + program.recorded + '"', function (err, std) {

		if (err) {
			util.log("error", err);
			return response.error(500);
		}

		try {
			main(JSON.parse(std));
		} catch (e) {
			return response.error(500);
		}
	});
}

function main(avinfo) {

	if (request.query.debug) {
		util.log(JSON.stringify(avinfo, null, '  '));
		util.log(JSON.stringify(request.headers, null, '  '));
	}

	switch (request.type) {
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
		case 'mp4':
			util.log('STREAMING: ' + request.url);

			var d = {
				ss   : request.query.ss     || '2',  //start(seconds)
				t    : request.query.t      || null, //duration(seconds)
				s    : request.query.s      || null, //size(WxH)
				f    : request.query.f      || null, //format
				'c:v': request.query['c:v'] || null, //vcodec
				'c:a': request.query['c:a'] || null, //acodec
				'b:v': request.query['b:v'] || null, //bitrate
				'b:a': request.query['b:a'] || null, //ab
				ar   : request.query.ar     || null, //ar(Hz)
				r    : request.query.r      || null  //rate(fps)
			};

			if (parseInt(d.ss, 10) < 2) {
				d.ss = '2';
			}

			if (parseInt(d.ss, 10) > parseFloat(avinfo.format.duration)) {
				return response.error(416);
			}

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
				if (d['c:a'] === 'copy' || d['b:a'] === null) {
					d['c:a'] = null;
					d['b:a'] = '96k';
				}
			}
			if (d['b:a'] !== null) {
				if (d['b:a'].match(/^[0-9]+k$/i)) {
					audioBitrate = parseInt(d['b:a'].match(/^([0-9]+)k$/i)[1], 10) * 1024;
				} else if (d['b:a'].match(/^[0-9]+m$/i)) {
					audioBitrate = parseInt(d['b:a'].match(/^([0-9]+)m$/i)[1], 10) * 1024 * 1024;
				}
			}
			if (videoBitrate !== 0 && audioBitrate !== 0) {
				bitrate = videoBitrate + audioBitrate;
			}

			// Caluculate Total Size
			var isize    = parseInt(avinfo.format.size, 10);
			var ibitrate = parseFloat(avinfo.format.bit_rate);
			var tsize    = 0;
			if (bitrate === 0) {
				bitrate = ibitrate;
				tsize = isize;
			} else {
				tsize = bitrate / 8 * parseFloat(avinfo.format.duration);
			}
			if (d.t) {
				tsize = tsize / parseFloat(avinfo.format.duration) * parseInt(d.t, 10);
			} else {
				tsize -= bitrate / 8 * (parseInt(d.ss, 10) - 2);
			}
			tsize = Math.floor(tsize);

			if (request.query.mode == 'download') {
				var pi = path.parse(program.recorded);
				response.setHeader('Content-disposition', 'attachment; filename*=UTF-8\'\'' + encodeURIComponent(pi.name + '.' + request.query.ext));
			}

			// Ranges Support
			var range = {
				start: parseInt(ibitrate / 8 * (parseInt(d.ss, 10) - 2), 10)
			};
			range.start = range.start - (range.start % 188);

			if (request.type === 'm2ts') {
				if (request.headers.range) {
					var bytes = request.headers.range.replace(/bytes=/, '').split('-');
					var rStart = parseInt(bytes[0], 10);
					var rEnd   = parseInt(bytes[1], 10) || tsize - 2;

					range.start = Math.round(rStart / bitrate * ibitrate);
					range.end   = Math.round(rEnd / bitrate * ibitrate);
					if (range.start > isize || range.end > isize) {
						return response.error(416);
					}

					response.setHeader('Content-Range', 'bytes ' + rStart + '-' + rEnd + '/' + tsize);
					response.setHeader('Content-Length', rEnd - rStart + 1);

					response.head(206);
				} else {
					response.setHeader('Accept-Ranges', 'bytes');
					response.setHeader('Content-Length', tsize);

					response.head(200);
				}
			} else {
				response.head(200);
			}

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

			args.push('-i', 'pipe:0');

			if (d.t) { args.push('-t', d.t); }

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
				args.push('-bufsize:v', videoBitrate * 8);
			}
			if (d['b:a']) {
				args.push('-b:a', d['b:a'], '-minrate:a', d['b:a'], '-maxrate:a', d['b:a']);
				args.push('-bufsize:a', audioBitrate * 8);
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

			var readStream = fs.createReadStream(program.recorded, range || {});

			request.on('close', function() {
				readStream.destroy();
			});

			if (d['c:v'] === 'copy' && d['c:a'] === 'copy' && !d.t) {
				readStream.pipe(response);
			} else {
				var ffmpeg = child_process.spawn('ffmpeg', args);
				children.push(ffmpeg.pid);
				util.log('SPAWN: ffmpeg ' + args.join(' ') + ' (pid=' + ffmpeg.pid + ')');

				ffmpeg.stdout.pipe(response);

				readStream.pipe(ffmpeg.stdin);

				ffmpeg.stderr.on('data', function(d) {
					util.log('#ffmpeg: ' + d);
				});

				ffmpeg.on('exit', function() {
					response.end();
				});

				request.on('close', function() {
					ffmpeg.stdout.removeAllListeners('data');
					ffmpeg.stderr.removeAllListeners('data');
					ffmpeg.kill('SIGKILL');
				});
			}

			return;
	}//<--switch

}
