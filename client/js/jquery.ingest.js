/*!
 * jQuery lightweight plugin boilerplate
 * Original author: @ajpiano
 * Further changes, comments: @addyosmani
 * Licensed under the MIT license
 */

// the semi-colon before the function invocation is a safety
// net against concatenated scripts and/or other plugins
// that are not closed properly.
;(function ( $, window, document, undefined ) {

  // undefined is used here as the undefined global
  // variable in ECMAScript 3 and is mutable (i.e. it can
  // be changed by someone else). undefined isn't really
  // being passed in so we can ensure that its value is
  // truly undefined. In ES5, undefined can no longer be
  // modified.

  // window and document are passed through as local
  // variables rather than as globals, because this (slightly)
  // quickens the resolution process and can be more
  // efficiently minified (especially when both are
  // regularly referenced in your plugin).

  // Create the defaults once
  var pluginName = "ingest",
  defaults = {
    propertyName: "value",
    chunkSize: 5242880, // 5 megabytes in bytes, must use same at endpoint
    add: function() {},
    progress: function() {}
  };

  // The actual plugin constructor
  function Ingest( element, options ) {
    this.element = element;

    // jQuery has an extend method that merges the
    // contents of two or more objects, storing the
    // result in the first object. The first object
    // is generally empty because we don't want to alter
    // the default options for future instances of the plugin
    this.options = $.extend( {}, defaults, options) ;

    this._defaults = defaults;
    this._name = pluginName;

    this.init();
  }

  Ingest.prototype = {

    init: function() {
      // Place initialization logic here
      // You already have access to the DOM element and
      // the options via
      // the instance, e.g. this.element
      // and this.options
      // you can add more functions like the one below and
      // call them like so: this.yourOtherFunction(this.element, this.options).
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
      this.options.add(transfer);
    }
  };

  /* Represents a file transfer */
  function FileTransfer(file, options) {
    this.file = file;
    this.num_chunks = Math.ceil(file.size / options.chunkSize);
    this.init();
  }

  FileTransfer.prototype = {
    init: function() {
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

})( jQuery, window, document );
