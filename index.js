/**
 * Module dependencies
 */

var 	_ = require('lodash'),
		async = require('async'),
		className = 'CacheIt'
		;

var CacheIt = module.exports = function(options) {
	
	if(!(this instanceof CacheIt)) return new CacheIt(options);
	
	var that = this;
	
	this.options = _.defaults(options || {}, this.options);
	
	if(this.options.client) {
		
		this.client = this.options.client;
		
	}//if
	else {
		
		var redis = require("redis");
		
		this.client = redis.createClient();
		this.client.on("error", function(err) {
			
			console.log("Error " + err);
			
		});
		
	}//else
	
	if(this.options.auth) {
		
		this.auth = this.options.auth;
		
		this.client.auth(this.auth, function(err) {});
		
	}//if
	
};

CacheIt.ALL = 'all';

CacheIt.prototype.load = function(key, callback) {
	var that = this;
	
	this.client.get(className+"_"+key+"_meta", function(err, meta) {
		
		if(!err && meta) {
			
			try {
				
				meta = JSON.parse(meta);
				
				if(typeof meta.expire == "string") meta.expire = new Date(meta.expire);
				
			} catch(err) {
				
				console.log("Error load meta " + err);
				meta = null;
				
			};
			
		}//if
		else {
			
			meta = null;
			
		}//else
		
		that.client.get(className+"_"+key, function(err, data) {
			
			if(!err && data) {
				
				try {
					
					data = JSON.parse(data);
					
				} catch(err) {
					
					console.log("Error load " + err);
					data = null;
					
				};
				
			}//if
			else {
				
				data = null;
				
			}//else
			
			var now = new Date();
			
			// Cached data expired
			if(meta && meta.expire && meta.expire.getTime() - now.getTime() <= 0) {
				
				data = null;
				meta = null;
				
				that.client.del(className+"_"+key, function(err, res) {
					
					that.client.del(className+"_"+key+"_meta", function(err, res) {
						
						return callback(err, data);
						
					});
					
				});
				
			}//if
			else {
				
				meta = null;
				
				return callback(err, data);
				
			}//else
			
		});
		
	});
	
};

CacheIt.prototype.save = function(key, data, meta, callback) {
	var that = this;
	
	this.client.set(className+"_"+key, JSON.stringify(data), function(err, res) {
		
		that.client.lpush(className+"_keys", className+"_"+key, function(err4, res4) {
			
			if(meta) {
				
				meta.tags = meta.tags ? meta.tags : [];
				
				if(meta.expire) {
					
					var now = new Date();
					if(meta.expire.years) {
						now.setTime(now.getTime() + 1000 * 60 * 60 * 24 * 30 * 364 * meta.expire.years);
					}//if
					if(meta.expire.months) {
						now.setTime(now.getTime() + 1000 * 60 * 60 * 24 * 30 * meta.expire.months);
					}//if
					if(meta.expire.days) {
						now.setTime(now.getTime() + 1000 * 60 * 60 * 24 * meta.expire.days);
					}//if
					if(meta.expire.hours) {
						now.setTime(now.getTime() + 1000 * 60 * 60 * meta.expire.hours);
					}//if
					if(meta.expire.minutes) {
						now.setTime(now.getTime() + 1000 * 60 * meta.expire.minutes);
					}//if
					if(meta.expire.seconds) {
						now.setTime(now.getTime() + 1000 * meta.expire.seconds);
					}//if
					
					meta.expire = now;
					
				}//if
				
				that.client.set(className+"_"+key+"_meta", JSON.stringify(meta), function(err2, res2) {
					
					async.forEach(meta.tags, function(tag, next) {
						
						that.client.lpush(className+"_"+tag, className+"_"+key, function(err, res) {
							
							return next();
							
						});
						
					}, function(err3) {
						
						return callback(err, res);
						
					});
					
				});
				
			}//if
			
		});
		
	});
	
};

CacheIt.prototype.clean = CacheIt.prototype.remove = function(key, callback) {
	
	var that = this;
	
	if(key == 'all') {
		
		var clearCache = function(cb) {
			
			that.client.lpop(className+"_keys", function(err, res) {
				
				if(err || !res) {
					
					return cb();
					
				}//if
				else {
					
					that.client.del(res, function(err, res) {
						
						that.client.del(res+"_meta", function(err, res) {
							
							return clearCache(cb);
							
						});
						
					});
					
				}//else
				
			});
		};
		
		clearCache(function() {
			
			if(typeof callback == "function") {	
				
				callback(null);
				
			}//if
			
		});
		
	}//if
	else if(typeof key == "string") {
		
		this.client.del(className+"_"+key, function(err, res) {
			
			that.client.del(className+"_"+key+"_meta", function(err, res) {
				
				if(typeof callback == "function") {	
					
					callback(null);
					
				}//if
				
			});
			
		});
		
	}//else if
	else if(typeof key == "object" && key.tags) {
		
		var clearCache = function(tag, cb) {
			
			that.client.lpop(className+"_"+tag, function(err, res) {
				
				if(err || !res) {
					
					return cb();
					
				}//if
				else {
					
					that.client.del(res, function(err, res) {
						
						that.client.del(res+"_meta", function(err, res) {
							
							return clearCache(tag, cb);
							
						});
						
					});
					
				}//else
				
			});
			
		};
		
		async.forEach(key.tags, function(tag, next) {
			
			clearCache(tag, function() {
				
				next();
				
			});
			
		}, function(err) {
			
			if(typeof callback == "function") {
				
				callback(err);
				
			}//if
			
		});
		
	}//else if
	else {
		
		if(typeof callback == "function") {
			
			return callback(null);
			
		}//if
		
	}//else
	
};
