import {
  app,
  BrowserWindow,
  ipcMain,
  clipboard,
  nativeImage,
  Notification,
  Tray,
  Menu,
} from "electron";
import * as path from "path";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { icons } from "./icons";

app.name = "Audio Transcriber";
if (process.platform === "win32") {
  app.setAppUserModelId("Audio Transcriber");
}

// Load environment variables from .env file
// IF .env IS COPIED TO THE SAME DIRECTORY AS main.js (e.g., dist/)
const envPath = path.join(__dirname, ".env");

// dotenv can often read from within ASAR if the path is correct relative to ASAR structure.
// We skip fs.existsSync because it's unreliable for ASAR paths.
try {
  const result = dotenv.config({
    path: envPath,
    debug: process.env.NODE_ENV === "development",
  }); // Enable dotenv debug in dev
  if (result.error) {
    console.warn("dotenv.config error:", result.error);
  }
  console.log(
    "ASSEMBLY_AI_API_KEY after dotenv.config attempt:",
    process.env.ASSEMBLY_AI_API_KEY ? "Loaded" : "Not Loaded or Empty"
  );
  if (!process.env.ASSEMBLY_AI_API_KEY) {
    console.warn(
      ".env file might have been found by path, but ASSEMBLY_AI_API_KEY was not loaded from it or is empty."
    );
  }
} catch (e) {
  console.error("Error during dotenv.config:", e);
}

// Global variables
let mainWindow: BrowserWindow;
let tray: Tray | null = null;
let isQuitting = false;

function createTray() {
  const iconPath = icons.idle;
  console.log("Creating tray with icon:", iconPath);

  try {
    const trayIcon = nativeImage
      .createFromPath(iconPath)
      .resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip("Audio Transcriber - Idle");
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show Window",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    // Handle left click based on current state
    tray.on("click", () => {
      if (mainWindow) {
        mainWindow.webContents.send("tray-clicked");
      }
    });

    // Double click shows window
    tray.on("double-click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.error("Error creating tray:", err);
  }
}

function updateTrayState(state: "idle" | "listening" | "processing") {
  if (!tray) return;

  try {
    const iconPath = icons[state];
    console.log("Updating tray icon to:", iconPath);

    const trayIcon = nativeImage
      .createFromPath(iconPath)
      .resize({ width: 16, height: 16 });
    tray.setImage(trayIcon);

    const stateText = {
      idle: "Idle",
      listening: "Listening",
      processing: "Processing",
    }[state];

    tray.setToolTip(`Audio Transcriber - ${stateText}`);
  } catch (err) {
    console.error("Error updating tray:", err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  const isDev = process.env.NODE_ENV === "development";
  const htmlPath = isDev
    ? path.join(__dirname, "../src/index.html")
    : path.join(__dirname, "index.html");

  mainWindow.loadFile(htmlPath).catch((err) => {
    console.error("Failed to load HTML file:", err);
    const altPath = path.join(__dirname, "../src/index.html");
    mainWindow.loadFile(altPath).catch((err) => {
      console.error("Failed to load alternative path:", err);
    });
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// IPC Handlers
ipcMain.handle("get-env", (_event, name: string) => {
  return process.env[name];
});

ipcMain.handle("toggle-always-on-top", (_event) => {
  if (!mainWindow) return false;
  const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
  return !isAlwaysOnTop;
});

ipcMain.handle("copy-to-clipboard", (_event, text: string) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle(
  "set-taskbar-state",
  (_event, state: "idle" | "listening" | "processing") => {
    updateTrayState(state);
    return true;
  }
);

ipcMain.handle(
  "show-notification",
  (_event, { title, body }: { title: string; body: string }) => {
    if (!mainWindow) return false;
    const notification = new Notification({
      title,
      body,
      icon: nativeImage.createFromPath(icons.idle),
    });
    notification.show();
    return true;
  }
);

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createTray();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
