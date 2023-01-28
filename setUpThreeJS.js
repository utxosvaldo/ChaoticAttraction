import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function threeSetUp(parameters, canvas) {
  // Scene
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(parameters.background);

  // Camera
  // Base camera
  const camera = new THREE.PerspectiveCamera(
    75,
    2, // the canvas default
    0.001,
    10000
  );
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = parameters.zP * 2.3;
  camera.lookAt(new THREE.Vector3(0, 0, parameters.zP));
  scene.add(camera);

  // Controls
  const controls = new OrbitControls(camera, canvas);

  controls.target.set(0, 0, parameters.zP);
  controls.enableDamping = true;

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas
  });

  return { scene, camera, controls, renderer };
}

export function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width = (canvas.clientWidth * pixelRatio) | 0;
  const height = (canvas.clientHeight * pixelRatio) | 0;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}
