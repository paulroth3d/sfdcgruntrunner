/*global require, chalk, module*/
module.exports = function(grunt) {
	
	//-- update this to /path/to/tasks folder
	grunt.loadTasks( '../sfdcgruntrunner/tasks' );
	
	//-- update this to /path/to/grunt-sfdc-runner.js
	require( "../sfdcgruntrunner/grunt-sfdc-runner.js" )(grunt);
	
	//-- override any configuration here as desired
	//-- see following for a list of jshint options - http://jshint.com/docs/options
	//-- NOTE: the files combined and ordering are within the package.xml file
	/** Example config setting.
	grunt.config.merge({
		"jshint":{
			"options":{
				node:true,
				newcap:false
			}
		},
		"uglify":{
			sfdc_uglify: {
				options: {
					mangle: false
				}
			}
		}
	});
	*/
};