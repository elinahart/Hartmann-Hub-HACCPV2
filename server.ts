import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

// In-memory store for sessions
// The session structure will be { sid: { name: string, modules: string[], status: 'waiting' | 'uploaded' | 'imported', file?: Buffer, fileName?: string, timestamp: number, configSnapshot?: any } }
const sessionsStore: Record<string, { name: string, modules: string[], status: string, file?: Buffer, fileName?: string, timestamp: number, configSnapshot?: any }> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add CORS support for mobile devices and different origins
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Cleanup old sessions periodically (every 1 hour)
  setInterval(() => {
    const now = Date.now();
    for (const sid in sessionsStore) {
       // remove if older than 24 hours
       if (now - sessionsStore[sid].timestamp > 24 * 60 * 60 * 1000) {
         delete sessionsStore[sid];
       }
    }
  }, 60 * 60 * 1000);

  // API constraints
  app.use('/api', express.json({ limit: '50mb' }));
  app.use('/api', express.urlencoded({ limit: '50mb', extended: true }));

  // List all sessions (called by iPad)
  app.get("/api/sessions", (req, res) => {
    const list = Object.entries(sessionsStore).map(([sid, data]) => ({
      sid,
      name: data.name,
      modules: data.modules,
      status: data.status,
      timestamp: data.timestamp
    })).sort((a, b) => b.timestamp - a.timestamp); // newest first
    res.json({ sessions: list });
  });

  // Init session (called by iPad)
  app.post("/api/sessions/:sid", (req, res) => {
    const { sid } = req.params;
    const { name, modules, configSnapshot } = req.body || { name: 'Session', modules: [] };
    sessionsStore[sid] = { name, modules, status: 'waiting', timestamp: Date.now(), configSnapshot };
    res.json({ success: true, status: 'waiting' });
  });

  // Get session config (called by Mobile)
  app.get("/api/sessions/:sid/config", (req, res) => {
    const { sid } = req.params;
    const session = sessionsStore[sid];
    if (!session) {
      return res.status(404).json({ error: "Session introuvable" });
    }
    res.json({ configSnapshot: session.configSnapshot || null });
  });

  // Upload ZIP from mobile
  app.post("/api/sessions/:sid/upload", upload.single('file'), (req, res) => {
    const { sid } = req.params;
    if (!sessionsStore[sid]) {
      sessionsStore[sid] = { name: 'Unknown', modules: [], status: 'waiting', timestamp: Date.now() };
    }

    
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reçu." });
    }

    sessionsStore[sid].file = req.file.buffer;
    sessionsStore[sid].fileName = req.file.originalname || `collecte-${sid}.zip`;
    sessionsStore[sid].status = 'uploaded';
    sessionsStore[sid].timestamp = Date.now();

    res.json({ success: true, message: "Export envoyé avec succès vers l'iPad." });
  });

  // Check status (called by iPad to poll)
  app.get("/api/sessions/:sid/status", (req, res) => {
    const { sid } = req.params;
    const session = sessionsStore[sid];
    if (!session) {
      return res.status(404).json({ error: "Session introuvable ou expirée." });
    }
    res.json({ status: session.status, fileName: session.fileName });
  });

  // Download ZIP (called by iPad)
  app.get("/api/sessions/:sid/download", (req, res) => {
    const { sid } = req.params;
    const session = sessionsStore[sid];
    if (!session || !session.file) {
      return res.status(404).json({ error: "Aucune donnée uploadée pour cette session." });
    }
    
    // Fix: Properly encode the filename to prevent Node.js HTTP header crashes due to invalid characters (like accents)
    const safeName = encodeURIComponent(session.fileName || 'export.zip');
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}`);
    res.send(session.file);
  });

  // Global Error Handler to prevent app crashes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express Error:', err);
    res.status(500).json({ error: "Erreur serveur interne." });
  });

  // Update status (e.g. mark imported)
  app.post("/api/sessions/:sid/status", (req, res) => {
    const { sid } = req.params;
    const { status } = req.body;
    if (!sessionsStore[sid]) {
      return res.status(404).json({ error: "Session non trouvée." });
    }
    sessionsStore[sid].status = status;
    res.json({ success: true });
  });

  // Delete session
  app.delete("/api/sessions/:sid", (req, res) => {
    const { sid } = req.params;
    if (sessionsStore[sid]) {
      delete sessionsStore[sid];
    }
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      node: process.version,
      env: process.env.NODE_ENV
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
