const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getTasks: (params) => ipcRenderer.invoke('get-tasks', params),
    addTask: (params) => ipcRenderer.invoke('add-task', params),
    updateTask: (params) => ipcRenderer.invoke('update-task', params),
    deleteTask: (params) => ipcRenderer.invoke('delete-task', params),
    getHistory: (params) => ipcRenderer.invoke('get-history', params),
});
