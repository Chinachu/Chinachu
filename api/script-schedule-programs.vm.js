(function() {
	
	switch (request.method) {
		case 'GET':
			var programs = [];
			
			data.schedule.forEach(function(ch) {
				programs = programs.concat(ch.programs);
			});
			
			response.head(200);
			response.end(JSON.stringify(programs, null, '  '));
			return;
	}

})();