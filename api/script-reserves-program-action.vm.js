(function() {
	
	var program = chinachu.getProgramById(request.param.id, data.reserves);
	
	if (program === null) return response.error(404);
	
	switch (request.method) {
		case 'PUT':
			var cmd = '';
			
			switch (request.param.action) {
				case 'skip':
					cmd = 'node app-cli.js -mode skip -id ' + program.id;
					break;
				case 'unskip':
					cmd = 'node app-cli.js -mode unskip -id ' + program.id;
					break;
			}
			
			child_process.exec(cmd, function(err, stdout, stderr) {
				if (err) return response.error(500);
				
				response.head(200);
				response.end('{}');
			});
			return;
	}

})();