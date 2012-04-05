$(function(){
  var $canvas = $('#viewport');
  var $path = $('#path');
  var canvas = $canvas[0];
  var $step = $('#stats .step');

  var WIDTH = 30;
  var HEIGHT = 20;

  var NB_GOODS = 6;
  var NB_BADS = 4;

  var MAX_MOVE = 1000;

  // CONSTANTS
  
  // reward object values must be normalized in a [-100, 100] range
  var GOODS = [
    { className: "jewel", value: 90 },
    { className: "paradise", value: 20 },
    { className: "pizza", value:30 },
    { className: "love", value: 50 }
  ];
  var BADS = [
    { className: "deamon",    value: -50 },
    { className: "hellfire",  value: -10 },
    { className: "veryangry", value: -90 }
  ];
  
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
  var robotDirty = true;

  var enableAnimation;

  // STATES
  var objects = [];

  function putObject (O) {
    var x, y;
    var i = 10;
    do {
      x = Math.floor((0.95*Math.random())*WIDTH);
      y = Math.floor((0.95*Math.random())*HEIGHT);
    } while ( 0 <-- i && findItem(x, y) );

    objects.push( $.extend({}, O, { x: x, y: y, value: Math.floor(O.value*(0.8+0.1*Math.random())) }) );
  }

  for (var i = 0; i < NB_GOODS; ++ i) {
    putObject(GOODS[i%GOODS.length]);
  }
  
  for (var i = 0; i < NB_BADS; ++ i) {
    putObject(BADS[i%BADS.length]);
  }

  function finished () {
    for (var i = 0; i < objects.length; ++i) {
      if (objects[i].value > 0)
        return false;
    }
    return true;
  }

  function removeItem (o) {
    var i = objects.indexOf(o);
    if (i != -1) {
      objects.splice(i, 1);
    }
    o.node.addClass("eated");
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
    var bestA, best;
    for (var a = 0; a < ACTIONS.length; ++a) {
      var next = move(s, a);
      if (outOfRange(next)) 
        continue; // OUT OF RANGE
      var v = Q(next, a);
      if (bestA === undefined) {
        bestA = a;
        best = v;
      }
      if(v > best) {
        best = v;
        bestA = a;
      }
    }
    return bestA;
  }

  // get a reward with a value in [-1, 1] 
  // depending on the angle change (it's better to continue forward)
  function noReturnReward (a, olda) {
    var diff = (16+olda - a)%8;
    if (diff > 4)
      diff -= 8;
    diff = Math.abs(diff);
    diff = (1 - diff/2);
    return diff;
  }

  // get a reward with a value in [-1, 1] 
  // depending on the distance of a wall
  function noWallReward (s) {
    if (s.x == 0 || s.y == 0 || s.x == WIDTH-1 || s.y == HEIGHT-1)
      return -1;
    return 1;
  }

  // coming from an object get a reward 
  // depending on the object value
  function objectsReward (olds) {
    var item = findItem(olds.x, olds.y);
    return !item ? 0 : item.value;
  }

  function actionIsDiag (a) {
    return a % 2 == 1;
  }

  var SQRT_2 = Math.sqrt(2);
  function getReward (s, a, olds, olda) {
    var r = 0;
    r += noReturnReward(a, olda);
    r += objectsReward(olds);
    r += noWallReward(s);

    if (!actionIsDiag(olda)) {
      r *= SQRT_2;
    }

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
    QL(WIDTH+HEIGHT, 0.5, 0.95);
    dirty = true;
  }

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
    robotDirty = true;
  }

  function getCanvasPosition (p) {
    return {
      x: (p.x+0.5)*canvas.width/WIDTH,
      y: (p.y+0.5)*canvas.height/HEIGHT
    }
  }

  function renderRobot(ctx, o) {
    if (!robotDirty) return;
    robotDirty = false;
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
    for (var i = 0; i < o.eated.length; ++i) {
      var p = getCanvasPosition(o.eated[i]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, 2*Math.PI);
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


  var pathCtx = $path[0].getContext("2d");
  requestAnimFrame(function loop () {
    requestAnimFrame(loop);
    renderRobot(pathCtx, robot);
  }, $path[0]);

  function runAnimated () {
    computeQL();
    var i = 0;
    var interval = setInterval(function() {
      ++ i;
      if (finished() || i > MAX_MOVE) {
        clearInterval(interval);
        return;
      }
      $step.text(i);
      runRobotStep();
    }, 200);
  }

  function run () {
    computeQL();
    $step.text('');
    for (var i = 0; i < MAX_MOVE && !finished(); ++ i) {
      runRobotStep();
    }
  }

  function start () {
    if (enableAnimation)
      runAnimated();
    else
      run();
  }

  var $enableAnimation = $('#enableAnimation');
  $enableAnimation.on("change", function() {
    if($(this).is(":checked")) {
      enableAnimation = true;
    }
    else {
      enableAnimation = false;
    }
  }).change();

  var $start = $("#start");
  $start.click(function(){
    $start.attr("disabled", "disabled");
    start();
  }).click();

});
