(function() {
	
	var channel = null;
	
	data.schedule.forEach(function(ch) {
		if (ch.id === request.param.chid) {
			channel = ch;
		}
	});
	
	if (channel === null) return response.error(404);
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(channel.programs, null, '  '));
			return;
	}

})();