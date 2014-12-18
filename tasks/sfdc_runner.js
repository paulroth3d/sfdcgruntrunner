/**
 *  Test template that takes a set of paths as parameters and tries determining
 *  what should be run from grunt.
**/
/*global grunt, module */
'use strict';

module.exports = function(grunt){
	
	/**
	 *  Internal class to represent a zip static resource.
	 *  @TODO allow combining of file changes to specify types (js|css|image|etc)
	**/
	function StaticResource( filePath ){
		/** full path of the file **/
		this.filePath = filePath;
		/** Name of the static resource **/
		this.resourceName = '';
		/** Folder name of the static resource **/
		this.resourceFullname = '';
		/** path leading to the static resource **/
		this.resourcePath = '';
		/** Whether the resource is a Zip resource **/
		this.isZipResource = false;
		/** Type of file changed **/
		this.changeType = null;
		
		/**
		 *  Initializes the file changed to verify it is a zipped resource,
		 *  and initializes all paramters off of that.
		**/
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
		
		/**
		 *  Determines the full path of the static resource folder (not the file)
		 *  @return (String)
		**/
		this.resourceFullPath = function(){
			return( this.isZipResource ? '' + this.resourcePath + this.resourceFullName : '' );
		};
		
		this.parsePath();
		
		return( this );
	}
	
	/**
	 *  Looks through the list of changed files, and determines the minimal set
	 *  of static resources that should be processed.
	 *  @param listOfFiles (String[]) - array of paths changed
	 *  @return StaticResource[]
	**/
	function findZipResources( listOfFiles ){
		var results = {},
			i = 0,
			resource = null;
		
		if( listOfFiles ){
			for( ; i < listOfFiles.length; i++ ){
				resource = new StaticResource( listOfFiles[i] );
				if( resource.isZipResource ){
					results[ resource.resourceName ] = resource;
				}
			}
		}
		
		return( results );
	}
	
	/**
	 *  Configures the JSHint task on the next run.
	 *  @param resources (StaticResource[])
	 *  @return (String[]) - set of paths to be run by th jsHint task
	**/
	function configJSHintOptions( resources ){
		var results = [],
			i = 0;
		if( resources && resources.length ){
			for( ; i < resources.length; i++ ){
				if( resources[i].isZipResource ){
					results.push( resources[i].resourceFullPath() + '/**/*.js' );
					
					results.push( '!' + resources[i].resourceFullPath() + '/**/*-min.js' );
					results.push( '!' + resources[i].resourceFullPath() + "/vendor/**/*.js" );
					results.push( '!' + resources[i].resourceFullPath() + "/js/vendor/**/*.js" );
					results.push( '!' + resources[i].resourceFullPath() + "/bower_components/**/*.js" );
				}
			}
		}
		
		grunt.config( "jshint.build", results );
		//grunt.log.writeln( "jshintPath:" + JSON.stringify( results ) );
		
		return( results );
	}
	
	/**
	 *  Prefixes a concat configuration with the absolute path of the resource.
	 *  (This is due to concat not supporting wildcards for folders)
	 *  @param config (Object) { 'path/min-file.name.js' : [ 'array','of','file patterns to be included' ] }
	 *  @param resource (StaticResource)
	 *  @param results (Object) { 'path/min-file.name.js' : [ 'array','of','file patterns to be included' ] }
	**/
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
	
	/**
	 *  Configures the concat task for next run.
	 *  @param resources (StaticResource[])
	 *  @return (Object) {'path/min-file.name.js' : [ 'array','of','file patterns to be included' ] }
	**/
	function configConcatOptions( resources ){
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
		
		grunt.config( "concat.basic_and_extras.files", results );
		//grunt.log.writeln( 'concat args:' + JSON.stringify( results ) );
		
		return( results );
	}
	
	/**
	 *  Configures Uglify task for next run.
	 *  Note: this usees the results from combine, as only combined files should be
	 *  minified (for now)
	 *  @param combineResourceList (Object) - result from combine.
	**/
	function configUglifyOptions( combinedResources ){
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
		grunt.config( "uglify.sfdc_uglify.files", results );
		//grunt.log.writeln( "uglifyConfig:" + JSON.stringify( uglifyConfig ));
		
		return( results );
	}
	
	/** Actual Task run **/
	grunt.registerTask( 'sfdc_runner','[description]', function(){
		
		var fileList = grunt.config.get( "sfdc_runner.files" );
		//grunt.log.writeln( "checking files:" + fileList );
		
		var resourceList = findZipResources( fileList );
		
		var jshintList = [];
		var concatConfig = {};
		var uglifyConfig = {};
		var resources = grunt.util._.values( resourceList );
		//grunt.log.writeln( "resources:" + JSON.stringify( resources ));
		
		jshintList = configJSHintOptions( resources );
		
		concatConfig = configConcatOptions( resources );
		
		//-- minify all combined files
		uglifyConfig = configUglifyOptions( concatConfig );
		
		
		//grunt.log.writeln('completed[' + this.name + '][' + arguments.length + ']').ok();
	});
};