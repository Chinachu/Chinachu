(function() {
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(data.rules, null, '  '));
			return;
		
		case 'POST':
			if (request.headers['content-type'].match(/^application\/json/)) {
				var newRule = request.query;
				
				if (newRule.isEnabled === false) {
					newRule.isDisabled = true;
				}
				delete newRule.isEnabled;
				
				data.rules.push(newRule);
				fs.writeFileSync(define.RULES_FILE, JSON.stringify(data.rules, null, '  '));
				
				response.head(201);
				response.end(JSON.stringify(newRule));
			} else {
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
			}
			return;
	}

})();