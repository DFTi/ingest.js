var PORT = process.env.port || 1337;
var md5 = require("./common/md5").md5;
var http = require("http");
var url  = require("url");

var routes = {
  fileEvents: /^\/transfers\/(.+)\/events$/
};

http.createServer(function (req, res) {
  var pathname = url.parse(req.url).pathname;
  var match = pathname.match(routes.fileEvents);
  if (match === null) {
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end("You know, for uploads");
  } else {
    res.writeHead(200, {
      "Content-Type":"text/event-stream",
      "Cache-Control":"no-cache",
      "Connection":"keep-alive",
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Methods":"GET,PUT,POST,DELETE",
      "Access-Control-Allow-Headers":"Content-Type",
    });
    res.write("retry: 1000\n");
    res.write("event: message\n");
    res.write("data: "+JSON.stringify({foo: "bar"})+"\n\n");
    req.connection.addListener("close", function() {
      console.log("Connnection closed");
    });
  }
}).listen(PORT);
console.log("Server running at http://0.0.0.0:"+PORT+"/");

