// Icons for taskbar states
import * as path from "path";

// Handle both development and production paths
const isDev = process.env.NODE_ENV === "development";
const basePath = isDev
  ? path.join(__dirname, "assets")
  : path.join(__dirname, "../src/assets");

console.log("Icon base path:", basePath);

export const icons = {
  idle: path.join(basePath, "microphone-idle.png"),
  listening: path.join(basePath, "microphone-listening.png"),
  processing: path.join(basePath, "microphone-processing.png"),
};
