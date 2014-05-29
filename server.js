var PORT = process.env.port || 1337;
var md5 = require("./common/md5").md5;
var http = require("http");
var url  = require("url");
var fs = require('fs');
var path = require('path');
var tempDirectory = path.resolve('./tmp');

var requestors = {};

var Requestor = function(id, res) {
  this.id = id;
  this.bin = path.join(tempDirectory, this.id+".bin");
  this.json = path.join(tempDirectory, this.id+".json");
  this.res = res;
//    res.write("event: message\n");
//    res.write("data: "+JSON.stringify({foo: "bar"})+"\n\n");
  this.init();
};

Requestor.prototype = {
  init: function() {
    fs.stat(this.bin, function(err, stats) {
      if (err) {
        console.log("it does not exist");
        //   no? request some chunks
      } else {
        console.log("it exists", stats);
        //    foreach chunk emit progress
        //    any missing chunks?
        //      no? file is done
        //      yes? 
      }
    })
  },

  /* Accept a chunk from the multipart request object */
  receiveChunk: function(chunkNumber, req) {
    console.log("receivechunk", chunkNumber, req);
  }
};

var routes = {
  events: /^\/transfers\/(.+)\/events$/,
  chunks: /^\/transfers\/(.+)\/chunks\/(\d+)$/
};
http.createServer(function (req, res) {
  var parsedURL = url.parse(req.url);
  var pathname = parsedURL.pathname;
  var match = null;
  if (match = pathname.match(routes.chunks)) {
    var id = match[1];
    var rx = requestors[match[1]];
    rx.receiveChunk(match[2], req);
  } else if (match = pathname.match(routes.events)) {
    res.writeHead(200, {
      "Content-Type":"text/event-stream",
      "Cache-Control":"no-cache",
      "Connection":"keep-alive",
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Methods":"GET,PUT,POST,DELETE",
      "Access-Control-Allow-Headers":"Content-Type",
    });
    res.write("retry: 1000\n");
    var id = match[1];
    requestors[id] = null;
    requestors[id] = new Requestor(id, res);
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
