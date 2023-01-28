import './style.css';
import * as THREE from 'three';
import { Agent, Environment } from 'flocc';
import { setUpParameters } from './setupFunctions';
import { threeSetUp, resizeRendererToDisplaySize } from './setUpThreeJS';
import data from './attractor.json'

// Attractor parameters
var parameters = setUpParameters(data);

// /**
//  * Agent setup
//  */
let attractorGroup = null;
let environment = null;

// Add Canvas
document.title = 'Chaotic Attraction #' + parameters.id;
// document.body.innerHTML += '<canvas class="webgl"></canvas>';
const canvas = document.querySelector('canvas.webgl');

// setup double tap to regenerate
var mylatesttap;
function doubletap(event) {
  var now = new Date().getTime();
  var timesince = now - mylatesttap;
  if (timesince < 500 && timesince > 0) {
    console.log('DoubleTap')
    event.preventDefault();
    parameters = setUpParameters(data);
    repositionAttractor();
  }

  mylatesttap = new Date().getTime();
}

canvas.addEventListener('click', doubletap);

// Set up ThreeJS components
var { scene, camera, controls, renderer } = threeSetUp(parameters, canvas);


const generateAttractor = () => {
  // Destroy old attractor
  if (attractorGroup !== null) {
    attractorGroup.clear();
    environment.clear();
    scene.remove(attractorGroup);
  }

  environment = new Environment();

  /**
   * Attractor Group
   */
  attractorGroup = new THREE.Group();
  // if (parameters.axes) {
  //   const axesHelper = new THREE.AxesHelper(50);
  //   attractorGroup.add(axesHelper);
  // }

  // Add Equilibrium points
  const pGeo = new THREE.SphereGeometry(3);

  const p1Mat = new THREE.MeshBasicMaterial({
    color: parameters.color1
  });
  const p1Mesh = new THREE.Mesh(pGeo, p1Mat);
  p1Mesh.position.set(
    parameters.point1.x,
    parameters.point1.y,
    parameters.point1.z
  );

  attractorGroup.add(p1Mesh);

  const p2Mat = new THREE.MeshBasicMaterial({
    color: parameters.color2
  });
  const p2Mesh = new THREE.Mesh(pGeo, p2Mat);
  p2Mesh.position.set(
    parameters.point2.x,
    parameters.point2.y,
    parameters.point2.z
  );

  attractorGroup.add(p2Mesh);

  // add flying particles
  var color;
  for (let i = 0; i < parameters.agentCount; i++) {
    // get random color from color array
    color = parameters.getColor();
    createAgent(environment, attractorGroup, color);
  }
  scene.add(attractorGroup);
};

const repositionAttractor = () => {

  // Get agents
  let agentArray = environment.getAgents()

  // Reposition Agents
  agentArray.forEach(agent => {
    let color = agent.get('color');
    let pInit = parameters.getPoint(color)
    // console.log(pInit)
    agent.get('position').set(pInit[0], pInit[1], pInit[2]);
    }
  );

  environment.time = 0;
}

function createAgent(environment, group, color) {
  const traceGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(parameters.maxPoints * 3);
  let drawCount = 0;
  traceGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  traceGeo.setDrawRange(0, drawCount);
  const traceMaterial = new THREE.LineBasicMaterial({
    transparent: true,
    opacity: 0.5,
    color,
    linewidth: 1
  });
  const traceLine = new THREE.Line(traceGeo, traceMaterial);
  traceLine.frustumCulled = false;
  group.add(traceLine);

  const agent = new Agent();
  agent.set({ tick: tick_agent });

  const agentGeo = new THREE.SphereGeometry(parameters.radius);
  const agentMat = new THREE.MeshBasicMaterial({ color });
  const agentMesh = new THREE.Mesh(agentGeo, agentMat);

  const p_init = parameters.getPoint(color);

  agentMesh.position.set(p_init[0], p_init[1], p_init[2]);
  agent.set('position', agentMesh.position);
  agent.set('traceLine', traceLine);
  agent.set('color', color)
  agent.get('x', () => agent.get('position').x);
  agent.get('y', () => agent.get('position').y);
  agent.get('z', () => agent.get('position').z);

  environment.addAgent(agent);
  group.add(agentMesh);
}

// function repositionAgent(agent){
//   let color = agent.get('color')

// }

function tick_agent(agent) {

  // agent = repositionAgent(agent);

  const { x, y, z } = agent.get('position');
  const { traceLine } = agent.getData();
  const positions = traceLine.geometry.attributes.position.array;
  const l = positions.length;
  if (environment.time < parameters.maxPoints) {
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

const tick = () => {
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

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};




generateAttractor();
tick();
