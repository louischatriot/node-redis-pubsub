var redis = require('redis')
  ;


/**
 * Create a new NodeRedisPubsub instance that can subscribe to channels and publish messages
 * @param {Object} options Options for the client creations:
 *                 port - Optional, the port on which the Redis server is launched.
 *                 scope - Optional, two NodeRedisPubsubs with different scopes will not share messages
 */
function NodeRedisPubsub (options) {
  var port = options && options.port || 6379;   // 6379 is Redis' default
  var host = options && options.host || '127.0.0.1';
  var auth = options && options.auth

  // Need to create two Redis clients as one cannot be both in receiver and emitter mode
  // I wonder why that is, by the way ...
  this.emitter = redis.createClient(port);
  this.receiver = redis.createClient(port);

  if (auth) {
      this.emitter.auth(auth)
      this.receiver.auth(auth)
  }
  
  this.receiver.setMaxListeners(0);

  this.prefix = options.scope ? options.scope + ':' : '';
}


/**
 * Subscribe to a channel
 * @param {String} channel The channel to subscribe to, can be a pattern e.g. 'user.*'
 * @param {Function} handler Function to call with the received message.
 * @param {Function} cb Optional callback to call once the handler is registered.
 *
 */
NodeRedisPubsub.prototype.on = function(channel, handler, cb) {
  var callback = cb || function () {}
    , self = this;

  this.receiver.on('pmessage', function (pattern, _channel, message) {
    if (self.prefix + channel === pattern) {
      handler(JSON.parse(message));
    }
  });

  this.receiver.psubscribe(this.prefix + channel, callback);
};


/**
 * Emit an event
 * @param {String} channel Channel on which to emit the message
 * @param {Object} message
 */
NodeRedisPubsub.prototype.emit = function (channel, message) {
  this.emitter.publish(this.prefix + channel, JSON.stringify(message));
};


module.exports = NodeRedisPubsub;
