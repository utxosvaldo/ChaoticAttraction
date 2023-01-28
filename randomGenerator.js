export function randomAroundPoint(p, r) {
  // Random position in a small sphere neigborhood or radius r around a point p.
  let pRandom = randomInsideUnitSphere();
  return [p[0] + r * pRandom[0], p[1] + r * pRandom[1], p[2] + r * pRandom[2]];
}

function randomInsideUnitSphere() {
  var u = Math.random();
  var v = Math.random();

  var theta = u * 2.0 * Math.PI;
  var phi = Math.acos(2.0 * v - 1.0);
  var r = Math.cbrt(Math.random());

  var sinTheta = Math.sin(theta);
  var cosTheta = Math.cos(theta);
  var sinPhi = Math.sin(phi);
  var cosPhi = Math.cos(phi);

  var x = r * sinPhi * cosTheta;
  var y = r * sinPhi * sinTheta;
  var z = r * cosPhi;

  return [x, y, z];
}

export function randomPointAroundAttractor(parameters, scale) {
  return [
    scale * (2 * Math.random() - 1),
    scale * (2 * Math.random() - 1),
    parameters.zP + scale * (2 * Math.random() - 1)
  ];
}

export function randomOriginRing(r) {
  // Random position around a ring of radius r and center in the origin. xy plane.

  let theta = 2.0 * Math.PI * Math.random();

  return [r * Math.cos(theta), r * Math.sin(theta), 0];
}
