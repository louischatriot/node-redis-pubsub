const redis = require('redis')
const noop = () => {}

/**
 * Create a new NodeRedisPubsub instance that can subscribe to channels and publish messages
 * @param {Object} options Options for the client creations:
 *                 port - Optional, the port on which the Redis server is launched.
 *                 scope - Optional, two NodeRedisPubsubs with different scopes will not share messages
 *                 url - Optional, a correctly formed redis connection url
 */
class NodeRedisPubsub {
  constructor(opts) {
    const options = Object.assign({}, { port: 6379, host: '127.0.0.1' }, opts)
    const { auth = null, redisUrl = null } = options

    if (!redisUrl) {
      this.emitter = redis.createClient(options)
      this.receiver = redis.createClient(options)
    } else {
      delete options.url
      this.emitter = redis.createClient(redisUrl, options)
      this.receiver = redis.createClient(redisUrl, options)
    }

    if (auth) {
      this.emitter.auth(auth)
      this.receiver.auth(auth)
    }

    this.receiver.setMaxListeners(0)
    this.prefix = options.scope ? options.scope + ':' : ''
  }

  /**
   * Return the emitter object to be used as a regular redis client to save resources.
   */
  getRedisClient() {
    return this.emitter
  }

  /**
   * Subscribe to a channel
   * @param {String} channel The channel to subscribe to, can be a pattern e.g. 'user.*'
   * @param {Function} handler Function to call with the received message.
   * @param {Function} cb Optional callback to call once the handler is registered.
   *
   */
  on(channel, handler, callback = noop) {
    if (channel === 'error') {
      this.errorHandler = handler
      this.emitter.on('error', handler)
      this.receiver.on('error', handler)
      callback()
      return
    }

    const fullChannel = `${this.prefix}${channel}`

    const pmessageHandler = (pattern, channel, message) => {
      if (fullChannel !== pattern) return

      try {
        return handler(JSON.parse(message), channel)
      } catch (ex) {
        if (typeof this.errorHandler === 'function') {
          return this.errorHandler(`Invalid JSON received! Channel: ${fullChannel} Message: ${message}`)
        }
      }
    }

    this.receiver.on('pmessage', pmessageHandler)
    this.receiver.psubscribe(fullChannel, callback)

    const removeListener = callback => {
      this.receiver.removeListener('pmessage', pmessageHandler)
      return this.receiver.punsubscribe(fullChannel, callback)
    }

    return removeListener
  }

  subscribe(channel, handler, callback = noop) {
    return this.on(channel, handler, callback)
  }

  off(channel, callback = noop) {
    return this.receiver.punsubscribe(`${this.prefix}${channel}`, callback)
  }

  /**
   * Emit an event
   * @param {String} channel Channel on which to emit the message
   * @param {Object} message
   */
  emit(channel, message) {
    return this.emitter.publish(`${this.prefix}${channel}`, JSON.stringify(message))
  }

  publish(channel, message) {
    return this.emit(channel, message)
  }

  /**
   * Safely close the redis connections 'soon'
   */
  quit() {
    this.emitter.quit()
    this.receiver.quit()
  }

  /**
   * Dangerously close the redis connections immediately
   */
  end() {
    this.emitter.end()
    this.receiver.end()
  }
}
module.exports = NodeRedisPubsub
