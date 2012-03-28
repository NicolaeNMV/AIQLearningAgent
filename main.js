$(function(){
  var canvas = $('#viewport')[0];

  // CONSTANTS
  var DRAGON = { value: -10, fillStyle: "rgb(255,0,100)" }
  var JEWEL = { value: 10, fillStyle: "rgb(100,100,255)" }

  // dirty variables used for rendering
  var dirty = true;

  // STATES
  var objects = [];
  for (var i = 0; i < 3; ++i) {
    var x = Math.floor(Math.random()*canvas.width);
    var y = Math.floor(Math.random()*canvas.height);
    objects.push($.extend({ x:x, y:y }, DRAGON));
  }
  for (var i = 0; i < 3; ++i) {
    var x = Math.floor(Math.random()*canvas.width);
    var y = Math.floor(Math.random()*canvas.height);
    objects.push($.extend({ x:x, y:y }, JEWEL));
  }

  var states = [];
  // init states
  applyForEachState(function(){ return 0; });

  /// UTILS
  // newValue = f (x, y, currentValue) 
  // is called for each state
  function applyForEachState (f) {
    for (var y = 0; y < canvas.height; ++ y) {
      for (var x = 0; x < canvas.width; ++ x) {
        var i = y*canvas.width + x;
        states[i] = f(x, y, states[i]);
      }
    }
  }
  // Same as applyForEachState but don't change the value
  function forEachState (f) {
    applyForEachState(function(x, y, v){
      f(x, y, v);
      return v;
    });
  }
  function constraint (min, max, value) { return Math.max(min, Math.min(max, value)) }
  function smoothstep (min, max, value) { return Math.max(0, Math.min(1, (value-min)/(max-min))); }


  // COMPUTING

  // RENDERING
  var ctx = canvas.getContext('2d');

  function setup () {

  }

  var imgData = ctx.createImageData(canvas.width, canvas.height);
  function render () {
    if (!dirty) return;
    dirty = false;

    forEachState(function (x, y, v) {
      var p = smoothstep(-100, 100, v);
      var r = Math.floor((1-p)*255), g = Math.floor(p*255), b = 0;
      var i = (y*canvas.width+x)*4;
      imgData.data[i]   = r;
      imgData.data[i+1] = g;
      imgData.data[i+2] = b;
      imgData.data[i+3] = 255;
    });
    ctx.putImageData(imgData, 0, 0);

    objects.forEach(function (o) {
      ctx.fillStyle = o.fillStyle;
      ctx.fillRect(o.x, o.y, 1, 1);
    });
  }

  requestAnimFrame(function loop () {
    requestAnimFrame(loop);
    render();
  }, canvas);

});
