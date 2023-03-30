import Head from "next/head";
import styles from "@/styles/Home.module.css";
import React, { useEffect, useMemo, useRef } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from "three";
import { findMinMaxZ, mapToColor } from "@/utils/data.helper";

/* -------------------------------- LOAD DATA ------------------------------- */
const framesData: any[] = [];
for (let i = 0; i < 30; i++) {
  framesData.push(require(`../public/data/${i}.bin.json`));
}

/* ------------------------------- LOAD LABELS ------------------------------ */
const labelFramesData: any[] = [];
for (let i = 0; i < 30; i++) {
  labelFramesData.push(
    require(`../public/data/label00${i < 10 ? `0${i}` : i}.txt.json`)
  );
}

/* ------------------------------- LOAD TRAILS ------------------------------ */

const trailsFrameData: any[] = [];
for (let i = 0; i < 30; i++) {
  trailsFrameData.push(
    require(`../public/data/filtered_point_cloud_data${i}.json`)
  );
}

/* ---------------------------------- TYPES --------------------------------- */
enum ColoringType {
  height = "height",
  distance = "distance",
  reflection = "reflection",
}

interface GuiControls extends Record<string, unknown> {
  coloringType: { height: boolean; distance: boolean; reflection: boolean };
  frame: number;
  labels: boolean;
  trails: {
    [name: string]: { [trailName: string]: boolean; id: string };
  };
  allTrails: boolean;
}

interface Label {
  id: string;
  center_x: number;
  center_y: number;
  based_z: number;
  size_x: number;
  size_y: number;
  size_z: number;
  yaw_angle: number;
  object_class: string;
}

/** CONSTANTS */
let play = false;
let initGuiCalled = false;
let points;

export default function Home() {
  const canvasRef = useRef(null);

  /* ----------------------------------- GUI ---------------------------------- */

  const trailIds: string[] = trailsFrameData[0].map(
    (box) => Object.keys(box)[0]
  );

  let trailIdControlArray: {
    [name: string]: { [trailName: string]: boolean; id: string };
  } = {};

  trailIds.forEach((id, index) => {
    trailIdControlArray[`box${index}`] = {
      [`box${index}Trail`]: false,
      id: id,
    };
  });

  let guiControls: GuiControls = {
    coloringType: {
      height: false,
      distance: false,
      reflection: false,
    },
    frame: 0,
    labels: false,
    trails: trailIdControlArray,
    allTrails: false,
  };

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

    const labelsFolder = gui.addFolder("Labels");
    labelsFolder.add(guiControls, "labels");
    labelsFolder.open();

    const trailsFolder = gui.addFolder("Trails");
    trailsFolder.add(guiControls, "allTrails");

    Object.keys(guiControls.trails).forEach((key, index) => {
      trailsFolder.add(guiControls.trails[key], `box${index}Trail`);
    });

    trailsFolder.open();
  };

  /* ------------------------- CREATE POINTS FUNCTION ------------------------- */

  const createPoints = (positions: number[][]) => {
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
    // Pass Positioning and Coloring to each geometry
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

    // vertexColors true enables coloring through geometries
    const material = new THREE.PointsMaterial({
      size: 0.01,
      vertexColors: true,
    });

    // Create a points object with the geometry and material
    return pointGeometries.map(
      (geometry) => new THREE.Points(geometry, material)
    );
  };

  /* --------------------------- CREATE POINT FRAMES -------------------------- */

  const buildPointsArray = framesData.map((frameData) => frameData.data);
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
        ])
      )
    );
  });

  /* --------------------------------- LABELS --------------------------------- */
  // Define colors for each object class
  const objectClassColors = {
    CAR: 0xff0000, // red
    PED: 0x00ff00, // green
    CYC: 0x0000ff, // blue
    SIGN: 0xffff00, // yellow
  };

  // Loop through the data and create a box for each record
  const labelFrames: THREE.Mesh[][] = [];
  labelFramesData.forEach((frame) => {
    const labelBoxes: THREE.Mesh[] = [];
    frame.forEach((record: Label) => {
      // Create a box geometry with the specified size
      const geometry = new THREE.BoxGeometry(
        record.size_x,
        record.size_z,
        record.size_y
      );
      // Create a material with a random color
      const material = new THREE.MeshBasicMaterial({
        color:
          objectClassColors[
            record.object_class as keyof typeof objectClassColors
          ],
        transparent: true,
        opacity: 0.5,
      });

      // Create a mesh from the geometry and material
      const box = new THREE.Mesh(geometry, material);

      // Set the position of the box based on the center_x, center_y, and base_z + half the height of the box (size_z)
      box.position.set(
        record.center_x,
        record.based_z + record.size_z / 2,
        record.center_y
      );

      // Set the rotation of the box based on the yaw_angle property
      box.rotation.set(0, record.yaw_angle, 0);

      labelBoxes.push(box);
    });
    labelFrames.push(labelBoxes);
  });

  /* --------------------------------- TRAILS --------------------------------- */

  const trailsPoints: any[] = [];

  trailsFrameData.forEach((trails) => {
    const individualTrailPoints: any[] = [];
    const trailKeys = trails.map((trail) => Object.keys(trail));
    trails.forEach((box, index) => {
      const key = trailKeys[index];
      if (box[key]) {
        const posOnly = box[key].map((position) => {
          return [position.x, position.z, position.y];
        });

        const boxPointCloudGeometry = new THREE.BufferGeometry();
        const positionArray = new Float32Array(posOnly.flat());
        boxPointCloudGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positionArray, 3)
        );
        const material = new THREE.PointsMaterial({
          size: 0.01,
          color: "red",
        });
        individualTrailPoints.push(
          new THREE.Points(boxPointCloudGeometry, material)
        );
      }
    });

    trailsPoints.push(individualTrailPoints);
  });

  /* ----------------------------- THREE.JS SCENE ----------------------------- */

  useEffect(() => {
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
    // TODO: Only allow for one GUI at a time to be created
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

      /* -------------------------------- COLORING -------------------------------- */
      if (guiControls.coloringType.height) {
        coloringIndex = 0;
      } else if (guiControls.coloringType.distance) {
        coloringIndex = 1;
      } else if (guiControls.coloringType.reflection) {
        coloringIndex = 2;
      } else {
        coloringIndex = 3;
      }

      /* --------------------------------- TRAILS --------------------------------- */

      // TODO: Delete all trails in all frames when allTrails is false
      if (guiControls.allTrails) {
        trailsPoints[guiControls.frame].forEach((pointsArray) => {
          scene.add(pointsArray);
        });
      } else {
        trailsPoints[guiControls.frame].forEach((pointsArray) => {
          scene.remove(pointsArray);
        });
        Object.keys(guiControls.trails).forEach((key, index) => {
          if (guiControls.trails[key][`${key}Trail`]) {
            scene.add(trailsPoints[guiControls.frame][index]);
          } else {
            scene.remove(trailsPoints[guiControls.frame][index]);
          }
        });
      }

      /* --------------------------- COLORING AND LABELS -------------------------- */
      if (
        previousFrame !== guiControls.frame ||
        previousColouringIndex !== coloringIndex
      ) {
        scene.remove(frames[previousFrame][previousColouringIndex]);
        scene.add(frames[guiControls.frame][coloringIndex]);

        // Add the label boxes to the scene
        if (guiControls.labels) {
          labelFrames[previousFrame].forEach((box) => {
            scene.remove(box);
          });
          labelFrames[guiControls.frame].forEach((box) => {
            scene.add(box);
          });
        }

        // Update variables
        previousFrame = guiControls.frame;
        previousColouringIndex = coloringIndex;
      } else {
        if (guiControls.labels) {
          labelFrames[guiControls.frame].forEach((box) => {
            scene.add(box);
          });
        } else {
          labelFrames[guiControls.frame].forEach((box) => {
            scene.remove(box);
          });
        }
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
