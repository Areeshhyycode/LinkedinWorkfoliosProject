/**
 * LinkedIn Outreach Dashboard — Express server.
 *
 * Routes:
 *   GET  /                    -> login na ho to /login, warna dashboard
 *   GET  /login               -> login page
 *   POST /api/login           -> password check, cookie set
 *   POST /api/logout
 *   GET  /api/stats           -> counts (sent/accepted/...)
 *   GET  /api/prospects       -> saare prospects
 *   POST /api/find            -> { skill, count } X-ray search + AI drafts, add
 *   POST /api/status          -> { id, status } update + timestamp
 *
 * Sab data data/prospects.json me (no DB setup).
 */
import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { findProfiles } from "./scraper.js";
import { draft } from "./ai.js";
import * as store from "./store.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");
const PASSWORD = process.env.APP_PASSWORD || "admin123";
const PORT = process.env.PORT || 3100;

// cookie token = password ka hash (guess-proof, no session store chahiye)
const TOKEN = crypto.createHash("sha256").update(PASSWORD + "::lo").digest("hex").slice(0, 32);

const app = express();
app.use(express.json());

// --- auth helpers ---
function isAuthed(req) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  return m && m[1] === TOKEN;
}
function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: "Login required" });
}

// --- pages ---
app.get("/login", (_req, res) => res.sendFile(path.join(PUBLIC, "login.html")));
app.get("/", (req, res) =>
  isAuthed(req) ? res.sendFile(path.join(PUBLIC, "app.html")) : res.redirect("/login")
);

// --- auth API ---
app.post("/api/login", (req, res) => {
  if ((req.body?.password || "") !== PASSWORD) {
    return res.status(401).json({ error: "Galat password" });
  }
  res.setHeader("Set-Cookie", `auth=${TOKEN}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`);
  res.json({ ok: true });
});
app.post("/api/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "auth=; HttpOnly; Path=/; Max-Age=0");
  res.json({ ok: true });
});

// --- data API (protected) ---
app.get("/api/stats", requireAuth, async (_req, res) => res.json(await store.stats()));
app.get("/api/prospects", requireAuth, async (_req, res) => res.json(await store.all()));

app.post("/api/find", requireAuth, async (req, res) => {
  const skill = (req.body?.skill || "web developer").trim();
  const count = Math.min(parseInt(req.body?.count || "10", 10), 20);
  try {
    const profiles = await findProfiles(skill, count);
    if (!profiles.length) return res.json({ added: 0, note: "Kuch nahi mila (search rate-limit?) — thodi der baad try karo." });
    // har profile ke liye draft banao
    const withDrafts = [];
    for (const p of profiles) {
      const { note, message } = await draft(p, skill);
      withDrafts.push({ ...p, skill, note, message });
    }
    const added = await store.addMany(withDrafts);
    res.json({ added, found: profiles.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/status", requireAuth, async (req, res) => {
  const { id, status } = req.body || {};
  const ok = ["new", "sent", "accepted", "messaged", "replied", "skipped"];
  if (!id || !ok.includes(status)) return res.status(400).json({ error: "bad input" });
  const p = await store.setStatus(id, status, new Date().toISOString());
  if (!p) return res.status(404).json({ error: "not found" });
  res.json(p);
});

app.use(express.static(PUBLIC));

// Vercel pe ye file serverless function ke through import hoti hai (listen nahi).
// Local pe (`npm start`) seedha chalti hai -> tab server listen karta hai.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  app.listen(PORT, () => {
    console.log(`\n🚀 LinkedIn Outreach dashboard chal gaya:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   Storage: ${process.env.MONGODB_URI ? "MongoDB" : "JSON file (local)"}`);
    console.log(`   Password: ${PASSWORD}  (.env me APP_PASSWORD se badlo)\n`);
  });
}

export default app;
