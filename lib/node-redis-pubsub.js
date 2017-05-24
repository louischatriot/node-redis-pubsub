"use strict";
var redis = require('redis');

/**
 * Create a new NodeRedisPubsub instance that can subscribe to channels and publish messages
 * @param {Object} options Options for the client creations:
 *                 port - Optional, the port on which the Redis server is launched.
 *                 scope - Optional, two NodeRedisPubsubs with different scopes will not share messages
 *                 url - Optional, a correctly formed redis connection url
 */
function NodeRedisPubsub(options){
  if (!(this instanceof NodeRedisPubsub)){ return new NodeRedisPubsub(options); }

  if(!options)
    options = {};

  var auth = options.auth;
  var redisUrl = options.url;

  options.port = options.port || 6379;   // 6379 is Redis' default
  options.host = options.host || '127.0.0.1';

  // Need to create two Redis clients as one cannot be both in receiver and emitter mode
  // I wonder why that is, by the way ...
  if (!redisUrl) {
    this.emitter  = redis.createClient(options);
    this.receiver = redis.createClient(options);
  } else {
    delete options.url;
    this.emitter  = redis.createClient(redisUrl, options);
    this.receiver = redis.createClient(redisUrl, options);
  }

  if(auth){
    this.emitter.auth(auth);
    this.receiver.auth(auth);
  }

  this.receiver.setMaxListeners(0);
  this.prefix = options.scope ? options.scope + ':' : '';
  this.channelRefCountMap = new ChannelRefCountMap();
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
      try{
        return handler(JSON.parse(message), _channel); 
      } catch (ex){
        if(typeof self.errorHandler === 'function'){
          return self.errorHandler("Invalid JSON received! Channel: " + self.prefix + channel + " Message: " + message);
        }
      } 
    }
  };

  this.receiver.on('pmessage', pmessageHandler);
  this.receiver.psubscribe(this.prefix + channel, callback);
  this.channelRefCountMap.increment(this.prefix + channel);

  var removeListener = function(callback){
    self.receiver.removeListener('pmessage', pmessageHandler);
    if (self.channelRefCountMap.decrement(self.prefix + channel)){
      return self.receiver.punsubscribe(self.prefix + channel, callback);
    }
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
  this.emitter.end();
  this.receiver.end();
};


/**
 * Create a map that stores how many listeners we have for each pattern we subscribed on.
 */
function ChannelRefCountMap(){
  this.map = {};
}

/**
 * Increment by 1 the ref count of that channel
 * @param {String} channel Channel of which to increment the ref count
 */
ChannelRefCountMap.prototype.increment = function(channel){
  if (!this.map[channel]){
    this.map[channel] = 1;
  } else {
    this.map[channel] = this.map[channel] + 1;
  }
};

/**
 * Decrement by 1 the ref count of that channel
 * @param {String} channel Channel of which to decrement the ref count
 * @return {bool} true if the ref count has reached zero, false otherwise.
 */
ChannelRefCountMap.prototype.decrement = function(channel){
  if (!this.map[channel]){
    throw new Error("Trying to decrement ref count of channel '" + channel + "' more times than it was incremented.");
  }

  this.map[channel] = this.map[channel] - 1;

  if (this.map[channel] === 0){
    delete this.map[channel];
    return true;
  } else {
    return false;
  }
};

module.exports = NodeRedisPubsub;
