
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});
var MongoQueue = require('../mongo-queue');
var http = require('http');
var fs = require('fs');
MongoQueue.mongoConnect.then(function(db) {
  var atoms = db.collection('atoms');
  http.createServer(function(req, res) {
    var host = req.headers.host;
    if(host === 'gateway.doskara.com') {
      switch(req.path) {
        case '/feedback':
          res.write('Thanks!');     
          break;
        default:
          res.statusCode = 404;
      }
      res.end();
    } else {
      var subdomain = host.substring(0, host.indexOf('.'));
      var remaining = host.substring(subdomain.length);
      var query = {ipAddress: {$exists: true}};
      if(remaining === '.doskara.com') {
        query.image = subdomain;
      } else {
        query.domains = host;
      }
      atoms.findOne(query, function(err, atom) {
        if(err) {
          console.log(err, err.stack);
        }
        if(err || !atom) {
          res.statusCode = 404;
          return res.end();
        }
        if(atom.running) {
          return proxy.web(req, res, {target: 'http://' + atom.ipAddress});
        }
        MongoQueue.emit('startStoppedInstance', {
          name: atom.image
        });
        fs.createReadStream(__dirname + '/index.html').pipe(res);
      });
    }
  }).listen(80);
}).done();

