(function() {

	var program = chinachu.getProgramById(request.param.id, data.schedule);

	if (program === null) return response.error(404);

	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(program, null, '  '));
			return;

		case 'PUT':
			if (chinachu.getProgramById(program.id, data.reserves) !== null) {
				return response.error(409);
			}

			var cmd = 'node app-cli.js -mode reserve -id ' + program.id;

			if (request.query['mode'] === '1seg') {
				cmd += ' -1seg';
			}

			child_process.exec(cmd, function(err, stdout, stderr) {
				if (err) return response.error(500);

				response.head(200);
				response.end('{}');
			});
			return;
	}

})();
