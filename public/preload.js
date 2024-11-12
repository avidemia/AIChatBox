const { contextBridge, ipcRenderer } = require('electron');

// Expose any required APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // Add any electron functionality you need to expose to your React app
});
