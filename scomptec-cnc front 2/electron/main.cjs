const { app, BrowserWindow, shell, protocol, net } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const appUrl = "scomptec://app";
protocol.registerSchemesAsPrivileged([{
    scheme: "scomptec",
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
}]);

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
        win.loadURL(`${appUrl}/index.html`);
    }

    win.webContents.on("will-navigate", (event, url) => {
        const target = new URL(url);
        const allowed = isDev
            ? target.origin === new URL(devServerUrl).origin
            : target.protocol === "scomptec:" && target.host === "app";
        if (!allowed) {
            event.preventDefault();
            if (target.protocol === "https:" || target.protocol === "http:") {
                shell.openExternal(url);
            }
        }
    });
}

app.whenReady().then(() => {
    const distPath = path.resolve(__dirname, "../dist");
    protocol.handle("scomptec", (request) => {
        const target = new URL(request.url);
        if (target.host !== "app") return new Response("Not found", { status: 404 });
        let pathname;
        try {
            pathname = decodeURIComponent(target.pathname);
        } catch {
            return new Response("Invalid path", { status: 400 });
        }
        const filePath = path.resolve(distPath, `.${pathname === "/" ? "/index.html" : pathname}`);
        const relative = path.relative(distPath, filePath);
        if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || relative.includes(":")) {
            return new Response("Forbidden", { status: 403 });
        }
        return net.fetch(pathToFileURL(filePath).toString());
    });
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
