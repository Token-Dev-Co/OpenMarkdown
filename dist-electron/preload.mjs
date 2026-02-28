"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  openExternal: (url) => electron.ipcRenderer.invoke("open-external", url),
  selectDirectory: () => electron.ipcRenderer.invoke("select-directory"),
  getFiles: (dirPath) => electron.ipcRenderer.invoke("get-files", dirPath),
  readFile: (filePath) => electron.ipcRenderer.invoke("read-file", filePath),
  saveFile: (filePath, content) => electron.ipcRenderer.invoke("save-file", filePath, content),
  createFile: (dirPath, fileName) => electron.ipcRenderer.invoke("create-file", dirPath, fileName),
  renameFile: (oldPath, newName) => electron.ipcRenderer.invoke("rename-file", oldPath, newName),
  deleteFile: (filePath) => electron.ipcRenderer.invoke("delete-file", filePath),
  onMainMessage: (callback) => electron.ipcRenderer.on("main-process-message", (_event, value) => callback(value))
});
