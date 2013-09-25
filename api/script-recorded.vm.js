switch (request.method) {
case 'GET':
	response.head(200);
	response.end(JSON.stringify(data.recorded));
	break;

case 'PUT':
	data.recorded = (function() {
		var array = [];
		
		data.recorded.forEach(function(a) {
			if (fs.existsSync(a.recorded)) {
				array.push(a);
			}
		});
		
		return array;
	})();
	
	fs.writeFileSync(define.RECORDED_DATA_FILE, JSON.stringify(data.recorded));
	
	response.head(200);
	response.end(JSON.stringify(data.recorded, null, '  '));
	break;
}