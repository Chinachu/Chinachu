/**
 * HTTP authentication module.
 */
var auth = require('../lib/http-auth');

/**
 * HTTP module.
 */
var http = require('http');

/**
 * Requesting new authentication instance.
 */
var basic = auth({
	authRealm : "Private area.",
	// username is mia, password is supergirl.
	authList : ['mia:{SHA}x511ncXd+4fOnYAotcGPFD0peYo=']
});

/**
 * Creating new HTTP server.
 */
http.createServer(function(req, res) {
	// Apply authentication to server.
	basic.apply(req, res, function(username) {
		res.end("Welcome to private area - " + username + "!");
	});
}).listen(1337);

// Log url.
console.log("Server running at http://127.0.0.1:1337/");