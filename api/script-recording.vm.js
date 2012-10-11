(function() {
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.exit(JSON.stringify(data.recording, null, '  '));
			return;
	}

})();