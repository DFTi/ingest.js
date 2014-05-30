fs = require('fs');

module.exports = function(tempDirectory, cb) {
  fs.stat(tempDirectory, function(err, stats) {
    if (err) {
      fs.mkdirSync(tempDirectory);
    } else {
      if (!stats.isDirectory()) {
        throw new Error(tempDirectory+" is not a directory!");
      }
    }
    if (typeof cb === "function") cb();
  });
}
