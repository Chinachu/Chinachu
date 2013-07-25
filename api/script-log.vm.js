(function() {

	if (['wui', 'operator', 'scheduler'].indexOf(request.param.name) === -1) {
		return response.error(404);
	}
	
	var filename = './log/' + request.param.name;
	
	if (!fs.existsSync(filename)) {
		response.head(204);
		response.end('');
		return;
	}
	
	response.head(200);
	
	fs.readFile(filename, function(err, data) {
		if (err) {
			util.log(err);
			return response.error(500);
		}
		
		response.end(data);
	});

})();