(function() {
	
	switch (request.method) {
		case 'GET':
			res();
			return;
		
		case 'PUT':
			child_process.exec('./chinachu update', function(err, stdout, stderr) {
				if (err) return response.error(500);
				
				res();
			});
			return;
	}
	
	function res() {
		if (request.type === 'json') {
		
			var result = {
				time     : 0,
				conflicts: [],
				reserves : []
			};
			
			if (!fs.existsSync(define.SCHEDULER_LOG_FILE)) {
				response.head(204);
				response.end(JSON.stringify(result));
				return;
			}
			
			result.time = fs.statSync(define.SCHEDULER_LOG_FILE).mtime.getTime();
			
			var schedulerLog  = child_process.execSync('tail -n 256 "' + define.SCHEDULER_LOG_FILE + '"', {
				encoding: 'utf8'
			});
			
			var lines = schedulerLog.split('\n').reverse();
			
			for (var k = 0; k < lines.length; k++) {
				var line = lines[k] || '';
				
				if (line.match('RUNNING SCHEDULER.') !== null) {
					break;
				}
				
				if ((line.match('CONFLICT:') !== null) || (line.match('RESERVE:') !== null)) {
					var id = line.match(/(RESERVE|CONFLICT): ([a-z0-9-]+)/)[2];
					var t  = line.match(/(RESERVE|CONFLICT): ([a-z0-9-]+)/)[1];
					var f  = null;
					
					for (var i = 0; i < data.schedule.length; i++) {
						for (var j = 0; j < data.schedule[i].programs.length; j++) {
							if (data.schedule[i].programs[j].id === id) {
								f = data.schedule[i].programs[j];
								break;
							}
						}
						if (f !== null) { break; }
					}
					
					if (t === 'CONFLICT') {
						result.conflicts.push(f);
					}
					if (t === 'RESERVE') {
						result.reserves.push(f);
					}
				}
			}
			
			result.conflicts.reverse();
			result.reserves.reverse();
			
			response.head(200);
			response.end(JSON.stringify(result, null, '  '));
			
		} else {
			
			if (!fs.existsSync(define.SCHEDULER_LOG_FILE)) {
				response.head(204);
				response.end('');
				return;
			}
			
			response.head(200);
			response.end(fs.readFileSync(define.SCHEDULER_LOG_FILE, 'ascii'));
			
		}
	}

})();