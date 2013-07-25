(function() {
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(data.rules, null, '  '));
			return;
		
		case 'POST':
			var args = [];
			
			for (var i in request.query) {
				if (i === 'method') continue;
				args.push('-' + i + ' ' + request.query[i]);
			}
			
			if (args.length === 0) {
				return response.error(400);
			}
			
			child_process.exec('node app-cli.js -mode rule ' + args.join(' '), function(err, stdout, stderr) {
				if (err) return response.error(500);
				
				response.head(200);
				response.end('{}');
			});
			return;
	}

})();