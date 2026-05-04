import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function extractJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY não configurada na Vercel." }, { status: 400 });
  try {
    const q = await request.json();
    const prompt = `Você é um professor experiente em direito brasileiro preparando estudantes para a 1ª fase da OAB.
Explique a questão abaixo em português do Brasil.
Regras: não use emojis; explique por que a correta está certa; explique em frases curtas por que as demais estão erradas; indique base legal quando souber; não invente lei/artigo/súmula; crie 3 cards de estudo.
Responda SOMENTE em JSON válido neste formato:
{"explanation":"texto didático","legal_reference":"base legal ou vazio","legal_text":"","study_cards":[{"title":"Resumo","type":"resumo","front":"pergunta curta","back":"resposta curta"},{"title":"Pegadinha","type":"pegadinha","front":"pergunta curta","back":"resposta curta"},{"title":"Memorização","type":"memorizacao","front":"pergunta curta","back":"resposta curta"}]}
Disciplina: ${q.subject || ""}
Tema: ${q.topic || ""}
Enunciado: ${q.statement}
A) ${q.options?.A}
B) ${q.options?.B}
C) ${q.options?.C}
D) ${q.options?.D}
Resposta correta: ${q.correct_answer}`;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    const parsed = extractJson(result.response.text());
    if (!parsed || typeof parsed.explanation !== "string") return NextResponse.json({ error: "A IA não retornou JSON válido." }, { status: 502 });
    return NextResponse.json({ explanation: parsed.explanation || "", legal_reference: parsed.legal_reference || "", legal_text: parsed.legal_text || "", study_cards: Array.isArray(parsed.study_cards) ? parsed.study_cards : [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar explicação." }, { status: 500 });
  }
}
