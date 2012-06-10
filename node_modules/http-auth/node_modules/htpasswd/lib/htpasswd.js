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
 * htpasswd module.
 */
module.exports = {
	// Print output to screen.
	'printToScreen' : false,
	// Pass password via arguments.
	'passFromCommand' : false,
	// Create file.
	'createFile' : false,
	// Plain text.
	'plainText' : false,
	// Delete user.
	'deleteUser' : false,
	// File.
	'file' : '',
	// Username.
	'username' : '',
	// Password.
	'password' : '',
	/**
	 * SHA1 hash for password.
	 * 
	 * @param {String} password password.
	 * @return {String} SHA1 hash.
	 */
	'sha1' : function(password) {
		var hash = crypto.createHash('sha1');
        hash.update(password);
        hash = hash.digest("base64");
        
        return hash;
	},
	/**
	 * Validates password.
	 * 
	 * @param {String} passHash for comparison.
	 * @param {Strign} password password.
	 * @return {Boolean} true if password is valid, else false.
	 */
	'validate' : function(passHash, password) {
		if(passHash.substr(0, 5) == "{SHA}") {
			passHash = passHash.substr(5);
			password = this.sha1(password);
		}
		
		return passHash == password;
	},
	/**
	 * Prints usage of tool.
	 */
	'usage' : function() {
		console.log("Usage:");
		console.log("        htpasswd [-cpD] passwordfile username");
		console.log("        htpasswd -b[cpD] passwordfile username password\n");
		console.log("        htpasswd -n[p] username");
		console.log("        htpasswd -nb[p] username password");
		console.log(" -c  Create a new file.");
		console.log(" -n  Don't update file; display results on stdout.");
		console.log(" -p  Do not encrypt the password (plaintext).");
		console.log(" -b  Use the password from the command line rather than prompting for it.");
		console.log(" -D  Delete the specified user.");
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
			var flagPattern = /^-[nbcpD]+$/;
			// If flags are not valid.
			if(!flagPattern.test(flags)) {
				throw new Error("Invalid flag!");
			}
	
			// Fetches flags.
			this.printToScreen = flags.indexOf("n") != -1;
			this.passFromCommand = flags.indexOf("b") != -1;
			this.createFile = flags.indexOf("c") != -1;
			this.plainText = flags.indexOf("p") != -1;
			this.deleteUser = flags.indexOf("D") != -1;

			// Expected count of other arguments([node,script,flags,username,...]).
			var expectedArgCount = 4;
			if(!this.printToScreen) {
				this.file = args[3];
				this.username = args[4];
				++ expectedArgCount;
			} else {
				this.username = args[3];			
			}
			if(this.passFromCommand) {
				this.password = args[args.length - 1];
				++ expectedArgCount;
			}
							
			// Validates argument count based on flags.
			if(args.length !== expectedArgCount) {
				throw new Error("Invalid count of arguments!");
			}
		} else {
			this.file = args[2];
			this.username = args[3];
			
			// Validates argument count without flags.
			if(args.length !== 4) {
				throw new Error("Invalid count of arguments!");
			}
		}
	},
	/**
	 * Processes utility based on input.
	 */
	'process' : function() {
		var self = this;
		if(!this.passFromCommand && !this.deleteUser) {
			program.password('Password: ', function(pass) {
				self.password = pass;
				self.finishProcessing();
				process.stdin.destroy();
			});
		} else {
			this.finishProcessing();
		}
	},
	/**
	 * Finishes processing.
	 */
	'finishProcessing' : function() {
		try {
			var newLine = this.username + ":" + 
				(!this.plainText ? ("{SHA}" + this.sha1(this.password)) : this.password);
					
			// Prints to screen.
			if(this.printToScreen) {
				console.log(newLine);
			} else {
				var writeData = "";
				
				if(this.deleteUser) {
					var data = fs.readFileSync(this.file, "UTF-8")
	
					var lines = data.split("\n");
					for(var i = 0; i < lines.length; ++ i) {
						var line = lines[i];
	
						if(line.indexOf(this.username + ":") != 0) {
							writeData += "\n" + line;
						}
					}
				} else if(this.createFile) {
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
			}
		} catch(error) {
			this.usage();
		}
	}
};
