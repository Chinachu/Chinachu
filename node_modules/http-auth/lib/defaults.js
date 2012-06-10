/**
 * Module for default setups.
 */
module.exports = {
	/**
	 * Default HTML for not authorized page.
	 */
	'HTML_401' : "<!DOCTYPE html>\n<html><head><title>401 Unauthorized</title></head><body><h1>401 "
	 	+ "Unauthorized</h1><p>This page requires authorization.</p></body></html>",
	/**
	 * Nonce expire timeout.
	 */
	'NONCE_EXPIRE_TIMEOUT' : 3600000,
	/**
	 * Default algorithm for Digest Access Authentication.
	 */
	'DEFAULT_ALGO' : 'MD5'
};