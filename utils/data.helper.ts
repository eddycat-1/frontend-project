import THREE from "three";

export const getFirstThreeElements = (array: number[][]) => {
  return array.slice(0, 3);
};

export const mapNumberToColor = (number: number) => {
  var colors = [
    [255, 0, 0], // Red
    [255, 165, 0], // Orange
    [255, 255, 0], // Yellow
    [0, 128, 0], // Green
    [0, 0, 255], // Blue
  ];

  if (number < 0 || number > 4) {
    throw new Error("Number must be between 0 and 4");
  }

  var colorIndex = Math.floor(number * (colors.length - 1));
  var colorPercent = number * (colors.length - 1) - colorIndex;

  var color1 = colors[colorIndex];
  var color2 = colors[colorIndex + 1];

  var red = Math.round(color1[0] + (color2[0] - color1[0]) * colorPercent);
  var green = Math.round(color1[1] + (color2[1] - color1[1]) * colorPercent);
  var blue = Math.round(color1[2] + (color2[2] - color1[2]) * colorPercent);

  return red;
};

export const findMinMaxZ = (zArray: number[][]) => {
  return zArray.reduce(
    (result, z) => {
      if (z[0] < result.minZ) {
        result.minZ = z[0];
      }
      if (z[0] > result.maxZ) {
        result.maxZ = z[0];
      }
      return result;
    },
    { minZ: Infinity, maxZ: -Infinity }
  );
};

export function mapToColor(value: number, min: number, max: number) {
  // Normalize z to be between 0 and 1
  const normalizedZ = (value - min) / (max - min);
  // Map normalizedZ to a colo  r using a gradient from blue to red
  const r = normalizedZ;
  const g = Math.max(normalizedZ - 0.5, 0);
  const b = 1 - normalizedZ;
  return [r, g, b];
}

// const divideIntoBuckets = (
//   positions: [][],
//   range: number,
//   min: number,
//   numberBuckets: number
// ) => {
// Divide the array into 10 equal parts of the range
//   const increments = Array.from(
//     { length: numberBuckets },
//     (_, i) => min + (i + 1) * (range / numberBuckets)
//   );
//   const buckets = positions.reduce(
//     (acc, value) => {
//       const bucketIndex = Math.min(
//         numberBuckets - 1,
//         Math.floor((value - min) / (range / numberBuckets))
//       );
//       acc[bucketIndex].push(value);
//       return acc;
//     },
//     Array.from({ length: numberBuckets }, () => [])
//   );
//   return buckets;
// };
