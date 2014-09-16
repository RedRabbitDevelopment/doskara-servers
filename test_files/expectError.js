module.exports = function(error, promise) {
  return promise.then(function() {
    throw new Error('Expected error ' + error);
  }, function(e) {
    if (e.message !== error) {
      throw e;
    }
  });
};
