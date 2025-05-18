import { App } from "electron";

declare global {
  interface ElectronApp extends App {
    isQuitting: boolean;
  }
}

export {};
