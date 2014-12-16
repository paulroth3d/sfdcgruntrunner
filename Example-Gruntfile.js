/*global require, chalk, module*/
module.exports = function(grunt) {
	
	//-- update this to /path/to/grunt-sfdc-runner.js
	require( "./grunt-sfdc-runner.js" )(grunt);
	
	//-- override any configuration here as desired
	//-- see 
	grunt.config.merge({
		"uglify":{
			sfdc_uglify: {
				options: {
					mangle: false
				}
			}
		}
	});
};