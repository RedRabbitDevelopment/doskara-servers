
var httpProxy = require('http-proxy');
var MongoQueue = require('../mongo-queue');
var http = require('http');
var fs = require('fs');
MongoQueue.mongoConnect.then(function(db) {
  var atoms = db.collection('atoms');
  http.createServer(function(req, res) {
    var host = req.headers.host;
    var subdomain = host.substring(0, host.indexOf('.'));
    atoms.findOne({
      image: subdomain,
      ipAddress: {$exists: true}
    }, function(err, atom) {
      if(err) return console.log(err, err.stack) && res.send(404);
      if(!atom) return res.send(404);
      if(atom.running) return proxy.web(req, res, {target: 'http://' + atom.ipAddress});
      fs.createReadStream(__dirname + '/index.html').pipe(res);
    });
  }).listen(8000);
}).done();

