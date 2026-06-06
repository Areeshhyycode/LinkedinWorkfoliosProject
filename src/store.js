/**
 * Prospect storage — DO backend:
 *   - MONGODB_URI set ho (e.g. Vercel pe)  -> MongoDB  (data persist rehta hai)
 *   - warna (local dev, zero-setup)         -> JSON file (data/prospects.json)
 *
 * Dono ka same interface: all / addMany / setStatus / stats.
 *
 * Prospect = ek LinkedIn freelancer jise reach out kar rahe ho.
 *   status flow: new -> sent -> accepted -> messaged -> replied  (ya skipped)
 */
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const USE_DB = Boolean(process.env.MONGODB_URI);
const idFor = (url) => "p_" + crypto.createHash("sha1").update(url).digest("hex").slice(0, 12);

function shape(it) {
  return {
    id: idFor(it.url),
    name: it.name,
    headline: it.headline || "",
    url: it.url,
    skill: it.skill || "",
    note: it.note || "",
    message: it.message || "",
    status: "new",
    sentAt: null,
    acceptedAt: null,
    messagedAt: null,
    repliedAt: null,
  };
}

function applyStatus(p, status, isoNow) {
  p.status = status;
  if (status === "sent") p.sentAt = isoNow;
  if (status === "accepted") p.acceptedAt = isoNow;
  if (status === "messaged") p.messagedAt = isoNow;
  if (status === "replied") p.repliedAt = isoNow;
}

function tally(list) {
  const by = { new: 0, sent: 0, accepted: 0, messaged: 0, replied: 0, skipped: 0 };
  for (const p of list) by[p.status] = (by[p.status] || 0) + 1;
  const reachedOut = by.sent + by.accepted + by.messaged + by.replied;
  const acceptRate = reachedOut
    ? Math.round(((by.accepted + by.messaged + by.replied) / reachedOut) * 100)
    : 0;
  return { total: list.length, ...by, reachedOut, acceptRate };
}

/* ============================ MongoDB backend ============================= */
let _mongoose, _Prospect, _conn;
async function db() {
  if (_conn) return _Prospect;
  const { default: mongoose } = await import("mongoose");
  _mongoose = mongoose;
  const schema = new mongoose.Schema(
    {
      id: { type: String, unique: true, index: true },
      name: String,
      headline: String,
      url: { type: String, unique: true },
      skill: String,
      note: String,
      message: String,
      status: { type: String, default: "new" },
      sentAt: Date,
      acceptedAt: Date,
      messagedAt: Date,
      repliedAt: Date,
    },
    { timestamps: true }
  );
  _Prospect = mongoose.models.Prospect || mongoose.model("Prospect", schema);
  _conn = mongoose.connect(process.env.MONGODB_URI);
  await _conn;
  return _Prospect;
}

const mongo = {
  async all() {
    const P = await db();
    return (await P.find().sort({ createdAt: 1 }).lean()).map((d) => ({ ...d, _id: undefined }));
  },
  async addMany(items) {
    const P = await db();
    let added = 0;
    for (const it of items) {
      const doc = shape(it);
      const r = await P.updateOne({ id: doc.id }, { $setOnInsert: doc }, { upsert: true });
      if (r.upsertedCount) added++;
    }
    return added;
  },
  async setStatus(id, status, isoNow) {
    const P = await db();
    const set = { status };
    if (status === "sent") set.sentAt = isoNow;
    if (status === "accepted") set.acceptedAt = isoNow;
    if (status === "messaged") set.messagedAt = isoNow;
    if (status === "replied") set.repliedAt = isoNow;
    return P.findOneAndUpdate({ id }, { $set: set }, { new: true }).lean();
  },
  async stats() {
    return tally(await mongo.all());
  },
};

/* ============================== File backend ============================== */
const FILE = path.join(process.cwd(), "data", "prospects.json");
async function loadFile() {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf-8"));
  } catch {
    return [];
  }
}
async function saveFile(list) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2));
}
const file = {
  all: loadFile,
  async addMany(items) {
    const list = await loadFile();
    const seen = new Set(list.map((p) => p.url));
    let added = 0;
    for (const it of items) {
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      list.push(shape(it));
      added++;
    }
    await saveFile(list);
    return added;
  },
  async setStatus(id, status, isoNow) {
    const list = await loadFile();
    const p = list.find((x) => x.id === id);
    if (!p) return null;
    applyStatus(p, status, isoNow);
    await saveFile(list);
    return p;
  },
  async stats() {
    return tally(await loadFile());
  },
};

/* ============================ public interface =========================== */
const backend = USE_DB ? mongo : file;
export const all = (...a) => backend.all(...a);
export const addMany = (...a) => backend.addMany(...a);
export const setStatus = (...a) => backend.setStatus(...a);
export const stats = (...a) => backend.stats(...a);
