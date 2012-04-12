$(function(){
  var $canvas = $('#viewport');
  var $path = $('#path');
  var $step = $('#stats .step');
  var $objects = $('#objects');
  var $enableAnimation = $('#enableAnimation');
  var $enableQL = $('#enableQL');

  var n, alpha, gamma, width, height;

  var running;
  var world, worldRenderer, objectsRenderer, robot, robotRenderer;

  $enableQL.on("change", function() {
    if($(this).is(":checked")) {
      $canvas.removeClass('disabled');
      worldRenderer && worldRenderer.startRendering();
    }
    else {
      $canvas.addClass('disabled');
      worldRenderer && worldRenderer.stopRendering();
    }
  }).change();

  $enableAnimation.on("change", function() {
    robot && robot.setAnimated( $(this).is(":checked") );
  }).change();

  function init () {
    robotRenderer && robotRenderer.clean();
    worldRenderer && worldRenderer.clean();
    updateWidth();
    updateHeight();
    updateN();
    updateAlpha();
    updateGamma();
    if (!width || !height) return;

    world = new World(width, height);
    world.generateRandomItems(6, 4);
    worldRenderer = new WorldRenderer(world, $canvas[0]);
    objectsRenderer = new ObjectsRenderer(world, $objects);
    robot = new Robot(world, $enableAnimation.is(':checked'));
    robotRenderer = new RobotRenderer(robot, $path[0]);
  }

  function updateWidth () {
    if (running) return;
    try {
      var w = parseInt($("#width").val());
      if (w !== width) {
        width = w;
        init();
      }
    } catch (e) {}
  }
  function updateHeight () {
    if (running) return;
    try {
      var h = parseInt($("#height").val());
      if (h !== height) {
        height = h;
        init();
      }
    } catch (e) {}
  }
  function updateN () {
    if (running) return;
    try {
      n = parseInt($("#n").val());
    } catch (e) {}
  }
  function updateAlpha () {
    if (running) return;
    try {
      alpha = parseFloat($("#alpha").val());
    } catch (e) {}
  }
  function updateGamma () {
    if (running) return;
    try {
      gamma = parseFloat($("#gamma").val());
    } catch (e) {}
  }

  var ev = "keyup blur";
  $("#width").bind(ev, updateWidth);
  $("#height").bind(ev, updateHeight);
  $("#n").bind(ev, updateN);
  $("#alpha").bind(ev, updateAlpha);
  $("#gamma").bind(ev, updateGamma);

  init();
  var first = true;

  var $start = $("#start");
  $start.removeAttr("disabled");
  $start.click(function () {
    running = true;
    !first && init();
    $start.attr("disabled", "disabled");
    robotRenderer.startRendering();
    robot.E.sub("step", function (i) {
      $step.text(i);
    });
    worldRenderer.startRendering();
    robot.run(function () {
      first = false;
      running = false;
      $start.removeAttr("disabled");
      robotRenderer.stopRendering();
      worldRenderer.stopRendering();
    }, n, alpha, gamma);
  });

});
