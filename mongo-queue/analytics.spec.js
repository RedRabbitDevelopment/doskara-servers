
var Q = require('q');
var _ = require('lodash');
var uuid = require('uuid');
var Analytics = require('./analytics');
require('should');

describe('Analytics model', function() {
  var expectedMonth;
  var analytics;
  var ids = _.times(15, uuid.v4);
  var originalMonth = Analytics.getMonth();
  function timeout(milli) {
    var deferred = Q.defer();
    setTimeout(deferred.resolve, milli);
    return deferred.promise;
  }
  Analytics.getMonth = function() {
    return expectedMonth;
  };
  beforeEach(function() {
    expectedMonth = originalMonth;
    return Analytics.getCollection().then(function(a) {
      analytics = a;
      return Q.ninvoke(analytics, 'remove', {id: {$in: ids}});
    });
  });
  afterEach(function() {
    return Q.ninvoke(analytics, 'remove', {id: {$in: ids}});
  });
  describe('log', function() {
    it('should log the data', function() {
      Analytics.log('atom', ids[0], true);
      return timeout(100).then(function() {
        return Q.ninvoke(analytics, 'findOne', {id: ids[0]});
      }).then(function(data) {
        data.should.have.property('month', originalMonth);
        data.should.have.property('isNew', true);
      });
    });
    it('should log the data for a different month', function() {
      Analytics.log('atom', ids[0], false);
      expectedMonth = 15;
      Analytics.log('atom', ids[0], true);
      return timeout(100).then(function() {
        return Q.ninvoke(analytics.find({id: ids[0]}).sort(['month', 'ascending']), 'toArray');
      }).then(function(data) {
        data.should.have.property('length', 2);
        data[0].should.have.property('month', 15);
        data[0].should.have.property('isNew', true);
        data[1].should.have.property('month', originalMonth);
        data[1].should.have.property('isNew', false);
      });
    });
    it('shouldnt change isNew if logged twice', function() {
      Analytics.log('atom', ids[0], true);
      return timeout(100).then(function() {
        Analytics.log('atom', ids[0], false);
        return timeout(100);
      }).then(function() {
        return Q.ninvoke(analytics.find({id: ids[0]}).sort(['month', 'ascending']), 'toArray');
      }).then(function(data) {
        data.should.have.property('length', 1);
        data[0].should.have.property('month', originalMonth);
        data[0].should.have.property('isNew', true);
      });
    });
  });
  describe('aggregating', function() {
    it.only('should aggregate the data', function() {
      ids.forEach(function(id, i) {
        Analytics.log('atom', id, i % 2 === 0);
      });
      _.times(5, function(i) {
        expectedMonth = 15 + i;
        ids.slice(-i).forEach(function(id, i) {
          Analytics.log('atom', id, i % 2 === 0);
        });
      });
      return timeout(500).then(function() {
        return Analytics.aggregate('atom');
      }).then(function(docs) {
        docs.should.have.property('15', {
          _id: 15,
          numActive: 15,
          numNew: 8
        });
        docs.should.have.property('16', {
          _id: 16,
          numActive: 1,
          numNew: 1
        });
        docs.should.have.property('17', {
          _id: 17,
          numActive: 2,
          numNew: 1
        });
      });
    });
  });
});
