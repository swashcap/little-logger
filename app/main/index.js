const electron = require('electron');
// Module to control application life.
const {app} = electron;
// Module to create native browser window.
const {BrowserWindow} = electron;
const windowStateKeeper = require('electron-window-state');

/**
 * Handy debugging. Only runs in development.
 * {@link https://github.com/sindresorhus/electron-debug}
 */
require('electron-debug')({ showDevTools: true });

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  /**
   * Keep track of window position and size.
   * {@link https://github.com/mawie81/electron-window-state}
   */
  let mainWindowState = windowStateKeeper({
    defaultWidth: 800,
    defaultHeight: 600,
  });

  // Create the browser window.
  win = new BrowserWindow({
    height: mainWindowState.height,
    width: mainWindowState.width,
    x: mainWindowState.x,
    y: mainWindowState.y,
  });

  mainWindowState.manage(win);

  // and load the index.html of the app.
  win.loadURL(`file://${__dirname}/../render/index.html?rootScript=index.js`);

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
