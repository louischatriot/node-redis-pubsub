NRP (Node Redis Pubsub)
=================

**This library is now mainly maintained by @rangermauve and @narcisoguillen**

Simple pubsub for node using Redis. Why use NRP instead of Node's EventEmitter? It is useful when
your Node application needs to share data with other applications. In that case EventEmitter will not
help you, you need an external pubsub provider. Redis is pretty good at this, but its pubsub API
is strange. So you use this wrapper.

## Install and test
```bash
$ npm install node-redis-pubsub      # Install locally
$ npm install -g node-redis-pubsub   # Install globally
$
$ make test   # test (devDependencies need to be installed and a Redis server up)
```

## Usage
### Setup
for a trusted environment where Redis runs locally, unprotected on a port blocked by firewall.

```javascript
var NRP    = require('node-redis-pubsub');
var config = {
  port  : 6379  , // Port of your locally running Redis server
  scope : 'demo'  // Use a scope to prevent two NRPs from sharing messages
};

var nrp = new NRP(config); // This is the NRP client
```

for a remote Redis server

```javascript
var NRP = require('node-redis-pubsub');

var config = {
  port: 1234                        , // Port of your remote Redis server
  host: 'path.to.remote.redis.host' , // Redis server host, defaults to 127.0.0.1
  auth: 'password'                  , // Password
  scope: 'demo'                       // Use a scope to prevent two NRPs from sharing messages
};

var nrp = new NRP(config); // This is the NRP client
```

heroku and other services provide you with an environment variable REDIS_URL

```javascript
var NRP = require('node-redis-pubsub');
var url = process.env.REDIS_URL;

var config = {
    url: url
};

var nrp = new NRP(config); // This is the NRP client
```

### Simple pubsub

```javascript
nrp.on('say hello', function(data){
  console.log('Hello ' + data.name);
});

nrp.emit('say hello', { name: 'Louis' });   // Outputs 'Hello Louis'

// You can use patterns to capture all messages of a certain type
// The matched channel is given as a second parameter to the callback
nrp.on('city:*', (data, channel) => {
  console.log(data.city + ' is great');
});

nrp.emit('city:hello' , { city: 'Paris' });         // Outputs 'Paris is great'
nrp.emit('city:yeah'  , { city: 'San Francisco' }); // Outputs 'San Francisco is great'
```

### Unsubscribe

```javascript
nrp.on('say hello', function(data){
  // Never called
});

nrp.off('say hello', [Callback]);
```

### Shut down connections

```javascript
// Safely (connections will be closed properly once all commands are sent)
nrp.quit();

// Dangerously (connections will be immediately terminated)
nrp.end();
```

### Listen for errors

```javascript
nrp.on("error", function(){
  // Handle errors here
});
```

## License

(The MIT License)

Copyright (c) 2012 tldr.io &lt;hello@tldr.io&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
