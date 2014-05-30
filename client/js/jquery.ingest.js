;(function ( $, window, document, undefined ) {
  var pluginName = "ingest",
  defaults = {
    propertyName: "value",
    chunkSize: 32768, // 32 kilobytes
    add: function() {},
    progress: function() {}
  };

  function Ingest( element, options ) {
    this.element = element;
    this.options = $.extend( {}, defaults, options) ;
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  }

  Ingest.prototype = {
    init: function() {
      $(this.element).on('change', this.inputFiles.bind(this));
    },

    inputFiles: function(e) {
      $(e.target.files).each(function (i, file) {
        this.addFile(file);
      }.bind(this));
    },

    /* Resume or begin a new upload. Accepts a File() object */
    addFile: function(file) {
      var transfer = new FileTransfer(file, this.options);
      // Callback for UI purposes
      transfer.init(this.options.add);
    }
  };

  /* Represents a file transfer */
  function FileTransfer(file, options) {
    this.file = file;
    this.chunkSize = options.chunkSize;
    this.numChunks = Math.ceil(this.file.size / this.chunkSize);
    this.endpoint = options.endpoint;
  }

  FileTransfer.prototype = {
    /* Fingerprint the file, register for events, and callback with +this+ */
    init: function(callback) {
      var url = URL(this.endpoint);
      this.fingerprint(function() {
        url.pathname = '/transfers/'+this.id+'/'+this.numChunks+'/events';
        eventsource = new EventSource(url.href);
        eventsource.addEventListener('sendChunk', function(e) {
          var chunkNumber = parseInt(e.data);
          console.log("Server requested chunk " + chunkNumber);
          this.sendChunk(chunkNumber);
        }.bind(this));
        eventsource.addEventListener('verifyChunk', function(e) {
          var data = JSON.parse(e.data);
          this.verifyChunk(data.chunkNumber, data.checkSum, function(checkSumOK) {
            if (checkSumOK) {
              // progress +1
            } else {
              this.sendChunk(data.chunkNumber);
            }
          }.bind(this));
        }.bind(this));
        callback(this);
      }.bind(this));
    },

    /* Callback true or false depending if the chunk matches the checksum */
    verifyChunk: function(chunkNumber, remoteCheckSum, callback) {
      this.md5Chunk(chunkNumber, function(checkSum) {
        callback(checkSum === remoteCheckSum);
      });
    },

    /* Sets this.id to a string value based on name, head and tail chunks.
     * Returns +this+ via callback */
    fingerprint: function(callback) {
      var lastChunk = this.numChunks;
      var name = this.file.name;
      var done = function(first, last) {
        this.id = md5(first+last+name);
        callback(this);
      }.bind(this);
      this.md5Chunk(1, function(first) {
        if (lastChunk > 1) { 
          this.md5Chunk(lastChunk, function(last) {
            done(first, last);
          });
        } else {
          done(first, '');
        }
      }.bind(this));
    },

    /* Send a chunk to the server via HTTP POST
     * Chunk number is not 0-based index; 1 is the first chunk */
    sendChunk: function(chunkNumber) {
      var url = URL(this.endpoint);
      var blob = this.getChunk(chunkNumber);
      this.readChunk(blob, function(data) {
        url.pathname = '/transfers/'+this.id+'/chunks/'+chunkNumber+'/'+md5(data);
        var formData = new FormData();
        formData.append('data', data);
        $.ajax({
          url: url.href,
          type: 'post',
          data: formData,
          processData: false,
          contentType: false,
          success: function() {
            console.log("successfully delivered chunk "+chunkNumber);
          },
          error: function(e) {
            if (e.status === 406) {
              console.log("Chunk corrupted in transit. Will retry");
              setTimeout(function() {  this.sendChunk(chunkNumber);  }.bind(this), 2000);
            }
          }.bind(this)
        });
      }.bind(this));
    },

    /* Get the MD5 checksum for a specified chunk.
     * Chunk number is not 0-based index; the first chunk is chunk 1 */
    md5Chunk: function(num, callback) {
      var reader = new FileReader();
      reader.onload = function(e) {
        callback(SparkMD5.ArrayBuffer.hash(e.target.result));
      };
      reader.readAsArrayBuffer(this.getChunk(num));
    },

    /* Get the blob data for a specified chunk.
     * Chunk number is not 0-based index; the first chunk is chunk 1 */
    getChunk: function(chunkNumber) {
      var index = (chunkNumber-1);
      var start = index * this.chunkSize;
      var end = start + this.chunkSize; // what if it's beyond? does slice care?
      return this.file.slice(start, end);
    },

    readChunk: function(blob, callback) {
      var reader = new FileReader();
      reader.onload = function(e) { callback(e.target.result) };
      reader.readAsBinaryString(blob);
    }
  }

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function ( options ) {
    return this.each(function () {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new Ingest( this, options ));
      }
    });
  };

  var md5 = function(input) {
    return SparkMD5.hash(input);
  };

})( jQuery, window, document );
