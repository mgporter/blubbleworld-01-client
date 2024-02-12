import { noiseLevel } from "./types";

const C = {
  enableCameraLimits: true,             // limit camera movement
  worldsizeX: 18,                       // Left to Right dimension
  worldsizeY: 12,                       // Top to Bottom dimension
  pondPercent: 1,                      // tiles below this percent are pond, must be only >= 1
  mountainPercent: 30,                  // tiles above this percent are mountain, must be only >= 1
  mountainHeightMultiplier: 0.6,         // How tall the mountains are
  worldGenerationSeed: null,             // A seed can be passed to generate consistent terrain, or null for none
  worldGenerationNoise: noiseLevel.LIGHT,    // Adds noise to the world generation algorithm
  currencyName: "credit",
  currencyNamePlural: "credits",
  peopleName: "blubble",
  peopleNamePlural: "blubbles",
}

export { C };