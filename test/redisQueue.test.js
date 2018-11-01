var chai = require('chai')
  , conf = { port: 6379, scope: 'onescope' }
  , conf2 = { port: 6379, scope: 'anotherscope' }
  , conf3 = { url: 'redis://127.0.0.1:6379/', scope: 'yetanotherscope' }
  , NodeRedisPubsub = require('../index')
  , sinon = require("sinon")
  , sinonChai = require("sinon-chai")
  ;

chai.should();
chai.use(sinonChai)

describe('Node Redis Pubsub', function () {

  it('Should send and receive standard messages correctly', function (done) {
    var rq = new NodeRedisPubsub(conf);

    rq.on('a test', function (data, channel) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
      channel.should.equal("onescope:a test");
      done();
    }
    , function () {
        rq.emit('a test', { first: 'First message'
                            , second: 'Second message' });
      });

      after(function(){
        rq.end();
      });
  });

  it('Should send and receive standard messages correctly via url configuration', function (done) {
    var rq = new NodeRedisPubsub(conf3);

    rq.on('a test', function (data, channel) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
      channel.should.equal("yetanotherscope:a test");
      done();
    }
    , function () {
        rq.emit('a test', { first: 'First message'
                            , second: 'Second message' });
      });
    
    after(function(){
      rq.end();
    });
  });

  it('Should receive pattern messages correctly', function (done) {
    var rq = new NodeRedisPubsub(conf);

    rq.on('test:*', function (data, channel) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
      channel.should.equal("onescope:test:created");
      done();
    }
    , function () {
        rq.emit('test:created', { first: 'First message'
                            , second: 'Second message' });
      });

    after(function(){
      rq.end();
    });
  });

  it('Should only receive messages for his own scope', function (done) {
    var rq = new NodeRedisPubsub(conf)
      , rq2 = new NodeRedisPubsub(conf2)
      ;

    rq.on('thesame', function (data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
      rq2.emit('thesame', { third: 'Third message' });
    }
    , function () {
        rq2.on('thesame', function (data) {
          data.third.should.equal('Third message');   // Tests would fail here if rq2 received message destined to rq
          done();
        }, function () {
          rq.emit('thesame', { first: 'First message'
                             , second: 'Second message' });
        });
      });

    after(function(){
      rq.end();
      rq2.end();
    });
  });

  // should re-write this test
  // it('Should have the ability to unsubscribe', function (done) {
  //   var rq     = new NodeRedisPubsub();
  //   var called = false;

  //   rq.should.have.property('off');
  //   rq.on('a test', function (data){
  //     called = true;
  //   }, function(){
  //     rq.off('a test');
  //     rq.emit('a test', { });
  //   });

  //   setTimeout(function(){
  //     called.should.be.false;
  //     done();
  //   }, 10);

  // });

  
  it('Should gracefully handle invalid JSON message data', function (done) {
    var rq = new NodeRedisPubsub(conf);

    rq.on('error', function (err) {
      err.should.include('Invalid JSON received!');
      done();
    });
    rq.on('b test', function (data, channel){
      channel.should.equal("onescope:b test");
      //data.should.equal({});
      var invalidJSON = 'hello';
      rq.emitter.publish(channel, invalidJSON);
    }
    , function () {
        var validJSON = {};
        rq.emit('b test', validJSON);
      });

    after(function(){
      rq.end();
    });
  });
  
  it('Should be able to handle non JSON message data', function(done) {
    var rq = new NodeRedisPubsub(conf);

    rq.on('non-json-msg', function(data, channel){
      channel.should.equal('onescope:non-json-msg');
      data.should.equal('non-json-txt');
      done();
    },
    function() {
      rq.emit('non-json-msg', 'non-json-txt');
    });
  });


  describe("When shutting down connections", function () {
    var sandbox, rq;
    before(function () {
      rq = new NodeRedisPubsub();
      sandbox = sinon.sandbox.create();
      sandbox.stub(rq.emitter, "quit");
      sandbox.stub(rq.receiver, "quit");
      sandbox.stub(rq.emitter, "end");
      sandbox.stub(rq.receiver, "end");
    });
    after(function () {
      sandbox.restore();
      rq.end();
    });

    it('Should safely shut down the connections', function () {
      rq.quit();
      rq.emitter.quit.should.have.been.calledOnce;
      rq.receiver.quit.should.have.been.calledOnce;
    });

    it('Should dangerously shut down the connections', function () {
      rq.end();
      rq.emitter.end.should.have.been.calledOnce;
      rq.receiver.end.should.have.been.calledOnce;
    });

  });

  

});
