(function() {
	
	var rule = data.rules[parseInt(request.param.num, 10)] || null;
	
	if (rule === null) return response.error(404);
	
	switch (request.method) {
		case 'PUT':
			var cmd = '';
			
			switch (request.param.action) {
				case 'enable':
					cmd = 'node app-cli.js -mode rule --enable -n ' + request.param.num;
					break;
				case 'disable':
					cmd = 'node app-cli.js -mode rule --disable -n ' + request.param.num;
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