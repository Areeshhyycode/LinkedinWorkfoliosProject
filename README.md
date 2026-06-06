# 🔗 LinkedIn Outreach Dashboard

Busy Upwork/Fiverr **freelancers** ko LinkedIn pe dhoondo aur unka **overflow / subcontract kaam** lo — ek safe, semi-automatic dashboard ke through.

> **Safe by design:** Ye tool LinkedIn pe **login karke scrape NAHI karta** (woh account ban karwata hai). Sirf public profiles dhoondta hai + drafts banata hai. Connection/message **aap khud** bhejte ho (human-paced) — isliye account safe rehta hai.

---

## ✨ Kya karta hai

1. **Login** — password se protected dashboard
2. **Prospects laao** — apni skill daalo (e.g. "web developer"), tool public LinkedIn profiles dhoondta hai jo Upwork/Fiverr karte hain
3. **AI drafts** — har banda ke liye 2 message auto-banta hai:
   - **Connection note** (≤280 chars, LinkedIn limit ke andar)
   - **Accept ke baad ka message** (overflow-work offer)
4. **Daily 5** — "Aaj ka kaam" tab roz 5 prospects dikhata hai
5. **Status tracking** — har banda: `new → sent → accepted → messaged → replied`
   Aap ek click se mark karte ho — dashboard batata hai **kisne connect/accept kiya, kisne nahi**
6. **Stats** — total, sent, accepted, accept-rate %

---

## 🚀 Chalane ka tareeka

```bash
# 1. dependencies install
npm install

# 2. config banao
copy .env.example .env        # (Windows)   |  cp .env.example .env (Mac/Linux)
#    .env me APP_PASSWORD set karo (aur chaaho to GROQ_API_KEY)

# 3. server chalao
npm start
```

Phir browser me kholo: **http://localhost:3000** → password daalo → dashboard.

---

## 🗓️ Roz ka flow

1. Skill daal ke **"Naye prospects laao"** dabao (ya pehle se laaye hue use karo)
2. **"Aaj ka kaam"** tab pe 5 cards aayenge. Har card pe:
   - **🔗 LinkedIn profile kholo** → uska profile khulega
   - **Copy** dabao → note copy → LinkedIn pe *Connect → Add a note → paste → send*
   - Wapas dashboard pe **"✓ Connection bhej diya"** dabao
3. Kuch din baad jab koi **accept** kare → us card pe **"✅ Accept ho gaya"** dabao
   - Ab **message** dikhega → Copy → LinkedIn pe paste → send → **"📨 Message bhej diya"**
4. Reply aaye to **"💬 Reply aaya"** → deal close karo 🎯

> **Roz sirf 15-20** connection bhejo, human-paced. Bot se auto mat bhejna — wahi ban karwata hai.

---

## ⚙️ Config (.env)

| Variable | Kaam |
|---|---|
| `APP_PASSWORD` | Dashboard login password |
| `PORT` | Server port (default 3100) |
| `MONGODB_URI` | Data DB. **Local pe khali = JSON file** (zero setup). **Vercel pe ZAROORI** (serverless me file persist nahi hoti). |
| `GROQ_API_KEY` | (optional) AI drafts — na ho to template. Free: console.groq.com |
| `GROQ_MODEL` | AI model (default llama-3.3-70b-versatile) |
| `SENDER_NAME` | Aapka naam (message ke end me) |

---

## ☁️ Vercel pe deploy

1. Is repo ko Vercel pe **Import** karo (vercel.com → Add New → Project)
2. **Environment Variables** me ye daalo:
   - `MONGODB_URI` — **zaroori** (warna data save nahi hoga). Free Atlas se lo.
   - `APP_PASSWORD` — apna login password
   - `GROQ_API_KEY` — (optional) AI drafts ke liye
   - `SENDER_NAME` — aapka naam
3. **Deploy** dabao → bas. `vercel.json` already set hai (Express → serverless).

> ⚠️ Vercel serverless hai — local wali JSON file wahan kaam nahi karti, isliye `MONGODB_URI` set karna zaroori hai. Code khud detect kar leta hai: URI ho to Mongo, warna file.

---

## 📁 Structure

```
linkedin-outreach/
├─ src/
│  ├─ server.js   # Express: login + API
│  ├─ store.js    # JSON-file database (no Mongo)
│  ├─ scraper.js  # LinkedIn X-ray search (no login)
│  └─ ai.js       # Groq AI drafts (optional)
├─ public/        # dashboard UI (login, app, css, js)
├─ data/          # prospects.json (auto-banta hai)
└─ .env           # config
```

## ⚠️ Zaroori
- Ye tool **leads + drafts** deta hai. Connection/message **aap manually** bhejte ho.
- LinkedIn automation (auto-connect bots) account ban karwa sakta hai — isliye ye tool jaan-bujh ke manual rakha gaya hai.
- Sirf authorized, professional outreach ke liye use karo.
