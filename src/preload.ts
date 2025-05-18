import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  copyToClipboard: (text: string) =>
    ipcRenderer.invoke("copy-to-clipboard", text),
  getEnvVar: (name: string) => ipcRenderer.invoke("get-env", name),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("toggle-always-on-top"),
  setTaskbarState: (state: "idle" | "listening" | "processing") =>
    ipcRenderer.invoke("set-taskbar-state", state),
  showNotification: (options: { title: string; body: string }) =>
    ipcRenderer.invoke("show-notification", options),
  onTrayClick: (callback: () => void) => {
    ipcRenderer.on("tray-clicked", callback);
    return () => {
      ipcRenderer.removeListener("tray-clicked", callback);
    };
  },
});
