$(function(){
  var $canvas = $('#viewport');
  var $path = $('#path');
  var $step = $('#stats .step');
  var $objects = $('#objects');
  var $enableAnimation = $('#enableAnimation');

  $enableAnimation.on("change", function() {
    if($(this).is(":checked")) {
      if (robot) robot.animated = true;
    }
    else {
      if (robot) robot.animated = false;
    }
  }).change();

  var n, alpha, gamma, width, height;

  var running;
  var world, worldRenderer, objectsRenderer, robot;

  var $enableQL = $('#enableQL');
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

  function init () {
    robot && robot.clean();
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
    robot = new Robot(world, $path[0], $enableAnimation.is(':checked'));
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
    robot.startRendering();
    robot.E.sub("step", function (i) {
      $step.text(i);
    });
    worldRenderer.startRendering();
    robot.run(function () {
      first = false;
      running = false;
      $start.removeAttr("disabled");
      robot.stopRendering();
      worldRenderer.stopRendering();
    }, n, alpha, gamma);
  });

});
