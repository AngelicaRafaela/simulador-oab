import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function extractJson(text: string) {
  const cleaned = text
    .replace(/^\uFEFF/, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = cleaned.slice(firstBrace, lastBrace + 1);

      try {
        return JSON.parse(jsonCandidate);
      } catch {
        return null;
      }
    }

    return null;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY não configurada na Vercel." },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum PDF foi enviado." },
        { status: 400 }
      );
    }

    if (!file.type.includes("pdf")) {
      return NextResponse.json(
        { error: "Envie apenas arquivos PDF." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
Você é um professor especialista em preparação para a 1ª fase da OAB.

Analise o PDF enviado e transforme o conteúdo em um material de estudo aprofundado.

OBJETIVO:
Criar um material organizado por disciplina, matéria e tópicos clicáveis, sem formato de perguntas. O conteúdo deve servir para estudo teórico.

REGRAS:
- Responda em português do Brasil.
- Não use emojis.
- Não invente artigos, leis, súmulas ou jurisprudência.
- Se o PDF não indicar a base legal com segurança, deixe a referência vazia.
- Organize o conteúdo para uma pessoa que está estudando para a OAB.
- Seja didático.
- Separe explicação geral e aprofundamento.
- Quando possível, indique pontos que costumam cair em prova.
- Não transforme o material em simulado.
- Não crie perguntas objetivas.
- O foco é resumo, aprofundamento e organização por tópicos.

RETORNE SOMENTE JSON VÁLIDO, SEM MARKDOWN E SEM TEXTO FORA DO JSON.

Formato obrigatório:
{
  "title": "Título do material de estudo",
  "discipline": "Disciplina principal, por exemplo: Direito Constitucional",
  "main_topic": "Matéria principal, por exemplo: Controle de Constitucionalidade",
  "source_file_name": "${file.name}",
  "summary": "Resumo geral do PDF em linguagem didática.",
  "study_objective": "O que o aluno deve dominar após estudar este material.",
  "topics": [
    {
      "title": "Nome do tópico",
      "short_summary": "Resumo curto do tópico.",
      "deep_explanation": "Explicação aprofundada e didática sobre o tópico.",
      "key_points": [
        "Ponto importante 1",
        "Ponto importante 2"
      ],
      "oab_attention": "O que costuma ser cobrado ou confundido em prova.",
      "legal_references": [
        "Base legal segura, se houver"
      ]
    }
  ],
  "suggested_study_order": [
    "Tópico 1",
    "Tópico 2"
  ],
  "review_checklist": [
    "Item que o aluno deve revisar",
    "Outro item importante"
  ]
}
`;

    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.type || "application/pdf",
                data: base64
              }
            }
          ]
        }
      ]
    });

    const text = response.text || "";
    const parsed = extractJson(text);

    if (!parsed) {
      return NextResponse.json(
        {
          error: "A IA não retornou JSON válido.",
          raw: text
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      id: `mat-${Date.now()}`,
      title: parsed.title || file.name,
      discipline: parsed.discipline || "Sem disciplina",
      main_topic: parsed.main_topic || "Sem matéria definida",
      source_file_name: file.name,
      summary: parsed.summary || "",
      study_objective: parsed.study_objective || "",
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      suggested_study_order: Array.isArray(parsed.suggested_study_order)
        ? parsed.suggested_study_order
        : [],
      review_checklist: Array.isArray(parsed.review_checklist)
        ? parsed.review_checklist
        : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao analisar o PDF."
      },
      { status: 500 }
    );
  }
}