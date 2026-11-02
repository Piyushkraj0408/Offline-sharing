
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const multer = require("multer");
const archiver = require("archiver");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const UPLOAD_DIR = path.resolve(__dirname, "uploads");
const TEMP_DIR = path.join(UPLOAD_DIR, ".tmp");
const SHARE_DIR = path.resolve(__dirname, "share_direct");

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB
const MAX_FILES = 1000;

// Permit long uploads on slower Wi-Fi.
// Keep this server restricted to a trusted LAN.
server.requestTimeout = 0;

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, TEMP_DIR);
    },
    filename: (req, file, callback) => {
        callback(null, crypto.randomUUID());
    }
});

const upload = multer({
    storage,
    limits: {
        files: MAX_FILES,
        fileSize: MAX_FILE_SIZE,
        fields: MAX_FILES,
        fieldSize: 4096,
        parts: MAX_FILES * 2
    }
});

function safePath(relativePath) {
    if (
        typeof relativePath !== "string" ||
        !relativePath ||
        relativePath.includes("\0") ||
        relativePath.includes("\\") ||
        relativePath.startsWith("/") ||
        /^[a-zA-Z]:/.test(relativePath)
    ) {
        return null;
    }

    const segments = relativePath.split("/");

    if (segments.some(s =>
        !s || s === "." || s === ".."
    )) {
        return null;
    }

    const destination = path.resolve(UPLOAD_DIR, ...segments);
    const relative = path.relative(UPLOAD_DIR, destination);

    if (
        !relative ||
        relative === ".." ||
        relative.startsWith(".." + path.sep) ||
        path.isAbsolute(relative)
    ) {
        return null;
    }

    return destination;
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.use("/files", express.static(SHARE_DIR));

// Upload files to disk without holding entire files in RAM.
app.post("/upload", (req, res, next) => {
    upload.array("files", MAX_FILES)(req, res, err => {
        if (err) {
            console.error("Upload error:", err.message);

            if (err instanceof multer.MulterError) {
                const message = err.code === "LIMIT_FILE_SIZE"
                    ? "File exceeds the 5 GB limit."
                    : `Upload rejected: ${err.message}`;

                return res.status(400).json({ message });
            }

            return res.status(400).json({
                message: "Upload interrupted. Please retry."
            });
        }

        next();
    });
}, async (req, res) => {
    const uploaded = req.files || [];

    try {
        const paths = Array.isArray(req.body.relativePaths)
            ? req.body.relativePaths
            : [req.body.relativePaths].filter(Boolean);

        if (!uploaded.length || paths.length !== uploaded.length) {
            return res.status(400).json({
                message: "No files received or file paths do not match."
            });
        }

        const destinations = paths.map(safePath);

        if (destinations.some(p => !p)) {
            return res.status(400).json({
                message: "Invalid upload path."
            });
        }

        if (new Set(destinations).size !== destinations.length) {
            return res.status(400).json({
                message: "Duplicate paths in this upload."
            });
        }

        for (const destination of destinations) {
            await fs.mkdir(path.dirname(destination), {
                recursive: true
            });
        }

        // Temporary files are on the same disk as uploads.
        // Rename normally avoids copying the file contents.
        for (let i = 0; i < uploaded.length; i++) {
            await fs.rename(uploaded[i].path, destinations[i]);
        }

        console.log(`Saved ${uploaded.length} file(s).`);
        io.emit("refreshFiles");

        res.json({
            message: "Upload successful!",
            count: uploaded.length
        });
    } catch (error) {
        console.error("Saving upload failed:", error);

        if (!res.headersSent) {
            res.status(500).json({
                message: "Could not save uploaded files."
            });
        }
    } finally {
        await Promise.all(
            uploaded.map(file =>
                fs.rm(file.path, { force: true }).catch(() => {})
            )
        );
    }
});

// List all files and folders stored on the server.
app.get("/api/items", async (req, res) => {
    try {
        async function scan(directory, relative = "") {
            const entries = await fs.readdir(directory, {
                withFileTypes: true
            });

            const result = [];

            for (const entry of entries) {
                if (!relative && entry.name === ".tmp") continue;

                if (!entry.isFile() && !entry.isDirectory()) continue;

                const itemPath = relative
                    ? `${relative}/${entry.name}`
                    : entry.name;

                const fullPath = path.join(directory, entry.name);

                if (entry.isDirectory()) {
                    result.push({
                        name: entry.name,
                        path: itemPath,
                        type: "folder"
                    });

                    result.push(...await scan(fullPath, itemPath));
                } else {
                    const stat = await fs.stat(fullPath);

                    result.push({
                        name: entry.name,
                        path: itemPath,
                        type: "file",
                        size: stat.size
                    });
                }
            }

            return result;
        }

        res.json(await scan(UPLOAD_DIR));
    } catch (error) {
        console.error("Listing error:", error);

        res.status(500).json({
            message: "Could not list uploaded files."
        });
    }
});

// Download a file, or download a folder as a ZIP.
app.get("/download", async (req, res) => {
    const target = safePath(req.query.path);

    if (!target) {
        return res.status(400).send("Invalid path.");
    }

    try {
        const stat = await fs.lstat(target);

        if (stat.isSymbolicLink()) {
            return res.status(400).send("Invalid item.");
        }

        const name = path.basename(target);

        if (stat.isFile()) {
            return res.download(target, name);
        }

        if (!stat.isDirectory()) {
            return res.status(404).send("Item not found.");
        }

        res.attachment(`${name}.zip`);

        const archive = archiver("zip", {
            zlib: { level: 0 }
        });

        archive.on("error", error => {
            console.error("ZIP error:", error);

            if (!res.headersSent) {
                res.status(500).end("ZIP creation failed.");
            } else {
                res.destroy(error);
            }
        });

        res.on("close", () => {
            if (!res.writableEnded) archive.abort();
        });

        archive.pipe(res);
        archive.directory(target, name);
        await archive.finalize();
    } catch (error) {
        console.error("Download error:", error.message);

        if (!res.headersSent) {
            res.status(404).send("File or folder not found.");
        }
    }
});

io.on("connection", socket => {
    console.log("LAN user connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("LAN user disconnected:", socket.id);
    });
});

async function start() {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(SHARE_DIR, { recursive: true });

    // Remove abandoned temporary files from a previous server run.
    // Do not delete TEMP_DIR while the server is running.
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });

    server.listen(PORT, "0.0.0.0", () => {
        console.log(`Smart Share: http://localhost:${PORT}`);
        console.log(`Upload directory: ${UPLOAD_DIR}`);
    });
}

start().catch(error => {
    console.error("Server startup failed:", error);
    process.exit(1);
});
