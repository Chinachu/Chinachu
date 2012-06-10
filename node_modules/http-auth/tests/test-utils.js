/**
 * Utility module.
 */
var utils = require('../lib/utils');

/**
 * Base64 decode test with ASCII.
 */
exports['testDecodeBase64ASCII'] = function(test) {
	// Checking decoded string.
	test.equal(utils.decodeBase64("c29tZSB0ZXh0"), "some text", 
		"ASCII string is not decoded correctly!");
	// Test is done.
	test.done();
};
/**
 * Base64 decode test with unicode.
 */
exports['testDecodeBase64Unicode'] = function(test) {
	// Checking decoded string.
	test.equal(utils.decodeBase64("1aHVtdW91brVpdW9"), "այսպես", 
		"Unicode string is not decoded correctly!");
	// Test is done.
	test.done();
};
/**
 * Base64 test with ASCII.
 */
exports['testBase64ASCII'] = function(test) {
	// Checking encoded string.
	test.equal(utils.base64("some text"), "c29tZSB0ZXh0", "ASCII string is not encoded correctly!");
	// Test is done.
	test.done();
};
/**
 * Base64 test with unicode.
 */
exports['testBase64Unicode'] = function(test) {
	// Checking encoded string.
	test.equal(utils.base64("այսպես"), "1aHVtdW91brVpdW9", 
		"Unicode string is not encoded correctly!");
	// Test is done.
	test.done();
};
/**
 * MD5 test with ASCII.
 */
exports['testMD5ASCII'] = function(test) {
	// Checking generated hash.
	test.equal(utils.base64("other text"), "b3RoZXIgdGV4dA==", 
		"MD5 hash is not correct for ASCII string!");
	// Test is done.
	test.done();
};
/**
 * MD5 test with unicode.
 */
exports['testMD5Unicode'] = function(test) {
	// Checking generated hash.
	test.equal(utils.base64("այնպես"), "1aHVtdW21brVpdW9", 
		"MD5 hash is not correct for unicode string!");
	// Test is done.
	test.done();
};