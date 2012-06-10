#!/usr/bin/env node

/**
 * htdigest module.
 */
var htdigest = require('htdigest');

try {
	// Parses and processes command line arguments.
	htdigest.parseInput(process.argv);
	htdigest.process();
} catch (error) {
	// If arguments are not valid prints usage.
	htdigest.usage();
}