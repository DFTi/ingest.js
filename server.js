var PORT = process.env.port || 1337;
var Buffer = require('buffer').Buffer;
var SparkMD5 = require("./common/md5");
var http = require("http");
var url  = require("url");
var fs = require('fs');
var path = require('path');
var tempDirectory = path.resolve('./tmp');
var Dicer = require('dicer');
var RE_BOUNDARY = /^multipart\/.+?(?:; boundary=(?:(?:"(.+)")|(?:([^\s]+))))$/i;
var inspect = require('util').inspect;

var CHUNKSIZE = 32768;

var requestors = {};

var Requestor = function(id, numChunks, res) {
  this.id = id;
  this.bin = path.join(tempDirectory, this.id+".bin");
  this.json = path.join(tempDirectory, this.id+".json");
  this.res = res;
  this.numChunks = numChunks;
  this.init();
};

Requestor.prototype = {
  init: function() {
    fs.stat(this.bin, function(err, stats) {
      if (err) {
        // the file doesn't exist
        // create it and request the first chunk
        fs.closeSync(fs.openSync(this.bin, 'w')); // touch and truncate
        console.log("Created empty "+this.bin);
        this.requestChunk(1);
      } else {
        console.log("File exist "+this.bin);
        // the file exists
        // report the md5 for each chunk that we have
        this.eachChunk(function(blob) {
          var localChecksum = spark.hash(blob);
          this.reportLocalChecksum(localChecksum);
        });
      }
    }.bind(this));
  },

  /* Iterate over all the chunks we have saved locally */
  eachChunk: function() {
    fs.open(this.bin, 'r', function(err, fd) {
      console.log("opened the bin");
    });
  },

  /* Request a single chunk.
   * Chunk numbers are not 0-based index. */
  requestChunk: function(chunkNumber) {
    console.log("Requesting chunk "+chunkNumber);
    this._emit("sendChunk", chunkNumber);
  },

  /* Accept a chunk from the multipart request object
   * write it to the binary at the correct place and
   * callback true or false telling if md5 matched */
  receiveChunk: function(chunkNumber, targetMd5, req, done) {
    console.log("Receiving chunk "+chunkNumber);
    var m = RE_BOUNDARY.exec(req.headers['content-type']);
    var d = new Dicer({ boundary: m[1] || m[2] });
    var buffer = null;
    fs.open(this.bin, 'r+', function(err, fd) {
      var spark = new SparkMD5();
      d.on('part', function(p) {
        p.on('data', function(data) {
          buffer = data;
          spark.append(buffer);
        });
      });
      d.on('finish', function() {
        fs.closeSync(fd);
        done(spark.end() === targetMd5);
      });
      req.pipe(d);
    });
  },

  _emit: function(event, data) {
    this.res.write("event: "+event+"\n");
    var str = (typeof(data) === "object" ? JSON.stringify(json) : data);
    this.res.write("data: "+str+"\n\n");
  }
};

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
    requestors[id] = null;
    requestors[id] = new Requestor(id, numChunks, res);
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
