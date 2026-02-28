import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    getFiles: (dirPath: string) => ipcRenderer.invoke('get-files', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
    saveFile: (filePath: string, content: string) => ipcRenderer.invoke('save-file', filePath, content),
    createFile: (dirPath: string, fileName: string) => ipcRenderer.invoke('create-file', dirPath, fileName),
    renameFile: (oldPath: string, newName: string) => ipcRenderer.invoke('rename-file', oldPath, newName),
    deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
    onMainMessage: (callback: (message: string) => void) => ipcRenderer.on('main-process-message', (_event, value) => callback(value))
})
