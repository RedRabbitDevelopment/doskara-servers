
var express = require('express');
var bodyParser = require('body-parser');
var _ = require('lodash');
var Q = require('q');
var analytics = require('../mongo-queue/analytics');
var app = express();

var authToken = process.env.AUTH_TOKEN || 'password';
app.use(function(req, res, next) {
  if(req.headers['auth-token'] === authToken) {
    next();
  } else {
    res.statusCode = 403;
    res.end();
  }
});
app.get('/analytics', function(req, res) {
  return Q.all([
    analytics.aggregate('atom'),
    analytics.aggregate('user'),
    analytics.aggregate('structure')
  ]).spread(function(atoms, users, structures) {
    return {
      atoms: atoms,
      users: users,
      structures: structures
    };
  }).then(function(result) {
    return {
      success: true,
      result: result
    };
  }).catch(function(err) {
    console.log('ServerError', err, err.stack);
    return {
      success: false
    };
  }).then(function(result) {
    res.json(result);
  });
});
app.post('/analytics/log', bodyParser.json(), function(req, res) {
  var params = {
    type: 'isString',
    isNew: 'isBoolean',
    id: 'isNumber'
  };
  params = _.mapValues(params, function(method, key) {
    if(req.body[key] == null)
      throw new Error('MissingParam: ' + key);
    if(!_[method](req.body[key]))
      throw new Error('InvalidParam: ' + key);
    return req.body[key];
  });
  var count = req.body.count;
  if(count && !_.isNumber(count))
    throw new Error('InvalidParam: ' + count);
  analytics.log(params.type, params.id, params.isNew, count);
  res.json({success: true});
});
app.listen(process.env.PORT || 9000);
