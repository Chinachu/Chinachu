/**
 * Options module.
 */
var opt = require('../lib/options');

/**
 * Utils module.
 */
var utils = require('../lib/utils');

/**
 * Test for empty options.
 */
exports['testEmptyOptions'] = function (test) {
	// Checking for empty options.
	test.throws(function () { 
		opt(); 
	}, Error, "Must throw an error when options are empty!");
	// Test is done.
	test.done();
};

/**
 * Test for invalid authType.
 */
exports['testInvalidAuthType'] = function (test) {
	// Checking for invalid authType error.
	test.throws(function () { 
		opt({authType : 'some other type'}); 
	}, Error, "Must throw an error when authType is invalid!");
	// Test is done.
	test.done();
};

/**
 * Test for default authType.
 */
exports['testDefaultAuthType'] = function (test) {
	// Checking for default authType.
	var options = opt({
		authRealm : "Private area with digest access authentication.",
		authList : ['aa2sdas:s3sss', 'gi33ra:makaura']			
	});
	// Default authType check.
	test.equals(options.authType, 'basic', "Default authType must be basic!")
	// Test is done.
	test.done();
};


/**
 * Test for invalid algorithm.
 */
exports['testInvalidAlgo'] = function (test) {
	// Checking for invalid algorithm error.
	test.throws(function () { 
		opt({
			authRealm : "Private area with digest access authentication.",
			authList : ['asdasw:ssqss', 'gidra:maakura'],
			algorithm : 'monkeyCrypt'			
		}); 
	}, Error, "Must throw an error when algorithm is invalid!");	
	// Test is done.
	test.done();
};

/**
 * Test for default algorithm.
 */
exports['testDefaultAlgo'] = function (test) {
	// Checking for default algorithm.
	var options = opt({
		authRealm : "Private area with digest access authentication.",
		authList : ['aa2sdasa:s3s2ss', 'gi3q3ra:mwakaura']			
	});
	// Default algorithm check.
	test.equals(options.algorithm, 'MD5', "Default algorithm must be MD5!")
	// Test is done.
	test.done();
};

/**
 * Test for invalid realm.
 */
exports['testInvalidRealm'] = function (test) {
	// Checking for invalid realm error.
	test.throws(function () { 
		opt({
			authRealm : "",
			authList : ['asdasw:ssqss', 'gidra:maakura']	
		}); 
	}, Error, "Must throw an error when authRealm is empty!");	
	// Test is done.
	test.done();
};

/**
 * Test for empty authList.
 */
exports['testInvalidAuthList'] = function (test) {
	// Checking for invalid authList error.
	test.throws(function () { 
		opt({
			authRealm : "Some realm",
			authList : []			
		}); 
	}, Error, "Must throw an error when authList is empty!");	
	// Test is done.
	test.done();
};

/**
 * Test for valid authList - digest.
 */
exports['testValidAuthListDigest'] = function (test) {
	// Checking for valid authList.
	var options = opt({
		authRealm : "Some realm",
		authList : ['samvel:Some realm:a14d1baeb46dd3f44d177cd28331f921', 
					'karo:Some realm:24b0b93d4e91583f77ee6da31ebeebc8'],
		authType : 'digest'			
	});
	// Checking not empty.
	test.notEqual(options.authUsers, null, "authUsers must not be empty!");		
	// Checking for items.
	test.equals(options.authUsers['karo'], 'karo:Some realm:24b0b93d4e91583f77ee6da31ebeebc8', 
		"User item is wrong!");
	test.equals(options.authUsers['samvel'], 'samvel:Some realm:a14d1baeb46dd3f44d177cd28331f921', 
		"User item is wrong!");
	// Test is done.
	test.done();
};

/**
 * Test for valid authList - basic.
 */
exports['testValidAuthListBasic'] = function (test) {
	// Checking for valid authList.
	var options = opt({
		authRealm : "Some realm",
		authList : ['karo:seed', 'samvel:beed'],
		authType : 'basic'
	});
	// Checking not empty.
	test.notEqual(options.authUsers, null, "authUsers must not be empty!");		
	// Checking for items.
	test.equals(options.authUsers[0], 'karo:seed', "User item is wrong!");
	test.equals(options.authUsers[1], 'samvel:beed', "User item is wrong!");
	// Test is done.
	test.done();
};

/**
 * Test for valid authFile.
 */
exports['testValidAuthFile'] = function (test) {
	// Checking for valid authFile.
	var options = opt({
		authRealm : "Some realm",
		authList : ['karo:seed', 'samvel:beed'],
		authFile : __dirname + '/../examples/users.htpasswd',
		authType : 'basic'
	});
	// Checking not empty.
	test.notEqual(options.authUsers, null, "authUsers must not be empty!");		
	// Checking for items.
	test.equals(options.authUsers[0], 'Sarah:testpass', "User item is wrong!");
	test.equals(options.authUsers[1], 'John:itismypass', "User item is wrong!");
	test.equals(options.authUsers[2], 'Shanon:noneof', "User item is wrong!");
	test.equals(options.authUsers[3], 'Mike:pass123', "User item is wrong!");
	// Test is done.
	test.done();
};