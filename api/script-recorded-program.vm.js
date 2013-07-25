(function() {
	
	var program = chinachu.getProgramById(request.param.id, data.recorded);
	
	if (program === null) return response.error(404);
	
	program.isRemoved = !fs.existsSync(program.recorded);
	
	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(program, null, '  '));
			return;
		
		case 'DELETE':
			data.recorded = (function() {
				var array = [];
				
				data.recorded.forEach(function(a) {
					if (a.id !== program.id) {
						array.push(a);
					}
				});
				
				return array;
			})();
			
			fs.writeFileSync(define.RECORDED_DATA_FILE, JSON.stringify(data.recorded));
			
			response.head(200);
			response.end('{}');
			return;
	}

})();