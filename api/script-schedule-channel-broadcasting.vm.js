(function() {
	
	var channel = null;
	
	data.schedule.forEach(function(ch) {
		if (ch.id === request.param.chid) {
			channel = ch;
		}
	});
	
	if (channel === null) return response.error(404);
	
	var programs = [];
	
	var now = new Date().getTime();
	
	channel.programs.forEach(function(program) {
		if (now < program.start || now > program.end) return;
		
		programs.push(program);
	});
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(programs, null, '  '));
			return;
	}

})();