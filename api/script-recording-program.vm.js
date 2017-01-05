(function() {

	var program = chinachu.getProgramById(request.param.id, data.recording);

	if (program === null) return response.error(404);

	switch (request.method) {
		case 'GET':
			response.head(200);
			response.end(JSON.stringify(program, null, '  '));
			return;

		case 'DELETE':
			if (!program.isManualReserved) {
				const rp  = chinachu.getProgramById(program.id, data.reserves);
				if (rp) {
					rp.isSkip = true;
					fs.writeFileSync(define.RESERVES_DATA_FILE, JSON.stringify(data.reserves));
				}
			}

			/* data.recording.forEach(a => {
				if (a.id === program.id) {
					a.abort = true;
				}
			}); */
			program.abort = true;
			fs.writeFileSync(define.RECORDING_DATA_FILE, JSON.stringify(data.recording));

			response.head(200);
			response.end('{}');
			return;
	}

})();