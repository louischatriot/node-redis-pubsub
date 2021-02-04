var Pool = {};

// NameSpace Pool definition
function NSP(){
  this.handlers         = [];
  this.pmessageHandlers = [];
}

// Add a new henalder to the namespace pool
NSP.prototype.add = function(hanlder, pmessageHandler){
  this.handlers.push(hanlder);
  this.pmessageHandlers.push(pmessageHandler);
};

// Remove a hendler from namespace pool
NSP.prototype.remove = function(handler){
  this.pmessageHandlers = [];
  var index = this.handlers.indexOf(handler);
  if(index > -1){ this.handlers.splice(index, 1); } // Remove from pool
};

// Clear current namespace pool
NSP.prototype.flush = function(){
  this.handlers         = [];
  this.pmessageHandlers = [];
};

/*
 * Wrap Pool on a specific NameSpace
 * */
Pool.of = function(namespace){
  if(typeof Pool[namespace] === 'function'){ namespace = '_' + namespace; } // Internal pool Method
  (Pool[namespace]) || (Pool[namespace] = new NSP());
  return Pool[namespace];
};

/*
 * Flush all handlers from Pool
 * */
Pool.flushAll = function(){
  for (var nsp in Pool) {
    if (!Pool.hasOwnProperty(nsp) || typeof Pool[nsp] == 'function') continue;
    Pool[nsp].flush();
    delete Pool[nsp];
  }
};

module.exports = Pool;
