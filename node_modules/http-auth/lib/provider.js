/**
 * Digest and basic modules.
 */
var Digest = require('./auth/digest'), Basic = require('./auth/basic');

/**
 * Provider creates new basic or digest authentication instance.
 */
module.exports = {
	/**
	 * Creates new authentication instance.
	 *
	 * @param {Array} options authentication options.
	 * @return {Object} authentication instance.
	 */
	'newInstance' : function(options) {
		if(options && options.authType == 'digest') {
			return new Digest(options.authRealm, options.authUsers, options.algorithm);
		} else if(options && options.authType == 'basic') {
			return new Basic(options.authRealm, options.authUsers);			
		} else {
			throw new Error("Invalid type, may be digest | basic!");
		}
	}
};