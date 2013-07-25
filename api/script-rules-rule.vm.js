(function() {
	
	var rule = data.rules[parseInt(request.param.num, 10)] || null;
	
	if (rule === null) return response.error(404);
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(rule, null, '  '));
			return;
		
		case 'PUT':
			var args = [];
			
			for (var i in request.query) {
				if (i === 'method') continue;
				args.push('-' + i + ' ' + request.query[i]);
			}
			
			if (args.length === 0) {
				return response.error(400);
			}
			
			child_process.exec('node app-cli.js -mode rule -n ' + request.param.num + ' ' + args.join(' '), function(err, stdout, stderr) {
				if (err) return response.error(500);
				
				response.head(200);
				response.end('{}');
			});
			return;
		
		case 'DELETE':
			child_process.exec('node app-cli.js -mode rule --remove -n ' + request.param.num, function(err, stdout, stderr) {
				if (err) return response.error(500);
				
				response.head(200);
				response.end('{}');
			});
			return;
	}

})();