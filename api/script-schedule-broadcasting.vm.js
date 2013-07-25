(function() {
	
	switch (request.method) {
		case 'GET':
			var programs = [];
			
			var now = new Date().getTime();
			
			data.schedule.forEach(function(ch) {
				ch.programs.forEach(function(program) {
					if (now < program.start || now > program.end) return;
					
					programs.push(program);
				});
			});
			
			response.head(200);
			response.end(JSON.stringify(programs, null, '  '));
			return;
	}

})();