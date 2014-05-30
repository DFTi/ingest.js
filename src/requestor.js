var path = require('path');
var md5 = require('MD5');
var fs = require('fs');
var path = require('path');
var Dicer = require('dicer');
var RE_BOUNDARY = /^multipart\/.+?(?:; boundary=(?:(?:"(.+)")|(?:([^\s]+))))$/i;
var CHUNKSIZE = 32768;
var mkTempDir = require('./temp_dir.js');

var Requestor = function(options, res) {
  this.id = options.id;
  this.res = res;
  this.numChunks = parseInt(options.numChunks);
  this.chunksDir = path.join(options.tmp, this.id);
  mkTempDir(this.chunksDir, this.init.bind(this));
};

Requestor.prototype = {
  init: function() {
    console.log("init");
    this.eachChunk(function(err, chunkNumber, chunkPath) {
      console.log("Each chunk");
      if (err) {
        console.log("err");
        this.requestChunk(chunkNumber);
      } else {
        console.log("verify");
        this._emit("verifyChunk", {
          checkSum: this._chunkChecksum(chunkNumber),
          chunkNumber: chunkNumber
        });
      }
    }.bind(this));
  },

  /* Takes a chunk number, and a callback
   * Calls back with error, chunkNumber, chunkPath */
  returnChunk: function(chunkNumber, callback) {
    var cPath = this._path(chunkNumber);
    fs.stat(cPath, function(err, stats) {
      if (err) {
        callback(err, chunkNumber, null);
      } else {
        callback(null, chunkNumber, cPath);
      } 
    })
  },

  eachChunk: function(callback) {
    for (var i = 1, l = this.numChunks; i <= l; i ++)
      this.returnChunk(i, callback);
  },

  /* Request a single chunk.
   * Chunk numbers are not 0-based index. */
  requestChunk: function(chunkNumber) {
    console.log("Requesting chunk "+chunkNumber);
    this._emit("sendChunk", chunkNumber);
  },

  /* Accept a chunk from the multipart request object
   * write it to the binary at the correct place and
   * respond appropriately depending on match */
  receiveChunk: function(chunkNumber, targetMd5, req, res) {
    console.log("Receiving chunk "+chunkNumber);
    var m = RE_BOUNDARY.exec(req.headers['content-type']);
    var d = new Dicer({ boundary: m[1] || m[2] });
    var cPath = this._path(chunkNumber);
    var writeStream = fs.createWriteStream(cPath);
    d.on('part', function(p) {
      p.pipe(writeStream);
    });
    d.on('finish', function() {
      var checkSum = this._chunkChecksum(chunkNumber);
      console.log("TargetChecksum: "+targetMd5);
      console.log("LocalChecksum: "+checkSum);
      if (checkSum === targetMd5) {
        res.statusCode = 204;
      } else {
        res.statusCode = 406;
      }
      res.end();
    }.bind(this));
    req.pipe(d);
  },

  _chunkChecksum: function(chunkNumber) {
    return md5(fs.readFileSync(this._path(chunkNumber)));
  },

  _path: function(chunkNumber) {
    return path.join(this.chunksDir, chunkNumber.toString());
  },

  _emit: function(event, data) {
    this.res.write("event: "+event+"\n");
    var str = (typeof(data) === "object" ? JSON.stringify(data) : data);
    this.res.write("data: "+str+"\n\n");
  }
};

module.exports = Requestor;
