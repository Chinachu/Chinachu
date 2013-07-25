(function() {
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(data.recording, null, '  '));
			return;
	}

})();