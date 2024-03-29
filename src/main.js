import './style.css';
import { Group, SphereGeometry, MeshBasicMaterial, Mesh, BufferGeometry, BufferAttribute, LineBasicMaterial, Line, Clock } from 'three';
import { Agent, Environment } from 'flocc';
import { setUpParameters } from './setUpFromHash';
import { threeSetUp, resizeRendererToDisplaySize } from './setUpThreeJS';
import data from './attractor.json'

let seed = "6bf92a1154b94de2e2d3f95ca674faa3b680340f90290aa39d1bb444ad1e11c5";

// Attractor parameters
var parameters = setUpParameters(data, seed);

// /**
//  * Agent setup
//  */
let attractorGroup = null;
let environment = null;

// Get Canvas and add event listener for double tap
const canvas = document.querySelector('canvas.webgl');

// setup double tap to regenerate
var myLatestTap;
function doubleTap(event) {
  var now = new Date().getTime();
  var timeSince = now - myLatestTap;
  if (timeSince < 500 && timeSince > 0) {
    console.log('DoubleTap')
    event.preventDefault();
    parameters = setUpParameters(data, seed);
    repositionAgents(environment, parameters);
  }

  myLatestTap = new Date().getTime();
}

canvas.addEventListener('click', doubleTap);

// Set up ThreeJS components
var { scene, camera, controls, renderer } = threeSetUp(parameters, canvas);


const generateAttractor = () => {

  environment = new Environment();

  /**
   * Attractor Group
   */
  attractorGroup = new Group();

  // Add Equilibrium points
  const pGeo = new SphereGeometry(3, 64, 32);

  const p1Mat = new MeshBasicMaterial({
    color: parameters.point1.color
  });
  const p1Mesh = new Mesh(pGeo, p1Mat);
  p1Mesh.position.set(
    parameters.point1.x,
    parameters.point1.y,
    parameters.point1.z
  );
  attractorGroup.add(p1Mesh);

  const p2Mat = new MeshBasicMaterial({
    color: parameters.point2.color
  });
  const p2Mesh = new Mesh(pGeo, p2Mat);
  p2Mesh.position.set(
    parameters.point2.x,
    parameters.point2.y,
    parameters.point2.z
  );
  attractorGroup.add(p2Mesh);

  // add flying particles
  for (let i = 0; i < parameters.totalParticles; i++) {
    let { agent, agentMesh, agentTraceLine } = createAgent(parameters);
    attractorGroup.add(agentMesh);
    attractorGroup.add(agentTraceLine);
    environment.addAgent(agent);
  }
  scene.add(attractorGroup);
};

const repositionAgents = (environment, parameters) => {

  // Get agents
  let agentArray = environment.getAgents()

  // Reposition Agents
  agentArray.forEach(agent => {
    let color = agent.get('color');
    let pInit = parameters.getInitialPosition(color)
    agent.get('position').set(pInit[0], pInit[1], pInit[2]);
  }
  );

  environment.time = 0;
}

function createAgent(parameters) {
  // Get agent color
  const color = parameters.getColor();

  // Get agent initial position
  const p_init = parameters.getInitialPosition(color);

  // Create agent Sphere mesh
  const agentGeo = new SphereGeometry(parameters.particleSize);
  const agentMat = new MeshBasicMaterial({ color });
  const agentMesh = new Mesh(agentGeo, agentMat);
  agentMesh.position.set(p_init[0], p_init[1], p_init[2]);

  // Create agent traceline
  const traceGeo = new BufferGeometry();
  const positions = new Float32Array(parameters.particleTail * 3);
  let drawCount = 0;
  traceGeo.setAttribute('position', new BufferAttribute(positions, 3));
  traceGeo.setDrawRange(0, drawCount);
  const traceMaterial = new LineBasicMaterial({
    transparent: true,
    opacity: 0.5,
    color
  });

  const agentTraceLine = new Line(traceGeo, traceMaterial);
  agentTraceLine.frustumCulled = false;

  // Create agent
  const agent = new Agent();
  agent.set({ tick: tick_agent });
  agent.set('position', agentMesh.position);
  agent.set('traceLine', agentTraceLine);
  agent.set('color', color)
  agent.get('x', () => agent.get('position').x);
  agent.get('y', () => agent.get('position').y);
  agent.get('z', () => agent.get('position').z);

  return { agent, agentMesh, agentTraceLine }
}

function tick_agent(agent) {
  const { x, y, z } = agent.get('position');
  const { traceLine } = agent.getData();
  const positions = traceLine.geometry.attributes.position.array;
  const l = positions.length;
  if (environment.time < parameters.particleTail) {
    positions[3 * environment.time] = x;
    positions[3 * environment.time + 1] = y;
    positions[3 * environment.time + 2] = z;
    traceLine.geometry.attributes.position.needsUpdate = true; // required after the first render
    traceLine.geometry.setDrawRange(0, environment.time);
  } else {
    positions.set(positions.slice(3, l), 0); // slice de positions desde 6 hasta l, y poniendo al inicio de positions
    positions[l - 3] = x;
    positions[l - 2] = y;
    positions[l - 1] = z;
    traceLine.geometry.attributes.position.needsUpdate = true; // required after the first render
  }

  let { xNew, yNew, zNew } = parameters.getNextPoint({ x, y, z });

  agent.set('queue', () => {
    agent.get('position').set(xNew, yNew, zNew);
  });
}

/**
 * Animate
 */

let clock = new Clock();
let delta = 0;
// 30 fps
let interval = 1 / 30;

const tick = () => {
  window.requestAnimationFrame(tick);
  delta += clock.getDelta();

  if (delta >= interval) {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    // update attractor by ticking the environment
    environment.tick({ activation: 'uniform', count: 1, randomizeOrder: false });

    // Update controls
    controls.update();

    // Render
    renderer.render(scene, camera);
    // console.log(`${(1 / delta).toFixed(1)} FPS`);

    delta = delta % interval;
  }
};

generateAttractor();
tick();
