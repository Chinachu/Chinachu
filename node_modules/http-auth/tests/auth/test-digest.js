/**
 * Digest authentication module.
 */
var Digest = require('../../lib/auth/digest');

/**
 * Default setup module.
 */
var defaults = require('../../lib/defaults');

/**
 * Mock module.
 */
var nodemock = require("nodemock");

/**
 * Source of test.
 */
var source;

/**
 * Setting to 0.
 */
defaults.NONCE_EXPIRE_TIMEOUT = 0;

/**
 * Setup.
 */
exports['setUp'] = function(callback) {
	// Initiates basic instance before each test.
	source = new Digest("AweSome REALM", {"mia" : 
		"mia:Private area.:3a556dc7260e8e7f032d247fb668b06b"}, 'MD5');
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
	// Response ignore(setHeader).
	var response = nodemock.ignore("setHeader");
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
 * Test for expireNonce.
 */
exports['testExpireNonce'] = function(test) {
	// Adds some nonce.
	var nonces = {"awesomeNonce": "awesomeValue"};
	
	// Source method call.
	source.expireNonce('awesomeNonce', nonces);
		
	// 'awesomeNonce' should be removed.
	test.ok(!nonces['awesomeNonce'], "'awesomeNonce' should be removed!");
	// Test is done.
	test.done();	
};
/**
 * Test for parseAuthHeader.
 */
exports['testParseAuthHeader'] = function(test) {
	// Header.
	var header = 'Digest username="mia", realm="Private area.", ' + 
		'nonce="2675ef554c8c872e80b946657e2e36a9", uri="/", algorithm=MD5, ' + 
		'response="2a64d7e5c273b1c29cc4f206eba6616c", qop=auth, nc=00000001, ' +
		'cnonce="68f1a150020e0928"';
	
	// Source method call.
	var parseResult = source.parseAuthHeader(header);
		
	// parseResult assertions.
	test.equal(parseResult['username'], "mia", "username is wrong!");
	test.equal(parseResult['realm'], "Private area.", "realm is wrong!");
	test.equal(parseResult['nonce'], "2675ef554c8c872e80b946657e2e36a9", "nonce is wrong!");
	test.equal(parseResult['uri'], "/", "uri is wrong!");
	test.equal(parseResult['algorithm'], "MD5", "algorithm is wrong!");
	test.equal(parseResult['response'], "2a64d7e5c273b1c29cc4f206eba6616c", "response is wrong!");
	test.equal(parseResult['qop'], "auth", "qop is wrong!");
	test.equal(parseResult['nc'], "00000001", "nc is wrong!");
	test.equal(parseResult['cnonce'], "68f1a150020e0928", "cnonce is wrong!");
	// Test is done.
	test.done();	
};
/**
 * Test for isAuthenticated, true case.
 */
exports['testIsAuthenticatedTrue'] = function(test) {
	source.nonces["2675ef554c8c872e80b946657e2e36a9"] = 0;
	
	// Header.
	var header = 'Digest username="mia", realm="Private area.", ' + 
		'nonce="2675ef554c8c872e80b946657e2e36a9", uri="/", algorithm=MD5, ' + 
		'response="96f7ba7d6319d0246b28e2db307b5eaa", qop=auth, nc=00000001, ' +
		'cnonce="68f1a150020e0928"';

	// Initiates input request.
	var request = {headers : {authorization : header}};
		
	// Source method call, that must return username.
	test.equals(source.isAuthenticated(request), "mia", "User must be valid!");
	
	// Test is done.
	test.done();
};
/**
 * Test for isAuthenticated, false header case.
 */
exports['testIsAuthenticatedFalseHeader'] = function(test) {
    // Header.
    var header = 'Digest username="mia", realm="Private area.", ' +
        'nonce="2675ef554c8c872e80b946657e2e36a9", uri="/", algorithm=MD5, ' +
        'response="51045d0e1925225054e2435599ad67f3", qop=auth, nc=00000001, ' +
        'cnonce="68f1a150020e0928"';

    // Initiates input request.
    var request = {headers : {authorizationWrong : header}};

    // Source method call, that must return false.
    test.ok(!source.isAuthenticated(request), "User must be invalid!");

    // Test is done.
    test.done();
};
/**
 * Test for isAuthenticated, false nc case.
 */
exports['testIsAuthenticatedFalseNC'] = function(test) {
    // Header.
    var header = 'Digest username="mia", realm="Private area.", ' +
        'nonce="2675ef554c8c872e80b946657e2e36a9", uri="/", algorithm=MD5, ' +
        'response="51045d0e1925225054e2435599ad67f3", qop=auth, nc=00000001, ' +
        'cnonce="68f1a150020e0928"';

    // Initiates input request.
    var request = {headers : {authorization : header}};

    // Source method call, that must return 'stale'.
    test.equals(source.isAuthenticated(request), source.STALE, "User must be invalid!");

    // Test is done.
    test.done();
};
/**
 * Test for isAuthenticated, false response case.
 */
exports['testIsAuthenticatedFalseRes'] = function(test) {
	source.nonces["2675ef554c8c872e80b946657e2e36a9"] = 0;
	
	// Header.
	var header = 'Digest username="mia", realm="Private area.", ' + 
		'nonce="2675ef554c8c872e80b946657e2e36a9", uri="/", algorithm=MD5, ' + 
		'response="21045d0e1925222054e2435599ad67f3", qop=auth, nc=00000001, ' +
		'cnonce="68f1a150020e0928"';

	// Initiates input request.
	var request = {headers : {authorization : header}};
		
	// Source method call, that must return false.
	test.ok(!source.isAuthenticated(request), "User must be invalid!");
	
	// Test is done.
	test.done();
};
/**
 * Test for apply, pass case.
 */
exports['testApplyPass'] = function(test) {
	source.nonces["2675ef554c8c872e80b946657e2e36a9"] = 0;
	
	// Header.
	var header = 'Digest username="mia", realm="Private area.", ' + 
		'nonce="2675ef554c8c872e80b946657e2e36a9", uri="/", algorithm=MD5, ' + 
		'response="96f7ba7d6319d0246b28e2db307b5eaa", qop=auth, nc=00000001, ' +
		'cnonce="68f1a150020e0928"';

	// Initiates input request.
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
	// Header.
	var header = 'Digest username="mia", realm="Private area.", ' + 
		'nonce="2675ef554c8c872e80b946657e2e36a9", uri="/", algorithm=MD5, ' + 
		'response="71045d0e1925225054e2435599ad67f3", qop=auth, nc=00000001, ' +
		'cnonce="68f1a150020e0928"';

	// Initiates input request.
	var request = {headers : {authorization : header}};
	// Response mock(setHeader).
	var response = nodemock.ignore("setHeader");
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