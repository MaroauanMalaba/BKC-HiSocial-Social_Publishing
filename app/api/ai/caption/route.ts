import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

const OLLAMA_HOST  = process.env.OLLAMA_HOST  ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5:0.8b";

const PLATFORM_CONTEXT: Record<string, string> = {
  instagram: "Instagram (max 2200 Zeichen, 3–5 Hashtags am Ende, Emojis erlaubt)",
  tiktok:    "TikTok (kurz & prägnant, max 300 Zeichen, trendige Hashtags)",
  linkedin:  "LinkedIn (professionell, kein Slang, max 1300 Zeichen, 3 Hashtags)",
  facebook:  "Facebook (locker, max 500 Zeichen, 1–2 Hashtags optional)",
  youtube:   "YouTube-Beschreibung (keyword-reich, erste 2 Sätze entscheidend, bis 5000 Zeichen)",
};

export async function POST(req: NextRequest) {
  try { await requireUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const { platform, post_type, existing_caption } = body;

  const platformHint = PLATFORM_CONTEXT[platform as string] ?? "Social Media (max 300 Zeichen)";
  const typeHint = post_type === "reel" ? "Reel" : post_type === "story" ? "Story" : post_type === "carousel" ? "Karussell-Post" : "Feed-Post";

  const userPrompt = existing_caption
    ? `Verbessere diese Caption für ${platformHint} (${typeHint}):\n\n"${existing_caption}"\n\nSchreibe NUR die Caption, kein Prefix, keine Erklärung.`
    : `Schreibe eine ansprechende Caption für ${platformHint} (${typeHint}) für ein Marketing- und Beratungsunternehmen. Schreibe NUR die Caption, kein Prefix.`;

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        think: false,
        options: { temperature: 0.85, num_predict: 300 },
        messages: [
          {
            role: "system",
            content: "/no_think Du bist ein knapper Social-Media-Texter. Antworte ausschließlich mit der fertigen Caption — kein Prefix, keine Erklärung, kein Markdown.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Ollama nicht erreichbar. Läuft `ollama serve`?" }, { status: 503 });
  }

  if (!ollamaRes.ok) {
    const text = await ollamaRes.text().catch(() => "");
    return NextResponse.json({ error: `Ollama: ${text || ollamaRes.status}` }, { status: 500 });
  }

  const json = await ollamaRes.json();
  const caption = (json.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return NextResponse.json({ caption });
}
