import Gradient from 'javascript-color-gradient';
import gradientList from './gradients.json';
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


const backgroundMapping = {
  0: 0x000000,
  1: 0xeeeeee
};

const seed2SubstringInt = (seed, interval) => {
  let seedSubstring = seed.substring(interval[0], interval[1]);
  return parseInt(seedSubstring, 16);
}

const seed2Gradient = (seed) => {
  // Get seedInt from 0-5
  let seedInt = seed2SubstringInt(seed, [0, 5]);

  // Return the seed integer modulo 382 (the number of gradients available)
  const gradient = gradientList[seedInt % gradientList.length];
  const gradientName = gradient.name;
  const gradientColors = gradient.colors;

  // Define gradient steps candidates
  const stepCandidates = [2, 3, 4, 5, 6, 7];
  // Get new seedInt from 5-7
  seedInt = seed2SubstringInt(seed, [5, 7]);
  const gradientStep = stepCandidates[seedInt % stepCandidates.length]

  return { gradientName, gradientColors, gradientStep }
}

const seed2Particle = (seed) => {
  // Define candidate values for particle multiplier, tail and size
  let multiplierCandidates = [1, 10, 100];
  let tailCandidates = [10, 100, 1000, 10000];
  let sizeCandidates = [0.1, 1];

  // Extract a substring from seed and convert to integer for multiplier
  let seedInt = seed2SubstringInt(seed, [7, 9]);
  const particleMultiplier = multiplierCandidates[seedInt % multiplierCandidates.length];
  seedInt = seed2SubstringInt(seed, [9, 11]);
  const particleTail = tailCandidates[seedInt % tailCandidates.length];
  seedInt = seed2SubstringInt(seed, [11, 13]);
  const particleSize = sizeCandidates[seedInt % sizeCandidates.length];

  console.log(particleMultiplier, particleTail, particleSize)

  return { particleMultiplier, particleTail, particleSize }
}

export function setUpParameters(data, seed) {

  // Set up gradient parameters
  let { gradientName, gradientColors, gradientStep } = seed2Gradient(seed);
  let gradientArray = new Gradient()
    .setColorGradient(...gradientColors)
    .setMidpoint(gradientStep + 2) // Add 2 more to account for the 2 equilibrium points, their color should not be repeated.
    .getColors();

  // Set up particle parameters and calculate total particles
  let { particleMultiplier, particleTail, particleSize } = seed2Particle(seed);
  let totalParticles = gradientStep * particleMultiplier;

  // Create parameters object
  var parameters = {
    id: data.id,
    gradientName: gradientName,
    gradientArray: gradientArray,
    gradientStep: gradientStep,
    particleColorArray: gradientArray.slice(1, gradientArray.length - 1),
    particleMultiplier: particleMultiplier,
    particleTail: particleTail,
    particleSize: particleSize,
    totalParticles: totalParticles,
    dt: integrationStepMapping[data['is']],
    integrator: integrationMethodMapping[data['im']],
    sigma: data['s'],
    rho: data['r'],
    zP: data['r'] - 1,
    beta: data['b'],
    background: backgroundMapping[data['bg']],
    init: initialConditionsMapping[data['ic']],
  };

  parameters = setUpEquilibriumPoints(parameters);
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
    parameters.getInitialPosition = () => {
      return randomAroundPoint([0, 0, parameters.zP], rCloud);
    };
  } else if (init == 'Single') {
    // We need a random point in space around attractor middle point
    let scale = 40;
    let delta_scale = 0.5;
    let singleP = randomPointAroundAttractor(parameters, scale);
    parameters.getInitialPosition = () => {
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

    // get point around initial point for that color.
    parameters.getInitialPosition = color => {
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

    // get point along the color arm of the star
    let j = 0;
    parameters.getInitialPosition = color => {
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
    parameters.getInitialPosition = () => {
      return randomOriginRing(r);
    };
  } else if (init == 'Origin') {
    let r = 3;
    let delta_scale = r / 2.0;
    let p = randomOriginRing(r);
    parameters.getInitialPosition = () => {
      return randomAroundPoint(p, delta_scale);
    };
  } else if (init == 'Plane') {
    let zScale = parameters.zP * 0.8;
    let xScale = parameters.point1.x * 2;
    let yScale = parameters.point1.y * 2;
    // console.log(xScale, yScale, zScale);

    let z = zScale * (3 * Math.random() - 1);
    parameters.getInitialPosition = () => {
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

function setUpEquilibriumPoints(parameters) {
  parameters.point1 = {
    x: Math.sqrt(parameters.beta * (parameters.rho - 1)),
    y: Math.sqrt(parameters.beta * (parameters.rho - 1)),
    z: parameters.rho - 1,
    color: parameters.gradientArray[0]
  };
  parameters.point2 = {
    x: -Math.sqrt(parameters.beta * (parameters.rho - 1)),
    y: -Math.sqrt(parameters.beta * (parameters.rho - 1)),
    z: parameters.rho - 1,
    color: parameters.gradientArray[parameters.gradientArray.length - 1]
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
