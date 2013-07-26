(function() {
	
	if (!data.status.feature.configurator) return response.error(403);
	
	if (!fs.existsSync(define.CONFIG_FILE)) return response.error(410);
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(fs.readFileSync(define.CONFIG_FILE));
			return;
		
		case 'PUT':
			if (!request.query.json) return response.error(400);
			
			var obj = {};
			
			try {
				obj = JSON.parse(request.query.json);
			} catch (e) {
				return response.error(400);
			}
			
			//var json = JSON.stringify(obj, null, '  ');
			var json = request.query.json;
			
			fs.writeFileSync(define.CONFIG_FILE, json);
			
			response.head(200);
			response.end(json);
			return;
	}

})();