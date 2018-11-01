"use strict";
var redis = require('redis');

function initClient(options) {
  var auth = options.auth;
  var redisUrl = options.url;
  var client;
  
  options.port = options.port || 6379;   // 6379 is Redis' default
  options.host = options.host || '127.0.0.1';

  if (!redisUrl) {
    client  = redis.createClient(options);
  } else {
    client  = redis.createClient(redisUrl, options);
  }

  if(auth){
    client.auth(auth);
  }
  
  return client;
}

/**
 * Create a new NodeRedisPubsub instance that can subscribe to channels and publish messages
 * @param {Object} options Options for the client creations:
 *                 port - Optional, the port on which the Redis server is launched.
 *                 scope - Optional, two NodeRedisPubsubs with different scopes will not share messages
 *                 emitter - Optional, a redis or reds_io client
 *                 receiver - Optionla, a redis or reds_io client
 *                 url - Optional, a correctly formed redis connection url
 */
function NodeRedisPubsub(options){
  if (!(this instanceof NodeRedisPubsub)){ return new NodeRedisPubsub(options); }
  
  options || (options = {});
  
  // accept connections / clients having the same interface as node_redis clients
  // Need to create two Redis clients as one cannot be both in receiver and emitter mode
  // I wonder why that is, by the way ...
  if(options.emitter) {
    this.emitter = options.emitter;
  } else {
    this.emitter = initClient(options);
  }
    
  if(options.receiver) {
    this.receiver = options.receiver;
  } else {
    this.receiver = initClient(options);
    this.receiver.setMaxListeners(0);
  }
  
  delete options.url;
  
  this.prefix = options.scope ? options.scope + ':' : '';
}

/**
 * Return the emitter object to be used as a regular redis client to save resources.
 */
NodeRedisPubsub.prototype.getRedisClient = function(){
  return this.emitter;
};

/**
 * Subscribe to a channel
 * @param {String} channel The channel to subscribe to, can be a pattern e.g. 'user.*'
 * @param {Function} handler Function to call with the received message.
 * @param {Function} cb Optional callback to call once the handler is registered.
 *
 */
NodeRedisPubsub.prototype.on = NodeRedisPubsub.prototype.subscribe = function(channel, handler, callback){
  if(!callback)
    callback = function(){};
  var self = this;

  if(channel === "error"){
    self.errorHandler = handler;
    this.emitter.on("error", handler);
    this.receiver.on("error", handler);
    callback();
    return;
  }

  var pmessageHandler = function(pattern, _channel, message){
    if(self.prefix + channel === pattern){ 
      var jsonmsg = message;
      try{
        jsonmsg = JSON.parse(message);
      } catch (ex){
        if(typeof self.errorHandler === 'function'){
          return self.errorHandler("Invalid JSON received! Channel: " + self.prefix + channel + " Message: " + message);
        }
      } 
      return handler(jsonmsg, _channel); 
    }
  };

  this.receiver.on('pmessage', pmessageHandler);

  this.receiver.psubscribe(this.prefix + channel, callback);

  var removeListener = function(callback){
    self.receiver.removeListener('pmessage', pmessageHandler);
    return self.receiver.punsubscribe(self.prefix + channel, callback);
  };

  return removeListener;
};

/**
 * Emit an event
 * @param {String} channel Channel on which to emit the message
 * @param {Object} message
 */
NodeRedisPubsub.prototype.emit = NodeRedisPubsub.prototype.publish = function (channel, message) {
  return this.emitter.publish(this.prefix + channel, JSON.stringify(message));
};

/**
 * Safely close the redis connections 'soon'
 */
NodeRedisPubsub.prototype.quit = function() {
  this.emitter.quit();
  this.receiver.quit();
};

/**
 * Dangerously close the redis connections immediately
 */
NodeRedisPubsub.prototype.end = function() {
  this.emitter.end(true);
  this.receiver.end(true);
};

module.exports = NodeRedisPubsub;
