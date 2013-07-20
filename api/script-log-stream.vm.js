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
	
	response.write(new Array(1024).join(' '));
	
	var tailf = child_process.spawn('tail', ['-f', '-n', '30', filename]);
	children.push(tailf);// 安全対策
	
	tailf.stdout.pipe(response);
	
	tailf.on('exit', function(code) {
		response.end();
	});
	
	request.on('close', function() {
		tailf.kill('SIGKILL');
	});

})();