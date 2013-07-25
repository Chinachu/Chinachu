(function() {
	
	var program = chinachu.getProgramById(request.param.id, data.reserves);
	
	if (program === null) return response.error(404);
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(program, null, '  '));
			return;
		
		case 'DELETE':
			if (!program.isManualReserved) {
				return response.error(409);
			}
			
			child_process.exec('node app-cli.js -mode unreserve -id ' + program.id, function(err, stdout, stderr) {
				if (err) return response.error(500);
				
				response.head(200);
				response.end('{}');
			});
			return;
	}

})();