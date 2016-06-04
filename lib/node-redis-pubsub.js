"use strict";
var redis = require('redis');

/**
 * Create a new NodeRedisPubsub instance that can subscribe to channels and publish messages
 * @param {Object} options Options for the client creations:
 *                 port - Optional, the port on which the Redis server is launched.
 *                 scope - Optional, two NodeRedisPubsubs with different scopes will not share messages
 */
function NodeRedisPubsub(options){
  if (!(this instanceof NodeRedisPubsub)){ return new NodeRedisPubsub(options); }

  if(!options)
    options = {};

  var auth = options.auth;

  options.port = options.port || 6379;   // 6379 is Redis' default
  options.host = options.host || '127.0.0.1';

  // Need to create two Redis clients as one cannot be both in receiver and emitter mode
  // I wonder why that is, by the way ...
  this.emitter  = redis.createClient(options);
  this.receiver = redis.createClient(options);

  if(auth){
    this.emitter.auth(auth);
    this.receiver.auth(auth);
  }

  this.receiver.setMaxListeners(0);
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

  if(event === "error"){
    this.emitter.on("error", handler);
    this.receiver.on("error", handler);
    callback();
    return;
  }

  this.receiver.on('pmessage', function(pattern, _channel, message){
    if(self.prefix + channel === pattern){ handler(JSON.parse(message), _channel); }
  });

  this.receiver.psubscribe(this.prefix + channel, callback);
};

/**
 * Subscribe to error events, so they are catched and no more unhandled exceptions
 * We attach to both clients and buffer errors that occur within 10ms. That way some errors might disappear but connection errors wo
n't fire twice.
 * @param {Function} handler Function to call on error
 */
NodeRedisPubsub.prototype.onError = function (handler) {
        // prevent error events from firing twice

        var bufferTimer;
        var bufferedHandler = function (err) {
                if(bufferTimer) {
                        clearTimeout(bufferTimer);
                }

                bufferTimer = setTimeout(function () {
                        handler(err);
                },10);
        }

        this.emitter.on('error', bufferedHandler);
        this.receiver.on('error', bufferedHandler);
}

/**
 * Unsubscribe to a channel
 * @param {String} channel The channel to unsubscribe to, can be a pattern e.g. 'user.*'
 * @param {Function} callback Optional callback to call once the handler is unregistered.
 *
 */
NodeRedisPubsub.prototype.off = NodeRedisPubsub.prototype.unsubscribe = function(channel, callback) {
  return this.receiver.punsubscribe(this.prefix + channel, callback);
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

module.exports = NodeRedisPubsub;
