var path = require('path');
var SparkMD5 = require("../common/md5");
var fs = require('fs');
var path = require('path');
var Dicer = require('dicer');
var RE_BOUNDARY = /^multipart\/.+?(?:; boundary=(?:(?:"(.+)")|(?:([^\s]+))))$/i;
var CHUNKSIZE = 32768;

var Requestor = function(options, res) {
  this.id = options.id;
  this.bin = path.join(options.tmp, this.id+".bin");
  this.res = res;
  this.numChunks = options.numChunks;
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

module.exports = Requestor;
