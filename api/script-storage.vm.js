(function() {
	switch (request.method) {
		case 'GET':
			var sumOfFileSize = function(list) {
				return list.reduce( function(prev, fpath, i, self) {
					if( !fs.existsSync(fpath) ) return prev;
					var s = fs.statSync(fpath);
					if( !s.isFile() ) return prev;
					return prev + s.blocks * 512;
				}, 0);
			};
			
			var recordedFiles = data.recorded.map( function(r) { return r.recorded; } );
			var storageUsage = {};
			storageUsage.recorded = sumOfFileSize(recordedFiles);
			
			child_process.exec('df --block-size=512 --output=size,used,avail ' + config.recordedDir , function(err, stdout, stderr) {
				if (err) return response.error(500);
				
				var line = stdout.split('\n')[1]; //ignore header line.
				var usage = line.replace(/^\s*/,"").split(/\s+/); // left trim and sprit.
				
				storageUsage.size  = parseInt(usage[0]) * 512;
				storageUsage.used  = parseInt(usage[1]) * 512;
				storageUsage.avail = parseInt(usage[2]) * 512;
				
				response.head(200);
				response.end(JSON.stringify(storageUsage, null, '  '));
			});
			
			return;
	}
})();
