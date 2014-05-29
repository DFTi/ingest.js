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
  this.numChunks = parseInt(options.numChunks);
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
        this.eachChunk(function(err, chunkNumber, blob) {
          if (err) {
            console.log("err");
            this.requestChunk(chunkNumber);
          } else {
            console.log("verify");
            this._emit("verifyChunk", {
              checkSum: SparkMD5.hash(blob),
              chunkNumber: chunkNumber
            });
          }
        }.bind(this));
      }
    }.bind(this));
  },

  /* Takes a file descriptor, a chunk number, and a callback
   * Calls back with error, chunkNumber, buffer */
  returnChunk: function(fd, chunkNumber, callback) {
    var buffer = new Buffer(CHUNKSIZE);
    var start = (chunkNumber-1) * CHUNKSIZE;
    fs.read(fd, buffer, 0, CHUNKSIZE, start, function(err, bytesRead, buff) {
      if (err) {
        callback(err, chunkNumber, null);
      } else {
        callback(null, chunkNumber, buff);
      } 
    });
  },

  /* Iterate over all the chunks we have saved locally
   * and callback with the buffer and index */
  eachChunk: function(callback) {
    fs.open(this.bin, 'r', function(err, fd) {
      for (var i = 1, l = this.numChunks; i <= l; i ++)
        this.returnChunk(fd, i, callback);
    }.bind(this));
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
        // write to file
        fs.closeSync(fd);
        done(spark.end() === targetMd5);
      });
      req.pipe(d);
    });
  },

  _emit: function(event, data) {
    this.res.write("event: "+event+"\n");
    var str = (typeof(data) === "object" ? JSON.stringify(data) : data);
    this.res.write("data: "+str+"\n\n");
  }
};

module.exports = Requestor;
