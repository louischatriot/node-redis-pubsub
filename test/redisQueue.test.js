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
  });

  it('Should have the avility to unsubscribe', function (done) {
    var rq     = new NodeRedisPubsub();
    var called = false;

    rq.should.have.property('off');
    rq.on('a test', function (data){
      called = true;
    }, function(){
      rq.off('a test');
      rq.emit('a test', { });
    });

    setTimeout(function(){
      called.should.be.false;
      done();
    }, 10);

  });

  describe("When shutting down connections", function () {
    var sandbox, rq;
    beforeEach(function () {
      rq = new NodeRedisPubsub();
      sandbox = sinon.sandbox.create();
      sandbox.stub(rq.emitter, "quit");
      sandbox.stub(rq.receiver, "quit");
      sandbox.stub(rq.emitter, "end");
      sandbox.stub(rq.receiver, "end");
    });
    afterEach(function () {
      sandbox.restore();
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
