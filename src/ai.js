/**
 * Har prospect ke liye 2 draft banata hai:
 *   note    -> connection request ke saath (≤280 chars, LinkedIn limit)
 *   message -> accept hone ke baad ka overflow-work offer
 *
 * GROQ_API_KEY ho to AI se personalized, warna ready template.
 */
const MAX_NOTE = 280;
const SENDER = process.env.SENDER_NAME || "Areesha Rafiq";

function template(lead, skill) {
  const first = (lead.name || "there").split(/\s+/)[0];
  let note = `Hi ${first}, saw your ${skill} work — really solid. I take on overflow/subcontract ${skill} projects for busy freelancers. Would love to connect in case you ever need a reliable extra hand.`;
  if (note.length > MAX_NOTE) note = note.slice(0, MAX_NOTE - 1) + "…";

  const message = [
    `Hi ${first}, thanks for connecting!`,
    "",
    `I reached out because you clearly stay busy with ${skill} work. I work as a reliable white-label subcontractor — when you're overloaded, you can hand the overflow to me and stay the client's point of contact.`,
    "",
    "Fast turnaround, your standards, no drama. If that's ever useful, happy to share a couple of samples and rates — no pressure.",
    "",
    `Best,`,
    SENDER,
  ].join("\n");

  return { note, message };
}

export async function draft(lead, skill) {
  if (!process.env.GROQ_API_KEY) return template(lead, skill);
  try {
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const prompt = `Tum ek B2B outreach copywriter ho. Main (${SENDER}) ek ${skill} subcontractor hoon jo busy freelancers ka OVERFLOW kaam white-label leta hoon.

TARGET:
- Name: ${lead.name}
- LinkedIn headline: ${lead.headline || "(unknown)"}

JSON return karo EXACTLY (English, warm+professional, no emojis, no hype, no fake claims):
{
  "note": "LinkedIn connection note. MAX ${MAX_NOTE} chars. Personalized to their ${skill} work. Mention I take overflow/subcontract work. Soft.",
  "message": "Message AFTER they accept. 4-6 short lines. Offer reliable white-label subcontracting for overflow ${skill} work. End with my name: ${SENDER}. No pressure."
}`;

    const c = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });
    const p = JSON.parse(c.choices[0]?.message?.content || "{}");
    let note = (p.note || "").trim();
    if (!note) return template(lead, skill);
    if (note.length > MAX_NOTE) note = note.slice(0, MAX_NOTE - 1) + "…";
    return { note, message: (p.message || template(lead, skill).message).trim() };
  } catch {
    return template(lead, skill);
  }
}
