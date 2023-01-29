import Gradient from 'javascript-color-gradient';
import {
  randomAroundPoint,
  randomPointAroundAttractor,
  randomOriginRing
} from './randomGenerator';

function rotateVectorXYPlane(v, theta) {
  // Rotates the vector in the XY plane by theta radians
  let cosTheta = Math.cos(theta);
  let sinTheta = Math.sin(theta);
  return [
    v[0] * cosTheta - v[1] * sinTheta,
    v[0] * sinTheta + v[1] * cosTheta,
    v[2]
  ];
}

const initialConditionsMapping = {
  "1": "Cloud", "2": "Single", "3": "Fusion", "4": "Ring", "5": "Origin", "6": "Plane", "7": "Lines", "8": "Random"
}

const integrationStepMapping = {
  0: 0.001,
  1: 0.005
};

const integrationMethodMapping = {
  0: 'Euler',
  1: 'Runge-Kutta'
};

const particleSizeMapping = {
  0: 0.1,
  1: 1
};

const backgroundMapping = {
  0: 0x000000,
  1: 0xeeeeee
};

export function setUpParameters(data) {
  let gradientColors = data["gc"];
  let gradientStep = data["pc"];
  let gradientArray = new Gradient()
    .setColorGradient(...gradientColors)
    .setMidpoint(gradientStep + 2)
    .getColors();
  let particleMultiplier = data['pm'];
  let totalParticles = gradientStep * particleMultiplier;

  // Create parameters object
  var parameters = {
    id: data.id,
    gradientArray: gradientArray,
    gradientStep: gradientStep,
    particleColorArray: gradientArray.slice(1, gradientArray.length - 1),
    particleMultiplier: particleMultiplier,
    color1: gradientArray[0],
    color2: gradientArray[gradientArray.length - 1],
    maxPoints: data['pt'],
    agentCount: totalParticles,
    radius: particleSizeMapping[data['ps']],
    dt: integrationStepMapping[data['is']],
    integrator: integrationMethodMapping[data['im']],
    sigma: data['s'],
    rho: data['r'],
    zP: data['r'] - 1,
    beta: data['b'],
    background: backgroundMapping[data['bg']],
    axes: false,
    init: initialConditionsMapping[data['ic']]
  };

  parameters = setUpMainPoints(parameters);
  parameters = setUpInitialConditions(parameters);
  parameters = setUpIntegration(parameters);

  return parameters;
}

function setUpInitialConditions(parameters) {
  let init = parameters.init
  if (init == 'Random') {
    let initConditionsArray = Object.keys(initialConditionsMapping).map(
      function (key) {
        return initialConditionsMapping[key];
      }
    );
    let initArray = initConditionsArray.slice(
      0,
      initConditionsArray.length - 1
    );
    let randomInit = initArray[Math.floor(Math.random() * initArray.length)];
    init = randomInit;
  }
  // parameters.init = init;

  let nColors = parameters.particleColorArray.length;

  // parameters.getColor = () => {
  //   return parameters.particleColorArray[Math.floor(Math.random() * nColors)];
  // };

  // get next color. we want the same number of particles for each color
  let i = 0;
  let nextColor = null;
  parameters.getColor = () => {
    nextColor = parameters.particleColorArray[i % parameters.gradientStep];
    i++;
    return nextColor;
  };

  if (init == 'Cloud') {
    // We need a random Radius for the cloud of points
    let radius_scale = 100;
    let rCloud = Math.random() * radius_scale;
    parameters.getPoint = () => {
      return randomAroundPoint([0, 0, parameters.zP], rCloud);
    };
  } else if (init == 'Single') {
    // We need a random point in space around attractor middle point
    let scale = 40;
    let delta_scale = 0.5;
    let singleP = randomPointAroundAttractor(parameters, scale);
    parameters.getPoint = () => {
      return randomAroundPoint(singleP, delta_scale);
    };
  } else if (init == 'Fusion') {
    // We need [gradient_step] points in space ans asociate each to one of the gradientArray
    let scale = 40;
    let delta_scale = 0.5;
    let colorPointMapping = {};
    parameters.particleColorArray.forEach(color => {
      colorPointMapping[color] = randomPointAroundAttractor(parameters, scale);
    });

    // // get next color. different from all other initial conditions. we want the same number of particles for each color
    // let i = 0;
    // let nextColor = null;
    // parameters.getColor = () => {
    //   nextColor = parameters.particleColorArray[i % parameters.gradientStep];
    //   i++;
    //   return nextColor;
    // };

    // get point around initial point for that color.
    parameters.getPoint = color => {
      let p = colorPointMapping[color];
      return randomAroundPoint(p, delta_scale);
    };
  } else if (init == 'Lines') {
    let scale = 100;
    let l = scale * Math.random();
    let d = l / parameters.particleMultiplier;
    let theta = (2 * Math.PI) / parameters.gradientStep;

    // get initial point around unit circle
    let p0 = randomOriginRing(1);

    // get all points of the star
    let n = 0;
    let colorPointMapping = {};
    parameters.particleColorArray.forEach(color => {
      colorPointMapping[color] = rotateVectorXYPlane(p0, theta * n);
      n++;
    });

    // // get next color. we want the same number of particles for each color
    // let i = 0;
    // let nextColor = null;
    // parameters.getColor = () => {
    //   nextColor = parameters.particleColorArray[i % parameters.gradientStep];
    //   i++;
    //   return nextColor;
    // };

    // get point along the color arm of the star
    let j = 0;
    parameters.getPoint = color => {
      // get point of star of corresponding color in unit circle
      let pn = colorPointMapping[color];
      // get scale to multiply vector
      let scale = d * Math.floor(1 + j / parameters.gradientStep);
      let p = [scale * pn[0], scale * pn[1], parameters.zP];
      j++;
      return p;
    };
  } else if (init == 'Ring') {
    let scale = 100;
    let r = scale * Math.random();
    parameters.getPoint = () => {
      return randomOriginRing(r);
    };
  } else if (init == 'Origin') {
    let r = 3;
    let delta_scale = r / 2.0;
    let p = randomOriginRing(r);
    parameters.getPoint = () => {
      return randomAroundPoint(p, delta_scale);
    };
  } else if (init == 'Plane') {
    let zScale = parameters.zP * 0.8;
    let xScale = parameters.point1.x * 2;
    let yScale = parameters.point1.y * 2;
    // console.log(xScale, yScale, zScale);

    let z = zScale * (3 * Math.random() - 1);
    parameters.getPoint = () => {
      let p = [
        xScale * (2 * Math.random() - 1),
        yScale * (2 * Math.random() - 1),
        z
      ];
      return p;
    };
  }

  return parameters;
}

function setUpMainPoints(parameters) {
  parameters.point1 = {
    x: Math.sqrt(parameters.beta * (parameters.rho - 1)),
    y: Math.sqrt(parameters.beta * (parameters.rho - 1)),
    z: parameters.rho - 1
  };
  parameters.point2 = {
    x: -Math.sqrt(parameters.beta * (parameters.rho - 1)),
    y: -Math.sqrt(parameters.beta * (parameters.rho - 1)),
    z: parameters.rho - 1
  };

  return parameters;
}

function setUpIntegration(parameters) {
  // time step
  let dt = parameters.dt;

  // Lorentz equations

  // dx/dt = f
  let f = (x, y) => {
    return parameters.sigma * (y - x);
  };

  // dy/dt = g
  let g = (x, y, z) => {
    return x * (parameters.rho - z) - y;
  };

  // dz/dt = h
  let h = (x, y, z) => {
    return x * y - parameters.beta * z;
  };

  // Integrators

  if (parameters.integrator == 'Euler') {
    let eulerInt = (xOld, yOld, zOld) => {
      let xNew = xOld + dt * f(xOld, yOld);
      let yNew = yOld + dt * g(xOld, yOld, zOld);
      let zNew = zOld + dt * h(xOld, yOld, zOld);

      return { xNew, yNew, zNew };
    };

    parameters.getNextPoint = p => {
      return eulerInt(p.x, p.y, p.z);
    };
  } else if (parameters.integrator == 'Runge-Kutta') {
    let rungeKutta4Int = (xOld, yOld, zOld) => {
      const [x0, y0, z0] = [xOld, yOld, zOld];
      const k0 = dt * f(x0, y0);
      const l0 = dt * g(x0, y0, z0);
      const m0 = dt * h(x0, y0, z0);

      const [x1, y1, z1] = [xOld + k0 / 2, yOld + l0 / 2, zOld + m0 / 2];
      const k1 = dt * f(x1, y1);
      const l1 = dt * g(x1, y1, z1);
      const m1 = dt * h(x1, y1, z1);

      const [x2, y2, z2] = [xOld + k1 / 2, yOld + l1 / 2, zOld + m1 / 2];
      const k2 = dt * f(x2, y2);
      const l2 = dt * g(x2, y2, z2);
      const m2 = dt * h(x2, y2, z2);

      const [x3, y3, z3] = [xOld + k2, yOld + l2, zOld + m2];
      const k3 = dt * f(x3, y3);
      const l3 = dt * g(x3, y3, z3);
      const m3 = dt * h(x3, y3, z3);

      const xNew = xOld + (k0 + 2 * k1 + 2 * k2 + k3) / 6;
      const yNew = yOld + (l0 + 2 * l1 + 2 * l2 + l3) / 6;
      const zNew = zOld + (m0 + 2 * m1 + 2 * m2 + m3) / 6;

      return { xNew, yNew, zNew };
    };
    parameters.getNextPoint = p => {
      return rungeKutta4Int(p.x, p.y, p.z);
    };
  }

  return parameters;
}
