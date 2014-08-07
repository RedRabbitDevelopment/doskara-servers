
var httpProxy = require('http-proxy');

require('http').createServer(function(req, res) {
  console.log(req.headers.host);
  res.write('Booya');
  res.end();
}).listen(8000);

