/**
 *  Default grunt file for the sfdc-runner
 *  @author Paul Roth
 *  @version 1.0
 *  
 *  Assumes the following (at-very minimum)
 *  
 *  NOTE: package.json is VERY particular
 *  (You must use double quotes for all properties,
 *  single quotes/no-quotes will produce an error)
 *  
 *  from the package.json file:
 *  {
 *  	
 *  	"devDependencies" : {
 *  		"grunt-ant-sfdc": "^0.2.6",
 *  		"grunt-attention": "^1.0.0",
 *  		"grunt-cli": "^0.1.13",
 *  		"grunt-contrib-clean": "^0.6.0",
 *  		"grunt-contrib-compress": "^0.12.0",
 *  		"grunt-contrib-concat": "^0.5.0",
 *  		"grunt-contrib-copy": "^0.7.0",
 *  		"grunt-contrib-jshint": "^0.10.0",
 *  		"grunt-contrib-uglify": "^0.6.0",
 *  		"grunt-contrib-watch": "^0.6.1"
 *  	},
 *  	
 *  	"sfdc_runner": {
 *  		resourceExtension: '_zip',
 *  		
 *  		//-- OPTIONAL
 *  		concat: {
 *  			
 *  			//EX: (notice space introduced to avoid failure of comments
 *  			//pb_Foundation: {
 *  			//	'js/foundation-min.js' : ['js/foundation/ ** / *.js'],
 *  			//	'js/vendor-min.js' : ['js/vendor/ ** / *.js']
 *  			//}
 *  		}
 *  	}
 *  }
**/

//-- TODO: include more accurate troubleshooting
//-- if you run into an error run the following command:
//-- grunt watch --verbose

/*global grunt, module */
'use strict';

module.exports = function(grunt){
	
	grunt.initConfig({
		//-- loads the package.json file so we can use it within our config.
		"pkg": grunt.file.readJSON( "package.json" ),
		
		//-- concat options,  NOTE: files are updated with the runner
		"concat": {
			basic_and_extras: {
				options: {
					separator: ';'
				},
				files: []
			}
		},
		
		//-- jshint default options, NOTE: files are updated with the runner
		"jshint": {
			options: {
				globals: {
					jQuery: true,
					console: true,
					module: true,
					document: true,
					
					//-- defaults to ignoring any files under the vendor folder
					//-- to add in additional ignores, create a new file named
					//-- .jshintignore
					//-- with the paths (or patterns) of files that should be ignored
					ignores: ['*/**/vendor/**/*.js']
				}
			},
			build: []
		},
		
		"uglify": {
			sfdc_uglify: {
				options: {
					mangle: false,
					sourceMap: true
				}
			}
		},
		
		//-- defaults for the sfdc_runner
		"sfdc_runner": {
			//-- list of files to be run against, NOTE: files are updated with the runner
			files: []
			
			//-- use properties from package.json
			//--   concat
			//--   resourcesPath
		},
		
		//-- watcher
		watch: {
			files: ['<%= pkg.sfdc_runner.resourcesPath %>/**/*.js'],
			tasks: 'sfdc_watch',
			options: {
				spawn: false
			}
		}
	});
	
	var changedFiles = Object.create(null);
	var onDebounce = grunt.util._.debounce( function(){
		//grunt.log.writeln( "onDebounce called" );
		//grunt.log.writeln( "[" + grunt.util._.keys( changedFiles ) + "]" );
		grunt.config( "sfdc_runner.files", grunt.util._.keys( changedFiles ) );
		changedFiles = Object.create(null);
	}, 200 );
	
	grunt.event.on( 'watch', function( action, filePath ){
		changedFiles[ filePath ] = action;
		//onChange();
		//grunt.config( 'filesTest.files', filePath + "," + grunt.util._.isString( filePath ) );
		
		onDebounce();
	});
	
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-concat' );
	grunt.loadNpmTasks( 'grunt-contrib-uglify' );
	
	grunt.registerTask( 'sfdc_watch', ['sfdc_runner','jshint', 'concat', 'uglify' ] );
};