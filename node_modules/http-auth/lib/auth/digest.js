/**
 * Default setup module.
 */
var defaults = require('../defaults');

/**
 * Utility module.
 */
var utils = require('../utils');

/**
 * Module for generating unique id.
 */
var uuid = require('node-uuid');

/**
 * Exporting module.
 */
module.exports = Digest;

/**
 * State function.
 */
function State(name){
    this.name = name;
}

/**
 * Digest Access Authentication.
 *
 * @param {String} authRealm authentication realm.
 * @param {Array} authUsers array of users.
 * @param {String} algorithm algorithm for authentication.
 */
function Digest(authRealm, authUsers, algorithm) {
	// Realm.
	this.realm = authRealm;
	// Users.
	this.users = authUsers;
	// Nonces.
	this.nonces = new Array();
	// Algorithm.
	this.algorithm = algorithm;

	// Used for async callback.
	var self = this;

    // Stale state.
    this.STALE = new State("stale");

	/**
	 * Applies digest authentication and calls next after user is authenticated.
	 *
	 * @param {Request} request HTTP request object.
	 * @param {Response} response HTTP response object.
	 * @param {Function} next function that will be called after user is authenticated.
	 */
	this.apply = function(request, response, next) {		
		// Processing authentication part.
		var authenticated = self.isAuthenticated(request);
		if(!authenticated || authenticated === this.STALE) {
			self.ask(response, authenticated === this.STALE);
		} else {
			next(authenticated);
		}
	};
};

/**
 * Checks authorization header in request.
 *
 * @param {Request} request HTTP request object.
 * @return {String} the authenticated user ID, if authenticated, else undefined.
 */
Digest.prototype.isAuthenticated = function(request) {
	var authenticated = undefined;

	// If header exists.
	if("authorization" in request.headers) {
		var header = request.headers.authorization;
		var co = this.parseAuthHeader(header);

		// Check for expiration.
		if(co.nonce in this.nonces) {
			// Second hash in digest access authentication.
            // Calculating second hash.
			var ha2 = utils.md5(request.method + ":" + request.url);

			// Checking response for username.
			var userHash = this.users[co.username];

			// Username is correct.
			if(userHash && typeof userHash === 'string') {
				var ha1 = this.users[co.username].split(":")[2];

				// If algorithm is MD5-sess.
				if(co.algorithm == 'MD5-sess') {
					ha1 = utils.md5(ha1 + ":" + co.nonce + ":" + co.cnonce);
				}

				// If qop is specified.
				if(co.qop) {
					if(co.nc > this.nonces[co.nonce]) {
						// Updating nonce count.
						this.nonces[co.nonce] = co.nc;

						// Evaluating final authentication response.
						var authRes = utils.md5(ha1 + ":" + co.nonce + ":" + co.nc + ":" + 
							co.cnonce + ":" + co.qop + ":" + ha2);						
												
						authenticated = (authRes == co.response) ? co.username : undefined;
					} else {
                        authenticated = this.STALE;
                    }
				} else {
					// Evaluating final authentication response.
					var authRes = utils.md5(ha1 + ":" + co.nonce + ":" + ha2);
					authenticated = (authRes == co.response) ? co.username : undefined;
				}
			}
		} else {
            authenticated = this.STALE;
        }
	}

	return authenticated;
};
/**
 * Asks client for authentication.
 *
 * @param {Response} response HTTP response object.
 * @param {Boolean} identifies stale option.
 */
Digest.prototype.ask = function(response, stale) {
	// Generating unique nonce.
	var nonce = utils.md5(uuid());
	// Adding nonce.
	this.nonces[nonce] = 0;
	// Scheduling async timeout function call.
	setTimeout(this.expireNonce, defaults.NONCE_EXPIRE_TIMEOUT, nonce, this.nonces);

	// Generating authentication header.
	var header = "Digest realm=\"" + this.realm + "\", qop=\"auth\", nonce=\"" + nonce + 
		"\", algorithm=\"" + this.algorithm + "\", stale=\"" + (stale ? true : false) + "\"";

	response.setHeader("WWW-Authenticate", header);
	response.writeHead(401);
	response.end(defaults.HTML_401);
};
/**
 * Method for clearing not used nonces.
 *
 * @param {String} nonce nonce to delete.
 * @param {Array} nonces array of nonces.
 */
Digest.prototype.expireNonce = function(nonce, nonces) {
	delete nonces[nonce];
};
/**
 * Method for parsing authorization header.
 *
 * @param {String} header authorization header.
 * @return {Array} parsed array with authorization header data.
 */
Digest.prototype.parseAuthHeader = function(header) {
	var headerOptions = new Array();

	// Replacing internal quotes.
	var searchHeader = header.replace(/\\"/g, "&quot;");
	// Padding with quotes not padding values.
	searchHeader = searchHeader.replace(/(\w+)=([^," ]+)/g, '$1=\"$2\"');
	// Initial tokens.
	var tokens = searchHeader.match(/(\w+)="([^"]+)"/g);

	// If tokens were found.
	if(tokens) {
		// Adding tokens to final Object.
		for(var i = 0; i < tokens.length; ++i) {
			var token = tokens[i];
			// Searching for first equal sign.
			var equalIndex = token.indexOf("=");
			// Extracting key.
			var key = token.substr(0, equalIndex);
			// Extracting value.
			var value = token.substr(equalIndex + 2, token.length - equalIndex - 3);
			// Adding to options.
			headerOptions[key] = value;
		}
	}

	return headerOptions;
};
