const { app, BrowserWindow, ipcMain, ipcRenderer, contextBridge } = require("electron");
const url = require("url");
const path = require("path");
const { read } = require("fs");
const { argv } = process;
const isDev = argv[2] == 'dev';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.maximize();
  if(isDev){
    mainWindow.loadURL('http://localhost:4200?isDev=1');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, `/dist/catraca2/index.html`),
        protocol: "file:",
        slashes: true,
      })
    );
  }
  
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
  if (mainWindow === null) createWindow();
});
