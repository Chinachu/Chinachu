"use strict";

var os     = require('os');
var fs     = require('fs');
var should = require('should');

var chinachu = require('chinachu-common');

var testDataPath = os.tmpDir() + '/chinachu-test-' + new Date().getTime() + '.json';

describe('(init)', function() {
	
	var testData = {
		a: 0,
		b: 1,
		c: '',
		d: 'string',
		e: null,
		f: {},
		g: { a: 0, b: 1, c: '', d: 'string', e: null, f: {}, h: [] },
		h: [],
		i: [ 0, 1, '', 'string', null, {}, [], , ]
	};
	
	it('create test data file', function() {
		fs.writeFileSync(testDataPath, JSON.stringify(testData));
	});
});

describe('jsonWatcher', function() {
	
	var test = null;
	
	it('read', function(done) {
		
		chinachu.jsonWatcher(testDataPath, function(err, data, msg) {
			should.strictEqual(null, err);
			
			test = data;
			
			should.exist(test);
			
			done();
		}, { now: true });
	});
	
	it('validate', function() {
		
		should.strictEqual(test.a, 0);
		should.strictEqual(test.b, 1);
		should.strictEqual(test.c, '');
		should.strictEqual(test.d, 'string');
		should.strictEqual(test.e, null);
	});
	
	it('watch');
});

describe('(clean up)', function() {
	
	it('remove test data file', function() {
		fs.unlinkSync(testDataPath);
	});
});