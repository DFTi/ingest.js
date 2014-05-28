$(function() {
  $('input#ingest[type=file]').ingest({
    endpoint: "http://localhost:3000/ingest",
    progress: function(percent) {
      console.log(percent);
    },
    add: function(tx) {
      console.log("Added file", tx.file.name);
      console.log("Size: "+tx.file.size);
      console.log("Num chunks: "+tx.num_chunks);
    }
  });
});
