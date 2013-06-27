(function() {
	
	var program = chinachu.getProgramById(request.param.id, data.recorded);
	
	if (program === null) return response.error(404);
	
	if (!data.status.feature.filer) return response.error(403);
	
	if (!fs.existsSync(program.recorded)) return response.error(410);
	
	switch (request.method) {
		case 'GET':
			var fstat = fs.statSync(program.recorded);
			
			if (request.type === 'm2ts') {
				// todo: 安全でない(Stream/Readable Stream: Unstable)
				if (request.query.unsafe && (request.query.unsafe === 'yes')) {
					response.setHeader('content-length', fstat.size);
					response.setHeader('content-disposition', 'attachment; filename="' + program.id + '.m2ts"');
					response.head(200);
					
					var readStream = fs.createReadStream(program.recorded);
					
					readStream.on('data', function(d) {
						response.write(d, 'binary');
					});
					
					readStream.on('end', function() {
						response.end();
					});
					
					readStream.on('close', function() {
						response.end();
					});
					
					request.on('close', function() {
						readStream.destroy();
					});
				} else {
					response.error(501);
				}
			}
			
			if (request.type === 'json') {
				response.head(200);
				
				response.end(JSON.stringify({
					dev    : fstat.dev,
					ino    : fstat.ino,
					mode   : fstat.mode,
					ulink  : fstat.ulink,
					uid    : fstat.uid,
					gid    : fstat.gid,
					rdev   : fstat.rdev,
					size   : fstat.size,
					blksize: fstat.blksize,
					blocks : fstat.blocks,
					atime  : fstat.atime.getTime(),
					mtime  : fstat.mtime.getTime(),
					ctime  : fstat.ctime.getTime()
				}, null, '  '));
			}
			
			return;
		
		case 'DELETE':
			response.head(200);
			
			fs.unlinkSync(program.recorded);
			
			if (request.type === 'json') {
				response.end('{}');
			} else {
				response.end();
			}
			return;
	}

})();