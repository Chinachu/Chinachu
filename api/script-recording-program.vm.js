(function() {

	var program = chinachu.getProgramById(request.param.id, data.recording);

	if (program === null) return response.error(404);

	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(program, null, '  '));
			return;

		case 'DELETE':
			data.recording.forEach(a => {
				if (a.id === program.id) {
					a.abort = true;
				}
			});
			fs.writeFileSync(define.RECORDING_DATA_FILE, JSON.stringify(data.recording));

			response.head(200);
			response.end('{}');
			return;
	}

})();