import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import React, { useEffect, useRef } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from "three";
import { mapNumberToColor, findMinMaxZ, mapToColor } from "@/utils/data.helper";

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
  coloringType: { height: boolean; distance: boolean; reflection: boolean };
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
    coloringType: {
      height: false,
      distance: false,
      reflection: false,
    },
    frame: 0,
  };

  // Reference Error for Dat.gui
  const initGUI = async () => {
    const dat = await import("dat.gui");
    const gui = new dat.GUI();
    const colouringTypeFolder = gui.addFolder("Coloring Options");
    colouringTypeFolder
      .add(guiControls.coloringType, "height")
      .listen()
      .onChange(function () {
        setChecked(ColoringType.height);
      });

    colouringTypeFolder
      .add(guiControls.coloringType, "distance")
      .listen()
      .onChange(function () {
        setChecked(ColoringType.distance);
      });

    colouringTypeFolder
      .add(guiControls.coloringType, "reflection")
      .listen()
      .onChange(function () {
        setChecked(ColoringType.reflection);
      });

    const setChecked = (type: ColoringType) => {
      for (let check in guiControls.coloringType) {
        if (check !== type) {
          (guiControls.coloringType as any)[check] = false;
        } else {
          guiControls.coloringType[check] = true;
        }
      }
    };

    colouringTypeFolder.open();
    const frameFolder = gui.addFolder("Select Frame");
    frameFolder.add(guiControls, "frame", 0, 29, 1);
    frameFolder.open();
  };

  const createPoints = (positions: number[][], coloringType: ColoringType) => {
    // Height Coloring
    const zValues = positions.map((pos) => pos.slice(1, 2));

    const zMinMax = findMinMaxZ(zValues);

    const heightColoring = [];

    for (let i = 0; i < positions.length; i++) {
      const z = positions[i][1];
      const vertexColor = mapToColor(z, zMinMax.minZ, zMinMax.maxZ);
      heightColoring.push(vertexColor[0], vertexColor[1], vertexColor[2]);
    }

    // Distance Coloring
    const distanceColoring = [];
    for (let i = 0; i < positions.length; i++) {
      const x = positions[i][0];
      const y = positions[i][2];
      const distance = Math.sqrt(x * x + y * y);
      const vertexColor = mapToColor(distance, 0, 30);
      distanceColoring.push(vertexColor[0], vertexColor[1], vertexColor[2]);
    }

    // Reflection Coloring
    const reflectionColoring = [];
    for (let i = 0; i < positions.length; i++) {
      const reflection = positions[i][3];
      const vertexColor = mapToColor(reflection, 0, 0.4);
      reflectionColoring.push(vertexColor[0], vertexColor[1], vertexColor[2]);
    }

    const greenColoring = [];
    for (let i = 0; i < positions.length; i++) {
      greenColoring.push(0, 1, 0);
    }

    const coloringArray = [
      heightColoring,
      distanceColoring,
      reflectionColoring,
      greenColoring,
    ];

    // Create buffer geometrys to hold the positions
    const heightColoredGeometry = new THREE.BufferGeometry();
    const distanceColoredGeometry = new THREE.BufferGeometry();
    const reflectionColoredGeometry = new THREE.BufferGeometry();
    const greenColoredGeometry = new THREE.BufferGeometry();
    const pointGeometries = [
      heightColoredGeometry,
      distanceColoredGeometry,
      reflectionColoredGeometry,
      greenColoredGeometry,
    ];

    // Convert the positions to Float32Array and add them to the geometry
    const posOnly = positions.map((pos) => pos.slice(0, 3));
    const positionArray = new Float32Array(posOnly.flat());
    pointGeometries.forEach((geometry, index) => {
      // Positioning
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positionArray, 3)
      );

      // Coloring
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(coloringArray[index], 3)
      );
    });

    const material = new THREE.PointsMaterial({
      size: 0.01,
      vertexColors: true,
    });

    // Create a points object with the geometry and material
    return pointGeometries.map(
      (geometry) => new THREE.Points(geometry, material)
    );
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

    const frames: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>[][] =
      [];

    buildPointsArray.forEach((pointArray, index) => {
      frames.push(
        createPoints(
          pointArray.map((positionAndReflection: number[]) => [
            positionAndReflection[0],
            positionAndReflection[2],
            positionAndReflection[1],
            positionAndReflection[3],
          ]),
          ColoringType.height
        )
      );
    });

    // Add the points to the scene
    let coloringIndex = 3;
    let previousFrame = guiControls.frame;
    let previousColouringIndex = coloringIndex;

    points = frames[previousFrame][coloringIndex];
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
      if (guiControls.coloringType.height) {
        coloringIndex = 0;
      } else if (guiControls.coloringType.distance) {
        coloringIndex = 1;
      } else if (guiControls.coloringType.reflection) {
        coloringIndex = 2;
      } else {
        coloringIndex = 3;
      }
      if (
        previousFrame !== guiControls.frame ||
        previousColouringIndex !== coloringIndex
      ) {
        scene.remove(frames[previousFrame][previousColouringIndex]);
        scene.add(frames[guiControls.frame][coloringIndex]);
        previousFrame = guiControls.frame;
        previousColouringIndex = coloringIndex;
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
