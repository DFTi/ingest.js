$(function() {
  $('input#ingest[type=file]').ingest({
    endpoint: "http://localhost:1337/",
    progress: function(tx, stage, percent) {
      console.log(stage); // what is it doing? downloading? transcoding? etc
      console.log(percent); // what is the overall percent ?
    },
    add: function(tx) {
      var item = $('<p data-id="'+tx.id+'">');
      item.text(tx.file.name);
      var progress = $("<span class=progress>")
      progress.text('0%');
      item.append(progress);
      $('#transfers').append(item);
    }
  });
});
