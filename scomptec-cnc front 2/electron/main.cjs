const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
const devServerUrl = process.env.ELECTRON_RENDERER_URL || "http://localhost:5173";

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,

        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
        // Mantém links externos fora do processo da aplicação.
        if (url.startsWith("https://") || url.startsWith("http://")) {
            shell.openExternal(url);
        }
        return { action: "deny" };
    });

    if (isDev) {
        win.loadURL(devServerUrl);
        if (process.env.ELECTRON_OPEN_DEVTOOLS === "true") {
            win.webContents.openDevTools({ mode: "detach" });
        }
    } else {
        win.loadFile(path.join(__dirname, "../dist/index.html"));
    }

    win.webContents.on("will-navigate", (event, url) => {
        const allowedUrl = isDev ? devServerUrl : `file://${path.join(__dirname, "../dist/index.html")}`;
        if (!url.startsWith(allowedUrl)) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
