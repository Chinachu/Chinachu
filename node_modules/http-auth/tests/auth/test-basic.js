/**
 * Basic authentication module.
 */
var Basic = require('../../lib/auth/basic');

/**
 * Default setup module.
 */
var defaults = require('../../lib/defaults');

/**
 * Utility module.
 */
var utils = require('../../lib/utils');

/**
 * Mock module.
 */
var nodemock = require("nodemock");

/**
 * Source of test.
 */
var source;

/**
 * Setup.
 */
exports['setUp'] = function(callback) {
	// Initiates basic instance before each test.
	source = new Basic("AweSome REALM", ["user:hash1", "user:hash2"]);
	// GOD knows why I need to call this.
	callback();
};
/**
 * TearDown.
 */
exports['tearDown'] = function(callback) {
	// Deletes basic instance after each test.
	delete source;
	// GOD knows why I need to call this.
	callback();
};
/**
 * Test for ask.
 */
exports['testAsk'] = function(test) {
	// Response mock(setHeader).
	var response = nodemock.mock("setHeader").takes("WWW-Authenticate", 
		"Basic realm=\"AweSome REALM\"");
	// Response mock(writeHead).
	response.mock("writeHead").takes(401);
	// Response mock(end).
	response.mock("end").takes(defaults.HTML_401);
	
	// Source method call.
	source.ask(response);
	
	// Asserts all mock expectations.
	response.assert();
	// Test is done.
	test.done();
};
/**
 * Test for isAuthenticated, true case.
 */
exports['testIsAuthenticatedTrue'] = function(test) {
	// Initiates input request.
	var header = "Basic: " + utils.base64('user:hash1');
	var request = {headers : {authorization : header}};
		
	// Source method call, that must return username.
	test.equals(source.isAuthenticated(request), "user", "User must be valid!");
	
	// Test is done.
	test.done();
};
/**
 * Test for isAuthenticated, false case.
 */
exports['testIsAuthenticatedFalse'] = function(test) {
	// Initiates input request.
	var request = {headers : {authorization : "Basic: userhash4"}};
		
	// Source method call, that must return false.
	test.ok(!source.isAuthenticated(request), "User must not be valid!");
	
	// Test is done.
	test.done();
};
/**
 * Test for isAuthenticated, false case, where the password
 * is valid but the username is not.
 */
exports['testIsAuthenticatedFalseSamePassword'] = function(test) {
	// Initiates input request.
	var header = "Basic: " + utils.base64('user_DOES_NOT_EXIST:hash1');
	var request = {headers : {authorization : header}};

	// Source method call, that must return false.
	test.ok(!source.isAuthenticated(request), "User must not be valid!");

	// Test is done.
	test.done();
};
/**
 * Test for apply, pass case.
 */
exports['testApplyPass'] = function(test) {
	// Initiates input request.
	var header = "Basic: " + utils.base64('user:hash1');
	var request = {headers : {authorization : header}};
	// Initiates response.
	var response = {};
	// Initiates callback.
	var callbackMock = nodemock.mock("mockMethod").takes("YOU MUST CALL ME!");
	
	// Source method call.
	source.apply(request, response, function() {
		callbackMock.mockMethod("YOU MUST CALL ME!");
	});
	
	// Asserts all mock expectations.
	callbackMock.assert();
	// Test is done.
	test.done();
};
/**
 * Test for apply, auth case.
 */
exports['testApplyAuth'] = function(test) {
	// Initiates input request.
	var request = {headers : {authorization : "Basic: userhash4"}};
	// Response mock(setHeader).
	var response = nodemock.mock("setHeader").takes("WWW-Authenticate", 
		"Basic realm=\"AweSome REALM\"");
	// Response mock(writeHead).
	response.mock("writeHead").takes(401);
	// Response mock(end).
	response.mock("end").takes(defaults.HTML_401);
	
	// Source method call.
	source.apply(request, response, function() {
		test.ok(false, "Callback should not be called!");
	});
	
	// Asserts all mock expectations.
	response.assert();
	// Test is done.
	test.done();
};