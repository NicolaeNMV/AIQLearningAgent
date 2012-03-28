$(function(){
  var $canvas = $('#viewport');
  var canvas = $canvas[0];
  var $num_iteration = $('#stats .num_iteration');


  // CONSTANTS
  var DEAMON = { fillStyle: "rgb(255,0,100)", className: "deamon", value: -20 }
  var JEWEL = { className: "jewel", value: 5, nb: 1, consumable: true }

  var ACTIONS = [
    { x: -1, y:  0 }, // left
    { x: -1, y: -1 }, // top left
    { x:  0, y: -1 }, // top
    { x:  1, y: -1 }, // top right
    { x:  1, y:  0 }, // right
    { x:  1, y:  1 }, // down right
    { x:  0, y:  1 }, // down
    { x: -1, y:  1 }  // down left
  ]

  // dirty variables used for rendering
  var dirty = true;

  // STATES
  var objects = [];
  for (var i = 0; i < 3; ++i) {
    var x = Math.floor(Math.random()*canvas.width);
    var y = Math.floor(Math.random()*canvas.height);
    objects.push($.extend({ x: x, y: y }, DEAMON));
    console.log("DEAMON at ", x, y);
  }
  for (var i = 0; i < 6; ++i) {
    var x = Math.floor(Math.random()*canvas.width);
    var y = Math.floor(Math.random()*canvas.height);
    objects.push($.extend({ x: x, y: y }, JEWEL));
    console.log("JEWEL at ", x, y);
  }

  function removeObject (o) {
    var i = objects.indexOf(o);
    if (i != -1) {
      objects.splice(i, 1);
    }
  }

  var actionsStates;

  function initActionState () {
    actionsStates = [];
    applyForEachActionState(function(){ 
      return Math.random()*0.3; 
    });
    objects.forEach(function (o) {
      for (var a = 0; a < ACTIONS.length; ++a) {
        var adj = move(o, a);
        for (var i = 0; i < ACTIONS.length; ++i) {
          setActionState(adj.x, adj.y, a, o.value);
        }
        setActionState(o.x, o.y, a, o.value);
      }
    });

  }


  var states = [];
  // init states

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
  window.move = move;


  function getReward (s, a, olds, olda) {
    var r;
    // init r with a value in [-2, 2] depending on the angle change (it's better to continue forward)
    var diff = olda - a;
    if (diff > 4)
      diff -= 8;
    diff = Math.abs(diff);
    r = 2 - diff;

    // decrease the value if the position hasn't changed (means a wall)
    if (s.x==olds.x && s.y==olds.y) {
      r -= 5;
    }
    return r;
  }

  function Q (s, a) {
    return getActionState(s.x, s.y, a);
  }

  function QL (n, alpha, gamma, totalTime) {
    var freq =  Math.floor(totalTime / n);
    for (var i = 0; i < n; ++i) {
      applyForEachActionState(function (x, y, a, qsa) {
        var s = {x: x, y: y};
        var aprime = bestAction(s);
        var sprime = move(s, aprime);
        return qsa + alpha*(getReward(sprime, aprime, s, a) + gamma*Q(sprime, aprime) - qsa);
      });
      computeStateFromActionState();
      $num_iteration.text(i);
    }
  }

  initActionState();
  QL(50, 0.04, 0.9, 3000);

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
    }).change();
  }

  function drawBestPath(ctx) {
      var myPos = { x: Math.floor(Math.random()*canvas.width/2 + canvas.width/4), 
                    y: Math.floor(Math.random()*canvas.height/2 + canvas.height/4) };
      var maxI=2000;
      ctx.fillStyle="black";
      while(1) {
          var actionMax=0, actionValMax=actionsStates[getActionStateIndex(myPos.x, myPos.y, 0)];
          //getReward(myPos,)
          for (var a = 1; a < ACTIONS.length; ++ a) {
            var i = getActionStateIndex(myPos.x, myPos.y, a);
            
            if (actionsStates[i] > actionValMax) {
              actionValMax = actionsStates[i];
              actionMax = a;
            }
          }
          myPos = move(myPos,actionMax);
          //console.log(i + "  Action " + actionMax + " New pos x" + myPos.x + " y" + myPos.y)
          if (maxI-- == 0) break;
          ctx.fillRect(myPos.x,myPos.y,1,1);
      }
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

    drawBestPath(ctx);

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
