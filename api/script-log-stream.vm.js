(function() {

	if (['wui', 'operator', 'scheduler'].indexOf(request.param.name) === -1) {
		return response.error(404);
	}

	let filename = "";
	switch (request.param.name) {
		case "wui":
			filename = define.WUI_LOG_FILE;
			break;
		case "scheduler":
			filename = define.SCHEDULER_LOG_FILE;
			break;
		case "operator":
			filename = define.OPERATOR_LOG_FILE;
			break;
	}

	if (!fs.existsSync(filename)) {
		response.head(204);
		response.end('');
		return;
	}

	response.head(200);

	response.write(new Array(1024).join(' '));

	var tailf = child_process.spawn('tail', ['-f', '-n', '100', filename]);
	children.push(tailf.pid);

	tailf.stdout.pipe(response);

	tailf.on('exit', function(code) {
		response.end();
	});

	request.on('close', function() {
		tailf.kill('SIGKILL');
	});

})();