$(function(){
  var canvas = $('#viewport')[0];

  // CONSTANTS
  var DRAGON = { value: -10, fillStyle: "rgb(255,0,100)" }
  var JEWEL = { value: 10, fillStyle: "rgb(100,100,255)" }

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
    objects.push($.extend({ x:x, y:y }, DRAGON));
  }
  for (var i = 0; i < 3; ++i) {
    var x = Math.floor(Math.random()*canvas.width);
    var y = Math.floor(Math.random()*canvas.height);
    objects.push($.extend({ x:x, y:y }, JEWEL));
  }

  var actionsStates = [];
  applyForEachActionState(function(){ return 0; });

  objects.forEach(function (o) {
    for (var a = 0; a < ACTIONS.length; ++a)
      setActionState(o.x, o.y, a, o.value);
  });

  var states = [];
  // init states
  applyForEachState(function(){ return 0; });

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
    var w = canvas.width, h = canvas.height;
    return { 
      x: constraint(0, canvas.width, s.x + disp.x), 
      y: constraint(0, canvas.height, s.y + disp.y)
    }
  }

  function bestAction (s) {
    return Math.floor(Math.random()*8);
  }

  function getReward (a) {
    return 0;
  }

  function Q (s, a) {
    return getActionState(s.x, s.y, a);
  }

  function QL (n, alpha, gamma) {
    for (var i = 0; i < n; ++i) {
      var aprime = bestAction(robot);
      var sprime = move(robot, aprime);
      applyForEachActionState(function (x, y, a, qsa) {
        return qsa + alpha*(getReward(aprime) + gamma*Q(sprime, aprime) - qsa);
      });
    }
    computeStateFromActionState();
    dirty = true;
  }

  QL(2, 0.1, 0.2);

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
