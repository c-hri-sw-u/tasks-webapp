const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const taskManager = require('./task-manager');
const serve = require('electron-serve');

const loadURL = serve({ directory: 'out' });
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (isDev) {
        win.loadURL('http://localhost:3000');
        win.webContents.openDevTools();
    } else {
        loadURL(win);
    }
}

app.whenReady().then(() => {
    // Register IPC handlers
    ipcMain.handle('get-tasks', async (event, params) => {
        return await taskManager.getTasks(params);
    });

    ipcMain.handle('add-task', async (event, params) => {
        return await taskManager.addTask(params);
    });

    ipcMain.handle('update-task', async (event, params) => {
        return await taskManager.updateTask(params);
    });

    ipcMain.handle('delete-task', async (event, params) => {
        return await taskManager.deleteTask(params);
    });

    ipcMain.handle('get-history', async (event, params) => {
        return await taskManager.getHistory(params);
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
