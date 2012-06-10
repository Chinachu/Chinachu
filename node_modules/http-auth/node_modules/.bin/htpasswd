#!/usr/bin/env node

/**
 * htpasswd module.
 */
var htpasswd = require('htpasswd');

try {
	// Parses and processes command line arguments.
	htpasswd.parseInput(process.argv);
	htpasswd.process();
} catch (error) {
	// If arguments are not valid prints usage.
	htpasswd.usage();
}