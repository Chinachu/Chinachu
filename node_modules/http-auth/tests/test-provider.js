/**
 * Provider module.
 */
var provider = require('../lib/provider');

/**
 * Test for valid basic access authentication.
 */
exports['testValidBasicAuth'] = function (test) {
	// Requests basic access authentication instance.
	var basic = provider.newInstance({
		authRealm : "Private area with basic access authentication.",
		authList : ['Kuka:pi2', 'suma:kramoke'],
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
 * Test for valid digest access authentication.
 */
exports['testValidDigestAuth'] = function (test) {
	// Requests digest access authentication instance.
	var digest = provider.newInstance({
		authRealm : "Private area with digest access authentication.",
		authList : ['asdas:ssss', 'gira:makura'],
		authType : 'digest'
	});
	// Checking instance itself.
	test.notEqual(digest, null, "Digest access authentication instance is empty!");
	// Checking apply method.
	test.notEqual(digest.apply, null, "Digest access authentication instance has no apply method!");
	// Test is done.
	test.done();
};

/**
 * Test for empty options.
 */
exports['testInvalidAuthOptions'] = function (test) {
	// Checking for null options.
	test.throws(function() {
		provider.newInstance();
	}, Error, "Must throw an error when no options are provided!");
	// Test is done.
	test.done();
};

/**
 * Test for invalid authType.
 */
exports['testInvalidAuthType'] = function (test) {
	// Checking for wrong authType.
	test.throws(function () { 
		provider.newInstance({authType : 'some type'}); 
	}, Error, "Must throw an error when authType is wrong!");
	// Test is done.
	test.done();
};