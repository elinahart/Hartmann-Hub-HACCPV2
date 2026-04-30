import serverless from 'serverless-http';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { getStore } from '@netlify/blobs';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Fallback in-memory store for local dev without Netlify Blobs
const memoryStore: Record<string, any> = {};

async function getSession(sid: string) {
  try {
    const store = getStore('sessions');
    const data = await store.get(sid, { type: 'json' });
    if (data) return data;
  } catch (err) {
    // Blobs not available (local or misconfigured)
  }
  return memoryStore[sid] || null;
}

async function saveSession(sid: string, data: any) {
  try {
    const store = getStore('sessions');
    await store.setJSON(sid, data);
    return;
  } catch (err) {}
  memoryStore[sid] = data;
}

async function deleteSession(sid: string) {
  try {
    const store = getStore('sessions');
    await store.delete(sid);
    return;
  } catch (err) {}
  delete memoryStore[sid];
}

app.get("/api/sessions", async (req, res) => {
  try {
    const store = getStore('sessions');
    const { blobs } = await store.list();
    const sessions = [];
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: 'json' });
      if (data) {
        if (now - (data.timestamp || 0) > TWENTY_FOUR_HOURS) {
          await store.delete(blob.key).catch(() => {});
        } else {
          sessions.push({ sid: blob.key, ...data });
        }
      }
    }
    const list = sessions.map((data: any) => ({
      sid: data.sid,
      name: data.name,
      modules: data.modules,
      status: data.status,
      timestamp: data.timestamp
    })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json({ sessions: list });
  } catch (err) {
    const list = Object.entries(memoryStore).map(([sid, data]) => {
      if (Date.now() - (data.timestamp || 0) > 24 * 60 * 60 * 1000) {
        delete memoryStore[sid];
        return null;
      }
      return {
        sid,
        name: data.name,
        modules: data.modules,
        status: data.status,
        timestamp: data.timestamp
      };
    }).filter(Boolean).sort((a: any, b: any) => b.timestamp - a.timestamp);
    res.json({ sessions: list });
  }
});

app.post("/api/sessions/:sid", async (req, res) => {
  const { sid } = req.params;
  const { name, modules, configSnapshot } = req.body || { name: 'Session', modules: [] };
  await saveSession(sid, { name, modules, status: 'waiting', timestamp: Date.now(), configSnapshot });
  res.json({ success: true, status: 'waiting' });
});

app.get("/api/sessions/:sid/config", async (req, res) => {
  const { sid } = req.params;
  const session = await getSession(sid);
  if (!session) {
    return res.status(404).json({ error: "Session introuvable" });
  }
  res.json({ configSnapshot: session.configSnapshot || null });
});

app.post("/api/sessions/:sid/upload", upload.single('file'), async (req, res) => {
  const { sid } = req.params;
  let session = await getSession(sid);
  if (!session) {
    session = { name: 'Unknown', modules: [], status: 'waiting', timestamp: Date.now() };
  }

  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu." });
  }

  // Convert buffer to base64 for JSON storage in Netlify Blobs
  session.fileBase64 = req.file.buffer.toString('base64');
  session.fileName = req.file.originalname || `collecte-${sid}.zip`;
  session.status = 'uploaded';
  session.timestamp = Date.now();

  // Remove buffer to prevent JSON circular issues
  delete session.file;

  await saveSession(sid, session);
  res.json({ success: true, message: "Export envoyé avec succès vers l'iPad." });
});

app.get("/api/sessions/:sid/status", async (req, res) => {
  const { sid } = req.params;
  const session = await getSession(sid);
  if (!session) {
    return res.status(404).json({ error: "Session introuvable ou expirée." });
  }
  res.json({ status: session.status, fileName: session.fileName });
});

app.get("/api/sessions/:sid/download", async (req, res) => {
  const { sid } = req.params;
  const { format } = req.query;
  const session = await getSession(sid);
  if (!session || (!session.fileBase64 && !session.file)) {
    return res.status(404).json({ error: "Aucune donnée uploadée pour cette session." });
  }
  
  if (format === 'json') {
    return res.json({ fileName: session.fileName, base64: session.fileBase64 });
  }
  
  const buffer = session.fileBase64 ? Buffer.from(session.fileBase64, 'base64') : session.file;
  const safeName = encodeURIComponent(session.fileName || 'export.zip');
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}`);
  res.send(buffer);
});

app.post("/api/sessions/:sid/status", async (req, res) => {
  const { sid } = req.params;
  const { status } = req.body;
  const session = await getSession(sid);
  if (!session) {
    return res.status(404).json({ error: "Session non trouvée." });
  }
  session.status = status;
  await saveSession(sid, session);
  res.json({ success: true });
});

app.delete("/api/sessions/:sid", async (req, res) => {
  const { sid } = req.params;
  await deleteSession(sid);
  res.json({ success: true });
});

export const handler = serverless(app, {
  binary: ['multipart/form-data', 'application/zip', 'application/octet-stream', '*/*']
});
