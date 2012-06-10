/**
 * htdigest module.
 */
var htdigest = require('../lib/htdigest');

/**
 * Test for parseInput, plain success case.
 */
exports['testParseInputSuccessPlain'] = function (test) {
	// Test input.
	var args = ['node', 'htdigest.js', '-c', 'file', 'realm', 'mia'];

	// Should not throw an error.
	test.doesNotThrow( function() {
		// Source method call.
		htdigest.parseInput(args);
	}, "Should not throw an error!");

	// Assertions.
	test.equal(htdigest.file, args[3], "File is wrong!");
	test.equal(htdigest.realm, args[4], "Realm is wrong!");
	test.equal(htdigest.username, args[5], "Username is wrong!");

	// Test is done.
	test.done();
};
/**
 * Test for parseInput, fail case.
 */
exports['testParseInputFailNoArg'] = function (test) {
	// Test input.
	var args = ['node', 'htdigest.js'];

	// Should throw an error.
	test.throws( function() {
		// Source method call.
		htdigest.parseInput(args);
	}, "Should throw an error!");
	
	// Test is done.
	test.done();
};
/**
 * Test for parseInput, fail case.
 */
exports['testParseInputFailArgCount'] = function (test) {
	// Test input.
	var args = ['node', 'htdigest.js', '-c'];

	// Should throw an error.
	test.throws( function() {
		// Source method call.
		htdigest.parseInput(args);
	}, "Should throw an error!");
	
	// Test is done.
	test.done();
};