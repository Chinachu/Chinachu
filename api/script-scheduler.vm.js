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
				response.exit(JSON.stringify(result));
				return;
			}
			
			result.time = fs.statSync(define.SCHEDULER_LOG_FILE).mtime.getTime();
			
			fs.readFileSync(define.SCHEDULER_LOG_FILE, 'ascii').split('\n').forEach(function(line) {
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
			});
			
			response.head(200);
			response.exit(JSON.stringify(result, null, '  '));
			
		} else {
			
			if (!fs.existsSync(define.SCHEDULER_LOG_FILE)) {
				response.head(204);
				response.exit('');
				return;
			}
			
			response.head(200);
			response.exit(fs.readFileSync(define.SCHEDULER_LOG_FILE, 'ascii'));
			
		}
	}

})();