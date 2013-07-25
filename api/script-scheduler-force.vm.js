(function() {
	
	switch (request.method) {
		case 'PUT':
			child_process.exec('./chinachu update --force');
			
			response.head(202);
			response.end('{}');
			
			return;
	}

})();