/**
 * htpasswd module.
 */
var htpasswd = require('../lib/htpasswd');

/**
 * Test for parseInput, plain success case.
 */
exports['testParseInputSuccessPlain'] = function (test) {
	// Test input.
	var args = ['node', 'htpasswd.js', '-npb', 'mia', 'supergirl'];

	// Should not throw an error.
	test.doesNotThrow( function() {
		// Source method call.
		htpasswd.parseInput(args);
	}, "Should not throw an error!");

	// Assertions.
	test.equal(htpasswd.username, args[3], "Username is wrong!");
	test.equal(htpasswd.password, args[4], "Password is wrong!");

	// Test is done.
	test.done();
};
/**
 * Test for parseInput, encrypted success case.
 */
exports['testParseInputSuccessEncrypted'] = function (test) {
	// Test input.
	var args = ['node', 'htpasswd.js', '-nb', 'mia', 'supergirl'];

	// Should not throw an error.
	test.doesNotThrow( function() {
		// Source method call.
		htpasswd.parseInput(args);
	}, "Should not throw an error!");
	
	// Assertions.
	test.equal(htpasswd.username, args[3], "Username is wrong!");
	test.notEqual(htpasswd.password, '', "Password is empty!");

	// Test is done.
	test.done();
};
/**
 * Test for parseInput, fail case.
 */
exports['testParseInputFailNoArg'] = function (test) {
	// Test input.
	var args = ['node', 'htpasswd.js'];

	// Should throw an error.
	test.throws( function() {
		// Source method call.
		htpasswd.parseInput(args);
	}, "Should throw an error!");
	
	// Test is done.
	test.done();
};
/**
 * Test for parseInput, fail case.
 */
exports['testParseInputFailArgCount'] = function (test) {
	// Test input.
	var args = ['node', 'htpasswd.js', '-nb'];

	// Should throw an error.
	test.throws( function() {
		// Source method call.
		htpasswd.parseInput(args);
	}, "Should throw an error!");
	
	// Test is done.
	test.done();
};
/**
 * Test for parseInput, fail case.
 */
exports['testParseInputFailPassword'] = function (test) {
	// Test input.
	var args = ['node', 'htpasswd.js', '-nb', 'mia'];

	// Should not throw an error.
	test.throws( function() {
		// Source method call.
		htpasswd.parseInput(args);
	}, "Should throw an error!");
	
	// Test is done.
	test.done();
};