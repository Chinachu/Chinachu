/**
 * HTTP authentication module.
 */
var auth = require('../lib/http-auth');

/**
 * Test for basic access authentication.
 */
exports['testBasicAuth'] = function (test) {
	// Requests basic access authentication instance.
	var basic = auth({
		authRealm : "Private area with basic access authentication.",
		authList : ['Shi:many222', 'Lota:123456'],
		authType : 'basic'
	});
	// Checking instance itself.
	test.notEqual(basic, null, "Basic access authentication instance is empty!");
	// Checking apply method.
	test.notEqual(basic.apply, null, "Basic access authentication instance has no apply method!");
	// Test is done.
	test.done();
};

/**
 * Test for digest access authentication.
 */
exports['testDigestAuth'] = function (test) {
	// Requests digest access authentication instance.
	var digest = auth({
		authRealm : "Private area with digest access authentication.",
		authList : ['2Shi:ma22y222', '3Lota:1123456'],
		authType : 'digest'
	});
	// Checking instance itself.
	test.notEqual(digest, null, "Digest access authentication instance is empty!");
	// Checking apply method.
	test.notEqual(digest.apply, null, "Digest access authentication instance has no apply method!");
	// Test is done.
	test.done();
};