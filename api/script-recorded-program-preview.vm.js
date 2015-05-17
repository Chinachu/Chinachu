(function() {
	
	var program = chinachu.getProgramById(request.param.id, data.recorded);
	
	if (program === null) return response.error(404);
	
	if (!data.status.feature.previewer) return response.error(403);
	
	if (program.tuner && program.tuner.isScrambling) return response.error(409);
	
	if (!fs.existsSync(program.recorded)) return response.error(410);
	
	response.head(200);
	
	var width  = request.query.width  || '320';
	var height = request.query.height || '180';
	
	if (request.query.size && (request.query.size.match(/^[1-9][0-9]{0,3}x[1-9][0-9]{0,3}$/) !== null)) {
		width  = request.query.size.split('x')[0];
		height = request.query.size.split('x')[1];
	}
	
	var vcodec = 'mjpeg';
	
	if (request.query.type && (request.query.type === 'jpg')) { vcodec = 'mjpeg'; }
	if (request.query.type && (request.query.type === 'png')) { vcodec = 'png'; }
	if (request.type === 'jpg') { vcodec = 'mjpeg'; }
	if (request.type === 'png') { vcodec = 'png'; }
	if (request.type === 'txt') { vcodec = 'mjpeg'; }
	
	var pos = request.query.pos || '5';
	
	pos = (parseInt(pos, 10) - 1.5).toString(10);
	
	var ffmpeg = child_process.exec(
		(
			'ffmpeg -f mpegts -ss ' + pos + ' -r 10 -i "' + program.recorded + '" -ss 1.5 -r 10 -frames:v 1' +
			' -c:v ' + vcodec + ' -an -f image2 -s ' + width + 'x' + height + ' -map 0:0 -y pipe:1'
		)
		,
		{
			encoding: 'binary',
			maxBuffer: 3200000
		}
		,
		function(err, stdout, stderr) {
			if (err) {
				util.log(err);
				return response.error(503);
			}
			
			if (request.type === 'txt') {
				if (vcodec === 'mjpeg') {
					response.end('data:image/jpeg;base64,' + new Buffer(stdout, 'binary').toString('base64'));
				} else if (vcodec === 'png') {
					response.end('data:image/png;base64,' + new Buffer(stdout, 'binary').toString('base64'));
				}
			} else {
				response.end(stdout, 'binary');
			}
			clearTimeout(timeout);
		}
	);
	
	var timeout = setTimeout(function() {
		ffmpeg.kill('SIGKILL');
	}, 3000);

})();
