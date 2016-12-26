(function() {

	var channel = null;

	data.schedule.forEach(function(ch) {
		if (ch.id === request.param.chid) {
			channel = ch;
		}
	});

	if (channel === null) return response.error(404);

	switch (request.type) {
		case 'png':
			// get logo
			mirakurun.getLogoImage(parseInt(channel.id, 36))
				.then(buffer => {
					response.head(200);
					response.end(buffer, 'binary');
				})
				.catch(err => {
					if (err.req) {
						return response.error(err.statusCode);
					} else {
						return response.error(503);
					}
				});
			break;
	}//<--switch
}());
