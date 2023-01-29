import * as dat from 'lil-gui';

// Debug

export function setUpGUI(parameters, onFinishChange) {
  // Set up a controls panel on the user interface that allow to change this parameters.
  // On each change to this parameters, the onFinishedChange function is called
  const gui = new dat.GUI();

  gui
    .add(parameters, 'maxPoints')
    .min(0)
    .max(1000)
    .step(10)
    .onFinishChange(onFinishChange);
  gui
    .add(parameters, 'agentCount')
    .min(1)
    .max(1000)
    .step(10)
    .onFinishChange(onFinishChange);
  gui
    .add(parameters, 'sigma')
    .min(0)
    .max(20)
    .step(1)
    .onFinishChange(onFinishChange);
  gui
    .add(parameters, 'rho')
    .min(0)
    .max(30)
    .step(1)
    .onFinishChange(onFinishChange);
  gui
    .add(parameters, 'beta')
    .min(0)
    .max(5)
    .step(1)
    .onFinishChange(onFinishChange);
  gui
    .add(parameters, 'radius')
    .min(0.1)
    .max(0.5)
    .step(0.1)
    .onFinishChange(onFinishChange);
  gui
    .add(parameters, 'dt')
    .min(0.0001)
    .max(0.1)
    .step(0.001)
    .onFinishChange(onFinishChange);
  // gui
  //   .add(parameters, 'colorID', Object.keys(colors))
  //   .onFinishChange(onFinishChange);
  gui.add(parameters, 'axes').onFinishChange(onFinishChange);

  return gui;
}
