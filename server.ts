import express from "express";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// In-memory cache (Note: Serverless functions may reset this)
let cachedData: any = null;
let lastFetched: number = 0;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // API routes
  app.get("/api/report", (req, res) => {
    try {
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
    } catch (err) {
      console.error("Error in /api/report:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
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
    // In production (Vercel), we only handle API routes here.
    // Static files are handled by Vercel's @vercel/static-build
    app.get("*", (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.status(404).send('Not found');
    });
  }

  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

const appPromise = startServer();
export default appPromise;
