if (phantom.args.length < 2) {
  console.log("Usage: phantomjs render.js url output [waittime]");
  phantom.exit(1);
}
var url = phantom.args[0];
var output = phantom.args[1];
var waittime = phantom.args[2] || 0;

renderUrlToFile(url, output, waittime, function(url, file){
  console.log("Rendered '"+url+"' into '"+output+"'");
  phantom.exit(0);
});

function renderUrlToFile(url, file, waittime, callback) {
  var page = new WebPage();
  page.open(url, function(status){
      setTimeout(function(){
        page.render(file);
        callback(url, file);
      }, waittime);
  });
}
