import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// In-memory cache
let cachedData: any = null;
let lastFetched: number = 0;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // API routes
  app.get("/api/report", (req, res) => {
    const now = new Date();
    const lastFetchedDate = new Date(lastFetched);
    
    const isSameDay = cachedData && 
      now.getFullYear() === lastFetchedDate.getFullYear() &&
      now.getMonth() === lastFetchedDate.getMonth() &&
      now.getDate() === lastFetchedDate.getDate();

    if (isSameDay) {
      return res.json(cachedData);
    }
    res.json(null);
  });

  app.post("/api/report", (req, res) => {
    cachedData = req.body;
    lastFetched = Date.now();
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
