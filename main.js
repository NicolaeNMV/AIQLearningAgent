$(function(){
  var $canvas = $('#viewport');
  var $path = $('#path');
  var canvas = $canvas[0];
  var $step = $('#stats .step');

  var WIDTH = 30;
  var HEIGHT = 20;


  // CONSTANTS
  var DEAMON = { fillStyle: "rgb(255,0,100)", className: "deamon", value: -50 }
  var JEWEL = { className: "jewel", value: 50, consumable: true }

  var goodProperty = {consumable: true}
  var badProperty = { fillStyle: "rgb(255,0,100)" }
  var TOYS = []
  TOYS.push( $.extend({ value:-10,className:'hellfire'}, badProperty) )
  TOYS.push( $.extend({ value:-10,className:'deamon'}, badProperty) )
  TOYS.push( $.extend({ value:-10,className:'veryangry'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'jewel'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'love'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'paradise'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'pizza'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'jewel'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'love'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'paradise'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'pizza'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'jewel'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'love'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'paradise'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'pizza'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'jewel'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'love'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'paradise'}, goodProperty) )
  TOYS.push( $.extend({ value:10,className:'pizza'}, goodProperty) )


  

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
  /*for (var i = 0; i < 3; ++i) {
    var x = Math.floor(Math.random()*WIDTH);
    var y = Math.floor(Math.random()*HEIGHT);
    objects.push($.extend({}, DEAMON, { x: x, y: y, value: Math.round(DEAMON.value*(1+Math.random()*0.5)) }));
    console.log("DEAMON at ", x, y);
  }
  for (var i = 0; i < 6; ++i) {
    var x = Math.floor(Math.random()*WIDTH);
    var y = Math.floor(Math.random()*HEIGHT);
    objects.push($.extend({}, JEWEL, { x: x, y: y, value: Math.round(JEWEL.value*(1+Math.random()*0.5)) }));
    console.log("JEWEL at ", x, y);
  }*/
  for (var i = 0; i<TOYS.length; ++i) {
    var x = Math.floor(Math.random()*WIDTH);
    var y = Math.floor(Math.random()*HEIGHT);
    objects.push($.extend({ x: x, y: y }, TOYS[i]));
  } 

  function finished () {
    for (var i = 0; i < objects.length; ++i) {
      if (objects[i].consumable)
        return false;
    }
    return true;
  }

  function removeItem (o) {
    var i = objects.indexOf(o);
    if (i != -1) {
      objects.splice(i, 1);
    }
    o.node.css("opacity", 0);
  }

  function findItem(x,y) {
    for (var i = objects.length - 1; i >= 0; i--) {
      if (objects[i].x == x && objects[i].y == y) 
        return objects[i];
    };
    return null;
  }

  var actionsStates;

  function outOfRange (s) {
    return s.x < 0 || s.x >= WIDTH || s.y < 0 || s.y >= HEIGHT;
  }
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

    for (var y = 0; y < HEIGHT; ++ y) {
      for (var x = 0; x < WIDTH; ++ x) {
        for (var a = 0; a < ACTIONS.length; ++ a) {
          var i = getActionStateIndex(x, y, a);
          actionsStates[i] = f(x, y, a, old[i]);
        }
      }
    }
  }
  function getActionStateIndex (x, y, a) {
    return a+ACTIONS.length*(x + y*WIDTH);
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
    for (var y = 0; y < HEIGHT; ++ y) {
      for (var x = 0; x < WIDTH; ++ x) {
        var i = y*WIDTH + x;
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
      x: constraint(0, WIDTH-1, s.x + disp.x), 
      y: constraint(0, HEIGHT-1, s.y + disp.y)
    }
  }


  function bestAction (s) {
    var bestA = 0; //Math.floor(Math.random()*8);
    var best = Q(move(s, bestA), bestA);
    for (var a = 1; a < ACTIONS.length; ++a) {
      if (outOfRange(s)) 
        continue; // OUT OF RANGE
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

    return 0;
    // FIXME

    var r = 0;

    // init r with a value in [-2, 2] depending on the angle change (it's better to continue forward)
    var diff = (16+olda - a)%8;
    if (diff > 4)
      diff -= 8;
    diff = Math.abs(diff);
    r = 2 - diff;

    return r;
  }

  function Q (s, a) {
    return getActionState(s.x, s.y, a);
  }

  function QL (n, alpha, gamma) {
    for (var i = 0; i < n; ++i) {
      applyForEachActionState(function (x, y, a, qsa) {
        var s = {x: x, y: y};
        var aprime = bestAction(s);
        var sprime = move(s, aprime);
        return qsa + alpha*(getReward(sprime, aprime, s, a) + gamma*Q(sprime, aprime) - qsa);
      });
      computeStateFromActionState();
    }
  }

  function computeQL() {
    initActionState();
    QL(50, 0.1, 0.9);
    dirty = true;
  }
  computeQL();

  function computeStateFromActionState () {
    for (var y = 0; y < HEIGHT; ++ y) {
      for (var x = 0; x < WIDTH; ++ x) {
        var sum = 0;
        var s = x + y*WIDTH;
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
  ctx.scale(canvas.width/WIDTH, canvas.height/HEIGHT);

  var qlEnabled;

  function setup () {
    var $objects = $('#objects');
    objects.forEach(function (o) {
      var node = $('<div class="object" />').
        addClass(o.className).
        css("top", $canvas.height()*((o.y+0.5)/HEIGHT)+'px').
        css("left", $canvas.width()*((o.x+0.5)/WIDTH)+'px').
        append('<span class="image" />').
        append($('<span class="weight" />').text(o.value));
      o.node = node;
      $objects.append(node);
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

  var robot = {
    initialPosition: { x: Math.floor(Math.random()*WIDTH/2 + WIDTH/4), 
                    y: Math.floor(Math.random()*HEIGHT/2 + HEIGHT/4) },
    path: [],
    eated: []
  };

  robot.position = robot.initialPosition;

  function runRobotStep() {
    var item = findItem(robot.position.x, robot.position.y);
    if (item != null) {
      removeItem(item);
      robot.eated.push({ x: robot.position.x, y: robot.position.y });
      computeQL();
    }
    var actionMax = bestAction(robot.position);
    robot.position = move(robot.position, actionMax);
    robot.path.push({ x: robot.position.x, y: robot.position.y });
  }

  function getCanvasPosition (p) {
    return {
      x: (p.x+0.5)*canvas.width/WIDTH,
      y: (p.y+0.5)*canvas.height/HEIGHT
    }
  }

  function renderRobot(ctx, o) {
      ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
      var p;
      ctx.strokeStyle="black";
      ctx.lineWidth = 1;
      ctx.fillStyle="black";
      ctx.beginPath();
      p = getCanvasPosition(o.position);
      ctx.arc(p.x, p.y, 4, 0, 2*Math.PI);
      ctx.fill();
      p = getCanvasPosition(o.initialPosition);
      ctx.arc(p.x, p.y, 2, 0, 2*Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      for (var i = 0; i < o.path.length; ++i) {
        var p = getCanvasPosition(o.path[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.fillStyle="rgb(100,255,100)";
      for (var i = 0; i < o.eated.length; ++i) {
        var p = getCanvasPosition(o.eated[i]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, 2*Math.PI);
        ctx.fill();
      }
  }

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
      ctx.fillStyle = "rgb("+[r,g,b]+")";
      ctx.fillRect(x, y, 1, 1);
    });
  }

  setup();
  requestAnimFrame(function loop () {
    requestAnimFrame(loop);
    render();
  }, canvas);

  var i = 0;
  var MAX_MOVE = 500;
  var interval = setInterval(function() {
    ++ i;
    if (finished() || i > MAX_MOVE) {
      clearInterval(interval);
      return;
    }
    runRobotStep();
  }, 200);

  var pathCtx = $path[0].getContext("2d");
  var lastI = -1;
  requestAnimFrame(function loop () {
    requestAnimFrame(loop);
    if (lastI != i) {
      lastI = i;
      renderRobot(pathCtx, robot);
      $step.text(i);
    }
  }, $path[0]);
});
