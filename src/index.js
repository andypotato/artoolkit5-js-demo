import 'reset-css';
import './css/style.css';

import * as THREE from 'three';
import ARToolkit from 'artoolkit5-js';
import cameraConfig from './config';

let sourceVideo;
let targetCanvas;

// AR controller reference
let arc;

// internal HIRO marker ID
let markerId;

// used to render THREE.js scene
let renderer, scene, camera, markerRoot;


window.addEventListener("DOMContentLoaded", () => {

  initCamera(cameraConfig)
  .then(video => {

    // start camera playback
    sourceVideo = video;
    sourceVideo.width = cameraConfig.video.width;
    sourceVideo.height = cameraConfig.video.height;
    sourceVideo.play();

    // init target canvas
    initTargetCanvas();

    // init THREE renderer
    initRenderer();

    return new Promise(resolve => {
      sourceVideo.addEventListener("loadeddata", event => {
        console.log("Camera is ready");
        resolve();
      });
    });
  })
  .then(_ => {
    return initAR();
  })
  .then(_ => {

    console.log("AR controller initialized");
    startProcessing();
  });

});


// initializers
//------------------------------------------------------------------------------

async function initCamera(config) {

  const constraints = {
    audio: false,
    video: {
      //facingMode: "environment",
      facingMode: "user",
      width: config.video.width,
      height: config.video.height,
      frameRate: { max: config.video.fps }
    }
  };

  // initialize video source
  const video = document.querySelector("#sourcevideo");
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
};

async function initAR() {

  // init AR controller
  // Note: this camera_para.dat file works well for most built-in laptop webcams
  // It does NOT work very well for newer iPhone models (X / XS / 11)
  // The cube will be off quite a bit.
  arc = await ARToolkit.ARController.initWithDimensions(
    cameraConfig.video.width, cameraConfig.video.height,
    '/data/camera_para.dat'
  );
  console.log("AR Controller initialized");

  // add HIRO marker
  markerId = await arc.artoolkit.addMarker(arc.id, '/data/hiro.patt');
  console.log("HIRO marker added with marker ID", markerId);
}

function initTargetCanvas() {
  // target canvas should overlap source video
  targetCanvas = document.querySelector("#targetcanvas");
  targetCanvas.width = sourceVideo.width;
  targetCanvas.height = sourceVideo.height;
}

function initRenderer() {

  // create a scene overlaying the video
  renderer = new THREE.WebGLRenderer({ canvas: targetCanvas, alpha: true });
  renderer.setSize(cameraConfig.video.width, cameraConfig.video.height);
  renderer.setClearColor(0xffffff, 0);
  renderer.autoClear = false;

  // init camera
  camera = new THREE.Camera();
  camera.matrixAutoUpdate = false;

  scene = new THREE.Scene();
  scene.add(camera);

  const light1 = new THREE.PointLight(0xffffff);
  light1.position.set(400, 500, 100);
  scene.add(light1);
  const light2 = new THREE.PointLight(0xffffff);
  light2.position.set(-400, -500, -100);
  scene.add(light2);

  markerRoot = new THREE.Object3D();
  markerRoot.markerMatrix = new Float64Array(12);
  markerRoot.matrixAutoUpdate = false;

  // create a simple cube
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0xffffff, wireframe: false })
  );

  // position the cube on top of the marker
  cube.position.z = 0.5;

  markerRoot.add(cube);
  scene.add(markerRoot);  
}

// main detection loop
//------------------------------------------------------------------------------
function startProcessing() {

  const processFrame = () => {

    const result = arc.detectMarker(sourceVideo);
    if(result !== 0) {
      // ARToolkit returning a value !== 0 means an error occured
      console.log('Error detecting markers');
      return;
    }

    // get the total number of detected markers in frame
    const markerNum = arc.getMarkerNum();
    let hiroMarkerNum = false;

    // check if one of the detected markers is the HIRO marker
    for(let i = 0; i < markerNum; i++) {
      const markerInfo = arc.getMarker(i);
      if(markerInfo.idPatt == markerId) {
        // store the marker ID from the detection result
        hiroMarkerNum = i;
        break;
      }
    }

    if(hiroMarkerNum !== false) {
      
      // HIRO marker found
      if(markerRoot.visible) {
        arc.getTransMatSquareCont(
          hiroMarkerNum, 1, markerRoot.markerMatrix, markerRoot.markerMatrix
        );
      } else {
        arc.getTransMatSquare(
          hiroMarkerNum /* Marker index */, 1 /* Marker width */, markerRoot.markerMatrix
        );
      }

      // show marker root
      markerRoot.visible = true;

      // position camera
      arc.arglCameraViewRHf(
        arc.transMatToGLMat(markerRoot.markerMatrix),
        markerRoot.matrix.elements
      );

    } else {

      // not found
      markerRoot.visible = false;
    }

    // render the scene
    renderer.clear();
    renderer.render(scene, camera);

    // process next frame
    window.requestAnimationFrame(processFrame);
  };


  // initialize camera projection matrix
  const cameraMatrix = arc.getCameraMatrix();
  camera.projectionMatrix.fromArray(cameraMatrix);

  processFrame();
}
