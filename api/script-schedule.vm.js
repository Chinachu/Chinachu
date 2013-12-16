var mtime = fs.statSync(define.SCHEDULE_DATA_FILE).mtime;

response.setHeader('last-modified', new Date(mtime).toUTCString());

if (request.headers['if-modified-since'] && request.headers['if-modified-since'] === new Date(mtime).toUTCString()) {	
	response.head(304);
	response.end();
} else {
	var input = JSON.stringify(data.schedule);
	
	switch (request.encoding) {
	case 'deflate':
		response.setHeader('content-encoding', 'deflate');
		zlib.deflate(input, function (err, buffer) {
			if (!err) {
				response.setHeader('content-length', buffer.length);
				response.head(200);
				if (request.method === 'GET') {
					response.end(buffer);
				} else {
					response.end();
				}
			}
		});
		break;
	default:
		response.head(200);
		if (request.method === 'GET') {
			response.end(input);
		} else {
			response.end();
		}
	}
}