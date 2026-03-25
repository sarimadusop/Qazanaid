import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Handle any unhandled /api/* routes first to return JSON 404 instead of index.html
  // Using RegExp for absolute compatibility with Express 5+
  app.all(/^\/api\/.*/, (req, res) => {
    res.status(404).json({
      message: `API Route ${req.method} ${req.path} not found`,
      error: "Not Found"
    });
  });

  // Fallback all other routes to index.html for SPA routing
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
