import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import React, { useEffect, useRef } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from "three";
import {
  mapNumberToColor,
  findMinMaxZ,
  mapZtoColor,
} from "@/utils/data.helper";

/** LOAD DATA */
const framesData: any[] = [];
for (let i = 0; i < 30; i++) {
  framesData.push(require(`../public/data/${i}.bin.json`));
}

/** TYPES */
enum ColoringType {
  height = "height",
  distance = "distance",
  reflection = "reflection",
}

interface GuiControls extends Record<string, unknown> {
  coloringType: ColoringType;
  frame: number;
}

/** CONSTANTS */
let play = false;
let initGuiCalled = false;
let points;

// TODO: Gui Controls for Camera
// TODO: Frame the data in a box
// TODO: 3D bounding boxes information

export default function Home() {
  const canvasRef = useRef(null);

  let guiControls: GuiControls = {
    coloringType: ColoringType.height,
    frame: 0,
  };

  // Reference Error for Dat.gui
  const initGUI = async () => {
    const dat = await import("dat.gui");
    const gui = new dat.GUI();
    const colouringTypeFolder = gui.addFolder("Coloring Options");
    colouringTypeFolder.add(guiControls, "coloringType", 0, 2, 1);
    colouringTypeFolder.open();
    const frameFolder = gui.addFolder("Select Frame");
    frameFolder.add(guiControls, "frame", 0, 29, 1);
    frameFolder.open();
  };

  // TODO: Create Point Array for each z level

  const createPoints = (positions: number[][], coloringType: ColoringType) => {
    // if (coloringType === ColoringType.height) {
    // Take second value due to transform
    const zValues = positions.map((pos) => pos.slice(1, 2));

    const zMinMax = findMinMaxZ(zValues);

    const zRange = zMinMax.maxZ - zMinMax.minZ;

    const colors = [];
    const color = new THREE.Color();

    for (let i = 0; i < positions.length; i++) {
      const z = positions[i][1];
      const vertexColor = mapZtoColor(
        positions[i][1],
        zMinMax.minZ,
        zMinMax.maxZ
      );
      colors.push(vertexColor[0], vertexColor[1], vertexColor[2]);
    }
    // Create a buffer geometry to hold the positions
    const pointGeometry = new THREE.BufferGeometry();

    // Convert the positions to Float32Array and add them to the geometry
    const positionArray = new Float32Array(positions.flat());
    pointGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positionArray, 3)
    );

    pointGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    pointGeometry.computeBoundingSphere();

    const material = new THREE.PointsMaterial({
      size: 0.01,
      vertexColors: true,
    });
    // Create a points object with the geometry and material
    return new THREE.Points(pointGeometry, material);
  };

  useEffect(() => {
    const buildPointsArray = framesData.map((frameData) => frameData.data);

    // Create a Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current!,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Create OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Add damping to make controls smoother
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 1;
    controls.maxDistance = 500;

    const pointFrames: THREE.Points<
      THREE.BufferGeometry,
      THREE.PointsMaterial
    >[] = [];

    buildPointsArray.forEach((pointArray, index) => {
      pointFrames.push(
        createPoints(
          pointArray.map((positionAndReflection: number[]) => [
            positionAndReflection[0],
            positionAndReflection[2],
            positionAndReflection[1],
          ]),
          ColoringType.height
        )
      );
    });

    // Add the points to the scene
    let previousFrame = guiControls.frame;
    points = pointFrames[previousFrame];
    scene.add(points);

    // Add a point light to the scene
    const pointLight = new THREE.PointLight(0xffffff, 10, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Add an ambient light to the scene
    const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(ambientLight);

    // Add controls to camera
    camera.position.set(0, 0, 5);
    controls.update();

    // Add a GUI

    if (!initGuiCalled) {
      initGUI();
      initGuiCalled = true;
    }

    let frame = 0;
    let lastIncrementTime = Date.now();
    let incrementInterval = 100; // increment every 1 second

    // Animate the cube
    const animate = function () {
      requestAnimationFrame(animate);

      // if (play) {
      //   // Increment variable every incrementInterval milliseconds
      //   const currentTime = Date.now();
      //   if (currentTime - lastIncrementTime >= incrementInterval) {
      //     frame++;
      //     frame = frame % pointFrames.length;
      //     lastIncrementTime = currentTime;
      //     frame - 1 >= 0
      //       ? scene.remove(pointFrames[frame - 1])
      //       : scene.remove(pointFrames[pointFrames.length - 1]);
      //     scene.add(pointFrames[frame]);
      //   }
      // }

      if (previousFrame !== guiControls.frame) {
        scene.remove(pointFrames[previousFrame]);
        scene.add(pointFrames[guiControls.frame]);
        previousFrame = guiControls.frame;
      }

      // Update controls
      controls.update();

      // Render the scene
      renderer.render(scene, camera);
    };
    animate();
  }, []);

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <canvas className={styles.canvas} ref={canvasRef} />
      </main>
    </>
  );
}
