var should = require('chai').should()
  , conf = { port: 6379, scope: 'onescope' }
  , conf2 = { port: 6379, scope: 'anotherscope' }
  , NodeRedisPubsub = require('../index')
  ;


describe('Node Redis Pubsub', function () {

  it('Should send and receive standard messages correctly', function (done) {
    var rq = new NodeRedisPubsub(conf);

    rq.on('un test', function (data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
      done();
    }
    , function () {
        rq.emit('un test', { first: 'First message'
                            , second: 'Second message' });
      });
  });

  it('Should receive pattern messages correctly', function (done) {
    var rq = new NodeRedisPubsub(conf);

    rq.on('test:*', function (data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
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

});


