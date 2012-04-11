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

if ( ! self.Int32Array ) {
	self.Int32Array = Array;
	self.Float32Array = Array;
}

function World (width, height) {
  var self = this;
  self.objects = [];

  self.width = width;
  self.height = height;
  self.actions = ACTIONS;

  self.actionsStates = new Float32Array(self.width*self.height*self.actions.length);

  var tmp = new Float32Array(self.width*self.height*self.actions.length);

  self.applyForEachActionState = function (f) {
    if (tmp.set)
      tmp.set(self.actionsStates);
    else {
      for (var i = 0; i < self.actionsStates.length; ++i)
        tmp[i] = self.actionsStates[i];
    } 

    for (var y = 0; y < height; ++ y) {
      for (var x = 0; x < width; ++ x) {
        for (var a = 0; a < self.actions.length; ++ a) {
          var i = self.getActionStateIndex(x, y, a);
          self.actionsStates[i] = f(x, y, a, tmp[i]);
        }
      }
    }
  }
  self.getActionStateIndex = function (x, y, a) {
    return a+self.actions.length*(x + y*width);
  }
  self.outOfRange = function (s) {
    return s.x < 0 || s.x >= width || s.y < 0 || s.y >= height;
  }
  self.Q = function (s, a) {
    return self.actionsStates[ self.getActionStateIndex(s.x, s.y, a) ];
  }
  self.QL = function (n, alpha, gamma) {
    var s = {};
    var sprime = {};
    for (var i = 0; i < n; ++i) {
      self.applyForEachActionState(function (x, y, a, qsa) {
        s.x = x;
        s.y = y;
        var aprime = self.bestAction(s);
        self.move(s, aprime, sprime);
        var value = qsa + alpha*(self.getReward(sprime, aprime, s, a) + gamma*self.Q(sprime, aprime) - qsa);
        return value;
      });
    }
  }

  self.computeQL_here = function (onDone, n, alpha, gamma) {
    self.applyForEachActionState(function(){ 
      return Math.random()*0.3; 
    });
    self.QL(n, alpha, gamma);
    onDone(self.actionsStates);
  }

  self.computeQL_inWorker = function (onDone, n, alpha, gamma) {
    var ww = new Worker("qlearning.js");
    ww.onmessage = function (e) {
      var data = e.data;
      self.actionsStates = data;
      onDone(self.actionsStates);
    }
    ww.postMessage({
      world: self.toObject(),
      n: n,
      alpha: alpha,
      gamma: gamma
    });
  }

  self.computeQL = function (onDone, n, alpha, gamma) {
    // Try to use web worker, fallback without
    if (!!window.Worker)
      self.computeQL_inWorker.apply(this, arguments);
    else
      self.computeQL_here.apply(this, arguments);
  }

  self.bestAction = function (s) {
    var bestA, best;
    var next = {};
    for (var a = 0; a < self.actions.length; ++a) {
      self.move(s, a, next);
      if (self.outOfRange(next)) continue; // OUT OF RANGE
      var v = self.Q(next, a);
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

  self.move = function (s, a, output) {
    var disp = self.actions[a];
    output.x = constraint(0, width-1, s.x + disp.x);
    output.y = constraint(0, height-1, s.y + disp.y);
  }

  // get a reward with a value in [-1, 1] 
  // depending on the angle change (it's better to continue forward)
  self.noReturnReward = function (a, olda) {
    var diff = (16+olda - a)%8;
    if (diff > 4)
      diff -= 8;
    diff = Math.abs(diff);
    diff = (1 - diff/2);
    return diff;
  }

  // get a reward with a value in [-1, 1] 
  // depending on the distance of a wall
  self.noWallReward = function (s) {
    if (s.x == 0 || s.y == 0 || s.x == width-1 || s.y == height-1)
      return -1;
    return 1;
  }

  // coming from an object get a reward 
  // depending on the object value
  self.objectsReward = function (olds) {
    var item = self.findItem(olds.x, olds.y);
    return !item ? 0 : item.value;
  }

  self.actionIsDiag = function (a) {
    return a % 2 == 1;
  }

  var SQRT_2 = Math.sqrt(2);
  self.getReward = function (s, a, olds, olda) {
    var r = 0;
    r += self.noReturnReward(a, olda);
    r += self.objectsReward(olds);
    r += self.noWallReward(s);

    if (self.actionIsDiag(olda)) {
      r /= SQRT_2;
    }

    return r;
  }

  self.findItem = function (x,y) {
    for (var i = self.objects.length - 1; i >= 0; i--) {
      if (self.objects[i].x == x && self.objects[i].y == y) 
        return self.objects[i];
    };
    return null;
  }

  self.putObject = function (O) {
    var x, y;
    var i = 10;
    do {
      x = Math.floor((0.95*Math.random())*width);
      y = Math.floor((0.95*Math.random())*height);
    } while ( 0 <-- i && self.findItem(x, y) );

    self.objects.push( $.extend({}, O, { x: x, y: y, value: Math.floor(O.value*(0.8+0.1*Math.random())) }) );
  }

  self.removeItem = function (o) {
    var i = self.objects.indexOf(o);
    if (i != -1) {
      self.objects.splice(i, 1);
    }
    o.node && o.node.addClass("eated");
  }

  self.generateRandomItems = function (nbGoods, nbBads) {
    for (var i = 0; i < nbGoods; ++ i) {
      self.putObject(GOODS[i%GOODS.length]);
    }
    for (var i = 0; i < nbBads; ++ i) {
      self.putObject(BADS[i%BADS.length]);
    }
  }
  
  self.finished = function () {
    for (var i = 0; i < self.objects.length; ++i) {
      if (self.objects[i].value > 0)
        return false;
    }
    return true;
  }

  self.clone = function () {
    return World.fromObject(self.toObject);
  }

  self.toObject = function () {
    var objects = [];
    for (var o = 0; o < self.objects.length; ++ o ) {
      var obj = self.objects[o];
      objects[o] = { 
        x: obj.x,
        y: obj.y,
        value: obj.value
      }
    }
    return {
      width: self.width,
      height: self.height,
      actions: self.actions,
      objects: objects
    }
  }
}

World.fromObject = function (o) {
  var w = new World (o.width, o.height, o.actions);
  w.objects = o.objects;
  return w;
}

function constraint (min, max, value) { return Math.max(min, Math.min(max, value)) }
function smoothstep (min, max, value) { return Math.max(0, Math.min(1, (value-min)/(max-min))); }

