var should = require('chai').should()
  , conf = { port: 6379, scope: 'onescope' }
  , conf2 = { port: 6379, scope: 'anotherscope' }
  , NodeRedisPubsub = require('../index')
  ;


describe('Node Redis Pubsub', function () {

  it('Should send and receive standard messages correctly', function (done) {
    var rq = new NodeRedisPubsub(conf);

    rq.on('a test', function (data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
      done();
    }
    , function () {
        rq.emit('a test', { first: 'First message'
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

  it('Should not receive messages after unsubscribing', function (done) {
    var rq = new NodeRedisPubsub(conf);

    var testFunc = function (data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
    };

    rq.on('unsubtest', testFunc, function () {
        rq.emit('unsubtest', { first: 'First message'
                            , second: 'Second message' });

        rq.off('unsubtest', testFunc, function() {
          rq.emit('unsubtest', { first: 'Wrong'
                            , second: 'Also wrong' });
          done();
        });
      });
  });

  it('Should receive other messages on the same channel after unsubscribing a specific function', function (done) {
    var rq = new NodeRedisPubsub(conf);

    var testFunc = function (data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
    };

    var testFunc2 = function(data) {
      data.first.should.equal('First message');
      data.second.should.equal('Second message');
    };

    rq.on('sub1', testFunc, function() {
      rq.on('sub1', testFunc2, function () {
          rq.emit('sub1', { first: 'First message'
                              , second: 'Second message' });

          rq.emit('sub1', { first: 'First message'
                              , second: 'Second message' });

          rq.off('sub1', testFunc, function() {
            rq.emit('sub1', { first: 'Wrong'
                              , second: 'Also wrong' });

            rq.emit('sub1', { first: 'First message'
                                , second: 'Second message' });
            done();
          });
        });
    });
  });

});


