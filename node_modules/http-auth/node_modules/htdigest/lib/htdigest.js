/**
 * Crypto module.
 */
var crypto = require('crypto');

/**
 * Commander module.
 */
var program = require('commander');

/**
 * FS module.
 */
var fs = require('fs');

/**
 * htdigest module.
 */
module.exports = {
	// Create file.
	'createFile' : false,
	// File.
	'file' : '',
	// Username.
	'username' : '',
	// Password.
	'password' : '',
	// Realm.
	'realm' : '',
	/**
	 * MD5 hash method.
	 *
	 * @param {String} str string to hash.
	 * @return {String} md5 hash of string.
	 */
	'md5' : function(str) {
		var hash = crypto.createHash('MD5');
		hash.update(str);
	
		return hash.digest('hex');
	},
	/**
	 * Prints usage of tool.
	 */
	'usage' : function() {
		console.log("Usage:");
		console.log("        htdigest [-c] passwordfile realm username");
		console.log(" -c  Create a new file.");
	},
	/**
	 * Parses input from command line.
	 *
	 * @param {String} args argument array.
	 * @throws {Error} error if arguments are not valid.
	 */
	'parseInput' : function(args) {
		// If command line arguments are passed.
		if(args.length <= 2) {
			throw new Error("Invalid count of arguments!");
		}
				
		// Flags.
		var flags = args[2];
		if(flags.indexOf("-") == 0) {		
			var flagPattern = /^-[c]+$/;
			// If flags are not valid.
			if(!flagPattern.test(flags)) {
				throw new Error("Invalid flag!");
			}
	
			this.file = args[3];
			this.realm = args[4];
			this.username = args[5];

			// Fetches flags.
			this.createFile = true;
								
			// Validates argument count based on flags.
			if(args.length !== 6) {
				throw new Error("Invalid count of arguments!");
			}
		} else {
			this.file = args[2];
			this.realm = args[3];
			this.username = args[4];
			
			// Validates argument count without flags.
			if(args.length !== 5) {
				throw new Error("Invalid count of arguments!");
			}
		}
	},
	/**
	 * Processes utility based on input.
	 */
	'process' : function() {
		var self = this;
		program.password('Password: ', function(pass) {
			self.password = pass;
			self.finishProcessing();
			process.stdin.destroy();
		});
	},
	/**
	 * Finishes processing.
	 */
	'finishProcessing' : function() {
		try {
			var newLine = this.username + ":" + this.realm + ":" + 
				this.md5(this.username + ":" + this.realm + ":" + this.password);
					
			var writeData = "";
				
			if(this.createFile) {
				fs.openSync(this.file, "w");
				writeData = "\n" + newLine;				
			} else {
				writeData = fs.readFileSync(this.file, "UTF-8")
				writeData += "\n" + newLine;	
			}
			
			if(writeData.indexOf("\n") == 0) {
				writeData = writeData.substr(1, writeData.length - 1);
			}
			
			// Writes data to file.
			fs.writeFileSync(this.file, writeData, "UTF-8");
		} catch(error) {
			this.usage();
		}
	}
};
