$(function() {
  $('input#ingest[type=file]').ingest({
    endpoint: "http://localhost:1337/",
    progress: function(tx, percent) {
      console.log(percent);
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
