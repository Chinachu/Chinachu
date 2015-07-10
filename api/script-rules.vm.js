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
				response.error(400);
			}
			return;
	}

})();