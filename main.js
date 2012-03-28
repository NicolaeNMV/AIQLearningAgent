$(function(){
  var $canvas = $('#viewport');
  var canvas = $canvas[0];
  var $num_iteration = $('#stats .num_iteration');


  // CONSTANTS
  var DEAMON = { value: -10, fillStyle: "rgb(255,0,100)", className: "deamon" }
  var JEWEL = { value: 10, fillStyle: "rgb(100,100,255)", className: "jewel" }

  var ACTIONS = [
    { x: -1, y:  0 },
    { x:  1, y:  0 },
    { x:  0, y: -1 },
    { x:  0, y:  1 },
    { x: -1, y: -1 },
    { x: -1, y:  1 },
    { x:  1, y: -1 },
    { x:  1, y:  1 }
  ]

  var LEFT = 0, RIGHT = 1, UP = 2, DOWN = 3, TOPLEFT = 4, BOTTOMLEFT = 5, TOPRIGHT = 6, BOTTOMRIGHT = 7; 

  // dirty variables used for rendering
  var dirty = true;

  // STATES
  var robot = { x: Math.floor(Math.random()*canvas.width/2), y: Math.floor(Math.random()*canvas.height/2) };

  var objects = [];
  for (var i = 0; i < 3; ++i) {
    var x = Math.floor(Math.random()*canvas.width);
    var y = Math.floor(Math.random()*canvas.height);
    objects.push($.extend({ x: x, y: y, nb: 1 }, DEAMON));
    console.log("DEAMON at ", x, y);
  }
  for (var i = 0; i < 6; ++i) {
    var x = Math.floor(Math.random()*canvas.width);
    var y = Math.floor(Math.random()*canvas.height);
    objects.push($.extend({ x: x, y: y, nb: 1 }, JEWEL));
    console.log("JEWEL at ", x, y);
  }

  var actionsStates = [];
  applyForEachActionState(function(){ return 0; });
  
  objects.forEach(function (o) {
    for (var a = 0; a < ACTIONS.length; ++a)
      setActionState(o.x, o.y, a, o.value);
  });

  var states = [];
  // init states
  computeStateFromActionState();

  /// UTILS
  // newValue = f (x, y, action, currentValue)
  // is called for each state
  function applyForEachActionState (f) {
    var old = [];
    for (var i = 0; i < actionsStates.length; ++i)
      old[i] = actionsStates[i];

    for (var y = 0; y < canvas.height; ++ y) {
      for (var x = 0; x < canvas.width; ++ x) {
        for (var a = 0; a < ACTIONS.length; ++ a) {
          var i = getActionStateIndex(x, y, a);
          actionsStates[i] = f(x, y, a, old[i]);
        }
      }
    }
  }
  function getActionStateIndex (x, y, a) {
    return a+ACTIONS.length*(x + y*canvas.width);
  }
  function getActionState (x, y, a) {
    return actionsStates[ getActionStateIndex(x, y, a) ];
  }
  function setActionState (x, y, a, v) {
    return actionsStates[ getActionStateIndex(x, y, a) ] = v;
  }

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
  function move (s, a) {
    var disp = ACTIONS[a];
    return { 
      x: constraint(0, canvas.width-1, s.x + disp.x), 
      y: constraint(0, canvas.height-1, s.y + disp.y)
    }
  }

  function bestAction (s) {
    var bestA = 0; //Math.floor(Math.random()*8);
    var best = Q(move(s, bestA), bestA);
    for (var a = 1; a < ACTIONS.length; ++a) {
      var next = move(s, a);
      var v = Q(next, a);
      if(v > best) {
        best = v;
        bestA = a;
      }
    }
    return bestA;
  }

  window.bestAction = bestAction;

  function getReward (s, a, olds, olda) {
    var r;
    var diff = olda - a;
    if (diff > 4)
      diff -= 8;
    diff = Math.abs(diff);
    r = 2 - diff;

    if (s.x==olds.x && s.y==olds.y)
      r -= 5;

    objects.forEach(function (o) {
      if (o.nb>0 && s.x == o.x && s.y == o.y) {
        o.nb --;
        r += o.value;
      }
    });
    return r;
  }

  function Q (s, a) {
    return getActionState(s.x, s.y, a);
  }

  function QL (n, alpha, gamma, totalTime) {
    var freq =  Math.floor(totalTime / n);
    var i = 0;
    var interval = setInterval(function () {
      if (i++ > n) {
        clearInterval(interval);
        return;
      }
      applyForEachActionState(function (x, y, a, qsa) {
        var s = {x: x, y: y};
        var aprime = bestAction(s);
        var sprime = move(s, aprime);
        return qsa + alpha*(getReward(sprime, aprime, s, a) + gamma*Q(sprime, aprime) - qsa);
      });
      computeStateFromActionState();
      $num_iteration.text(i);
      dirty = true;
    }, freq);
  }

  QL(1000, 0.09, 0.95, 3000);

  function computeStateFromActionState () {
    for (var y = 0; y < canvas.height; ++ y) {
      for (var x = 0; x < canvas.width; ++ x) {
        var sum = 0;
        var s = x + y*canvas.width;
        for (var a = 0; a < ACTIONS.length; ++ a) {
          var i = a+ACTIONS.length*s;
          sum += actionsStates[i];
        }
        states[s] = sum / ACTIONS.length;
      }
    }
  }

  // RENDERING
  var ctx = canvas.getContext('2d');
  var qlEnabled;

  function setup () {
    var $objects = $('#objects');
    objects.forEach(function (o) {
      $objects.append($('<div class="object" />').
        addClass(o.className).
        css("top", $canvas.height()*((o.y+0.5)/canvas.height)+'px').
        css("left", $canvas.width()*((o.x+0.5)/canvas.width)+'px').
        append('<span />'));
    });
    var $enableQL = $('#enableQL');
    $enableQL.on("change", function() {
      if($(this).is(":checked")) {
        dirty = true;
        qlEnabled = true;
        $canvas.removeClass('disabled');
      }
      else {
        qlEnabled = false;
        $canvas.addClass('disabled');
      }
    });
  }

  var imgData = ctx.createImageData(canvas.width, canvas.height);
  function render () {
    if (!dirty || !qlEnabled) return;
    dirty = false;

    var min=+Infinity, max=-Infinity;
    forEachState(function(_, __, v) {
      if (v<min) min = v;
      if (v>max) max = v;
    });

    forEachState(function (x, y, v) {
      var p = smoothstep(min, max, v);
      var r = Math.floor((1-p)*255), g = Math.floor(p*255), b = 0;
      var i = (y*canvas.width+x)*4;
      imgData.data[i]   = r;
      imgData.data[i+1] = g;
      imgData.data[i+2] = b;
      imgData.data[i+3] = 255;
    });
    ctx.putImageData(imgData, 0, 0);


    /*
    return
    objects.forEach(function (o) {
      ctx.fillStyle = o.fillStyle;
      ctx.fillRect(o.x, o.y, 1, 1);
    });
    */
  }

  setup();
  requestAnimFrame(function loop () {
    requestAnimFrame(loop);
    render();
  }, canvas);

});
