var Cache = require('./index')
var cache = new Cache();

cache.load('xpto', function(err, data) {
	
	// We have it in cache!
	if(data) {
		
		console.log(data);
		
	}//if
	// We still don't have it in cache
	else {
		
		var someData = [ 0, 1, 2, 3, 4 ];
		cache.save('xpto', someData, { tags: [ "awesome" ], expire: { minutes: 10 } }, function(err, savedData) {
			
			console.log(err);
			
		});
		
	}//else
	
});

// Remove a specific key
// cache.remove('xpto', function(err) {});
// Remove by one or more tags
// cache.clean({ tags: [ "awesome" ] }, function(err) {});
