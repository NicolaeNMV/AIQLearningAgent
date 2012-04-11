// This code must be launched by a Web Worker

importScripts("globals.js");

onmessage = function (e) {
  var data = e.data;
  var world = World.fromObject(data.world);
  world.computeQL_here(function () {
    postMessage(world.actionsStates);
  }, data.n, data.alpha, data.gamma);
}
