var PORT = process.env.port || 1337;
var http = require("http");
var url  = require("url");
var fs = require('fs');
var path = require('path');
var tempDirectory = path.resolve('./tmp');
var Requestor = require('./src/requestor.js');

var requestors = {};

var routes = {
  events: /^\/transfers\/(.+)\/(\d+)\/events$/,
  chunks: /^\/transfers\/(.+)\/chunks\/(\d+)\/(.+)$/
};

http.createServer(function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  var parsedURL = url.parse(req.url);
  var pathname = parsedURL.pathname;
  console.log(pathname);
  var match = null;
  if ((match = pathname.match(routes.chunks)) && req.method === "POST") {
    var id = match[1];
    var chunkNumber = match[2];
    var chunkMd5 = match[3];
    var rx = requestors[match[1]];
    if (rx === null) { res.writeHead(500); res.end(); }
    else {
      rx.receiveChunk(chunkNumber, chunkMd5, req, function(checksumOK) {
        res.statusCode = (checksumOK ? 204 : 406);
        res.end();
      });
    }
  } else if ((match = pathname.match(routes.events)) && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type":"text/event-stream",
      "Cache-Control":"no-cache",
      "Connection":"keep-alive"
    });
    res.write("retry: 1000\n");
    var id = match[1];
    var numChunks = match[2];
    var opts = { id: id, numChunks: match[2], tmp: tempDirectory }
    requestors[id] = null;
    requestors[id] = new Requestor(opts, res);
    req.connection.addListener("close", function() {
      requestors[id] = null;
    });
  } else {
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end("You know, for uploads");
  }
}).listen(PORT);
console.log("Server running at http://0.0.0.0:"+PORT+"/");

// Setup temp directory
fs.stat(tempDirectory, function(err, stats) {
  if (err) {
    fs.mkdir(tempDirectory);
  } else {
    if (!stats.isDirectory()) {
      throw new Error(tempDirectory+" is not a directory!");
    }
  }
});
