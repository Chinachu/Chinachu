(function() {
	
	var num = parseInt(request.param.num, 10).toString(10);
	var rule = data.rules[num] || null;
	
	if (rule === null) return response.error(404);
	
	switch (request.method) {
		case 'PUT':
			var cmd = '';
			
			switch (request.param.action) {
				case 'enable':
					cmd = 'node app-cli.js -mode rule --enable -n ' + num;
					break;
				case 'disable':
					cmd = 'node app-cli.js -mode rule --disable -n ' + num;
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
