/**
 * HTTP authentication module.
 */
var auth = require('../lib/http-auth');

/**
 * HTTP module.
 */
var http = require('http');

/**
 * HTTP proxy module.
 */
var httpProxy = require('http-proxy');


/**
 * Requesting new authentication instance.
 */
var basic = auth({
	authRealm : "Private area.",
	authList : ['mia:supergirl', 'Carlos:test456', 'Sam:oho']
});

/**
 * Create a proxy server with custom application logic.
 */
httpProxy.createServer(function(req, res, proxy) {
	basic.apply(req, res, function() {
		proxy.proxyRequest(req, res, {
			host : 'localhost',
			port : 9000
		});
	});
}).listen(8000);

/**
 * Destination server.
 */
http.createServer(function(req, res) {
	res.end('request successfully proxied!');
}).listen(9000);

// Log url.
console.log("Server running at http://127.0.0.1:8000/");