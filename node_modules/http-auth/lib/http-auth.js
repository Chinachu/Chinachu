/**
 * Authentication provider.
 */
var provider = require('./provider');

/**
 * Parser module for authentication input options.
 */
var opt = require('./options');

/**
 * Requests authentication instance from provider.
 *
 * @param {Array} options options that may be used for authentication.
 *
 *	- authRealm authentication realm.
 *	- authFile file where user details are stored in format {user:pass}.
 *	- authList list where user details are stored in format {user:pass}, 
 * 		ignored if authFile is specified.
 *	- authType type of authentication, digest | basic, optional, default is basic.
 *	- algorithm algorithm that will be used, may be MD5 or MD5-sess, optional, default is MD5.
 * @return {Object} authentication instance.
 */
module.exports = function(options) {
	// Parsing options.
	var parsedOptions = opt(options);
	// Requesting new authentication instance.
	return provider.newInstance(parsedOptions);
};