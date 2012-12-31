(function() {
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.exit(JSON.stringify(data.schedule, null, '  '));
			return;
	}

})();