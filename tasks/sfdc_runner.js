/**
 *  Test template that takes a set of paths as parameters and tries determining
 *  what should be run from grunt.
**/
/*global grunt, module */
'use strict';

module.exports = function(grunt){
	
	function ZipResource( filePath ){
		this.filePath = filePath;
		this.resourceName = '';
		this.resourceFullname = '';
		this.resourcePath = '';
		this.isZipResource = false;
		
		this.parsePath = function(){
			this.isZipResource = true;
			
			var zipMatchStr = grunt.config.get( "pkg.sfdc_runner.resourceFolderPattern" );
			if( !zipMatchStr ){
				//-- @TODO: move to constant file, as it is a default
				zipMatchStr = "resources/([\\w_ ]+)/";
			}
			var zipMatch = new RegExp( zipMatchStr );
			//grunt.log.writeln( "zipMatch:" + zipMatch );
			
			var m = this.filePath.match( zipMatch );
			this.isZipResource = ( m ? true : false );
			if( this.isZipResource ){
				this.resourceFullName = m[1];
				
				//-- remove _zip from the end of the resource name, to provide a clearer resourceName
				this.resourceName = this.resourceFullName.replace( /_zip$/,'' );
				
				this.resourcePath = this.filePath.substr(0,filePath.indexOf(this.resourceName));
			}
		};
		
		this.resourceFullPath = function(){
			return( this.isZipResource ? '' + this.resourcePath + this.resourceFullName : '' );
		};
		
		this.parsePath();
		
		return( this );
	}
	
	function returnZipResources( listOfFiles ){
		var results = {},
			i = 0,
			resource = null;
		
		if( listOfFiles ){
			for( ; i < listOfFiles.length; i++ ){
				resource = new ZipResource( listOfFiles[i] );
				if( resource.isZipResource ){
					results[ resource.resourceName ] = resource;
				}
			}
		}
		
		return( results );
	}
	
	function returnJSHintPaths( resources ){
		var results = [],
			i = 0;
		if( resources && resources.length ){
			for( ; i < resources.length; i++ ){
				if( resources[i].isZipResource ){
					results.push( resources[i].resourceFullPath() + '/**/*.js' );
					results.push( '!' + resources[i].resourceFullPath() + '/**/*-min.js' );
				}
			}
		}
		
		//grunt.log.writeln( "jshintPath:" + JSON.stringify( results ) );
		return( results );
	}
	
	function prefixConcatConfig( config, resource, results ){
		
		if( !results ){
			results = {};
		}
		
		var resourcePath = resource.resourceFullPath();
		
		//grunt.log.writeln( 'config:' + JSON.stringify( config ) );
		
		var prop = null,
			val = null,
			i = 0,
			result = null;
		
		if( config ){
			for( prop in config ){
				val = config[prop];
				//grunt.log.writeln( "checking prop[" + prop + "]:" + val );
				if( grunt.util._.isArray( val ) ){
					result =[];
					
					for( i = 0; i < val.length; i++ ){
						result.push( '' + resourcePath + '/' + val[i] );
						//-- always ignore min files in concatenation
						result.push( '!' + resourcePath + '/**/*-min.js' );
					}
					
					prop = prop.replace( /\[resource\]/gi, resource.resourceName );
					
					results[ '' + resourcePath + '/' + prop ] = result;
				}
			}
		}
		
		return( results );
	}
	
	function returnConcatResources( resources ){
		var results = {},
			i = 0,
			resource = null,
			result = null,
			src = null,
			target = null,
			config = null;
			
		var DEFAULT_CONFIG = grunt.config.get( "pkg.sfdc_runner.concat.DEFAULT" );
		
		if( resources ){
			for( ; i < resources.length; i++ ){
				if( resources[i].isZipResource ){
					resource = resources[i];
					
					config = grunt.config.get( "pkg.sfdc_runner.concat." + resource.resourceName );
					//grunt.log.writeln( "config:" + ( config ? JSON.stringify( config ) : 'null' ) );
					//grunt.log.writeln( "default:" + ( DEFAULT_CONFIG ? JSON.stringify( DEFAULT_CONFIG ) : 'null' ));
					
					if( !config ){
						if( DEFAULT_CONFIG ){
							config = DEFAULT_CONFIG;
						} else {
							config = { '[resource]-min.js' : ['**/*.js'] };
						}
					}
					prefixConcatConfig( config, resource, results );
				}
			}
		}
		
		//grunt.log.writeln( 'concat args:' + JSON.stringify( results ) );
		
		return( results );
	}
	
	function returnUglifyResources( combinedResources ){
		//-- combine
		var results = {},
			val = null,
			prop = null,
			resource = null;
			
		//grunt.log.writeln( "combinedResources:" + JSON.stringify( combinedResources ) );
			
		if( combinedResources ){
			for( prop in combinedResources ){
				val = combinedResources[prop];
				if( grunt.util._.isArray( val ) ){
					results[ prop ] = [ prop ];
				}
			}
		}
		
		//grunt.log.writeln( 'uglify resources:' + JSON.stringify( results ) );
		
		return( results );
	}
	
	grunt.registerTask( 'sfdc_runner','[description]', function(){
		
		var fileList = grunt.config.get( "sfdc_runner.files" );
		//grunt.log.writeln( "checking files:" + fileList );
		
		var resourceList = returnZipResources( fileList );
		
		var jshintList = [];
		var concatConfig = {};
		var uglifyConfig = {};
		var resources = grunt.util._.values( resourceList );
		//grunt.log.writeln( "resources:" + JSON.stringify( resources ));
		
		jshintList = returnJSHintPaths( resources );
		//grunt.log.writeln( "jshintPaths:" + jshintList );
		grunt.config( "jshint.build", jshintList );
		
		concatConfig = returnConcatResources( resources );
		//grunt.log.writeln( "concatConfig:" + JSON.stringify( concatConfig ) );
		grunt.config( "concat.basic_and_extras.files", concatConfig );
		
		//-- minify all combined files
		uglifyConfig = returnUglifyResources( concatConfig );
		//grunt.log.writeln( "uglifyConfig:" + JSON.stringify( uglifyConfig ));
		grunt.config( "uglify.sfdc_uglify.files", uglifyConfig );
		
		//grunt.log.writeln('completed[' + this.name + '][' + arguments.length + ']').ok();
	});
};