$(function(){
  var $canvas = $('#viewport');
  var $path = $('#path');
  var canvas = $canvas[0];
  var $step = $('#stats .step');

  var MAX_MOVE = 1000;


  // dirty variables used for rendering
  var running = false;
  var dirty = true;
  var robotDirty = true;

  var animated = false;
  var animationDuration = 200;

  var states;
  // init states

  /// UTILS
  // newValue = f (x, y, action, currentValue)
  // is called for each state

  function forEachState (f) {
    if (!states) return;
    for (var y = 0; y < world.height; ++ y) {
      for (var x = 0; x < world.width; ++ x) {
        var i = y*world.width + x;
        f(x, y, states[i]);
      }
    }
  }

  // COMPUTING

  function computeStateFromActionState (as) {
    states = new Float32Array(world.width*world.height);
    for (var y = 0; y < world.height; ++ y) {
      for (var x = 0; x < world.width; ++ x) {
        var sum = 0;
        var s = x + y*world.width;
        for (var a = 0; a < world.actions.length; ++ a) {
          var i = a+world.actions.length*s;
          sum += as[i];
        }
        states[s] = sum / world.actions.length;
      }
    }
  }


  // RENDERING
  var ctx = canvas.getContext('2d');

  var qlEnabled;

  function setup () {
    
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


  var robot;

  function getCanvasPosition (p) {
    return {
      x: (p.x+0.5)*canvas.width/world.width,
      y: (p.y+0.5)*canvas.height/world.height
    }
  }

  function renderRobot(ctx, o) {
    if (!robotDirty || !running) return;
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
    if (!dirty || !qlEnabled || !running) return;
    dirty = false;

    ctx.save();
    ctx.scale(canvas.width/world.width, canvas.height/world.height);

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
    ctx.restore();
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


  function runRobotStep(onDone) {
    function end () {
      var actionMax = world.bestAction(robot.position);
      world.move(robot.position, actionMax, robot.position);
      robot.path.push({ x: robot.position.x, y: robot.position.y });
      robotDirty = true;
      if (animated) {
        setTimeout(onDone, animationDuration);
      }
      else
        onDone();
    }
    var item = world.findItem(robot.position.x, robot.position.y);
    if (item != null) {
      world.removeItem(item);
      robot.eated.push({ x: robot.position.x, y: robot.position.y });
      world.computeQL(function (as) {
        computeStateFromActionState(as);
        dirty = true;
        end();
      }, world.width+world.height, 0.5, 0.95);
    }
    else {
      end();
    }
  }


  function run (onEnd) {
    robot = {
      position: {},
      initialPosition: { x: Math.floor(Math.random()*world.width/2 + world.width/4), 
        y: Math.floor(Math.random()*world.height/2 + world.height/4) },
      path: [],
      eated: []
    };

    robot.position.x = robot.initialPosition.x;
    robot.position.y = robot.initialPosition.y;
    var i = 0;

    function loop () {
      if (world.finished() || i > MAX_MOVE) {
        robotDirty = true;
        dirty = true;
        setTimeout(function() {
          running = false;
        }, 10);
        return onEnd && onEnd();
      }
      $step.text(i);
      ++ i;
      runRobotStep(loop);
    }

    running = true;
    world.computeQL(function (as) {
      computeStateFromActionState(as);
      dirty = true;
      loop();
    }, world.width+world.height, 0.5, 0.95);
  }

  var $enableAnimation = $('#enableAnimation');
  $enableAnimation.on("change", function() {
    if($(this).is(":checked")) {
      animated = true;
    }
    else {
      animated = false;
    }
  }).change();

  var $start = $("#start");
  $start.click(function () {
    world = new World(30, 20);
    world.generateRandomItems(6, 4);
    var $objects = $('#objects').empty();
    world.objects.forEach(function (o) {
      var node = $('<div class="object" />').
        addClass(o.className).
        css("top", $canvas.height()*((o.y+0.5)/world.height)+'px').
        css("left", $canvas.width()*((o.x+0.5)/world.width)+'px').
        append('<span class="image" />').
        append($('<span class="weight" />').text(o.value));
      o.node = node;
      $objects.append(node);
    });
    $start.attr("disabled", "disabled");
    run(function () {
      $start.removeAttr("disabled");
    });
  });

});
