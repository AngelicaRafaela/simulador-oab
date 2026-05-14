import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TutorRequestBody = {
  message?: string;
  context?: unknown;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "A variável GEMINI_API_KEY não está configurada no ambiente da Vercel."
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as TutorRequestBody;
    const userMessage = String(body.message || "").trim();

    if (!userMessage) {
      return NextResponse.json(
        { error: "Envie uma pergunta para o Tutor OAB." },
        { status: 400 }
      );
    }

    const contextText = JSON.stringify(body.context || {}, null, 2);

    const prompt = `
Você é um Tutor OAB para estudantes da 1ª fase.

Sua função:
- Tirar dúvidas jurídicas de forma didática.
- Usar prioritariamente o contexto fornecido pelo sistema.
- Explicar com linguagem simples, objetiva e segura.
- Quando possível, conectar a resposta com a forma como a FGV/OAB costuma cobrar.
- Não inventar base legal ou jurisprudência.
- Se o contexto fornecido não for suficiente, diga isso de forma transparente e responda apenas com conhecimento jurídico geral.

Formato preferencial da resposta:
1. Explicação simples
2. Atenção para a OAB
3. Exemplo ou pegadinha
4. Base legal, quando houver no contexto ou for segura

Evite respostas muito longas. Seja útil para estudo.

CONTEXTO DISPONÍVEL NO SISTEMA:
${contextText}

PERGUNTA DO USUÁRIO:
${userMessage}
`;

    const model = "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 1400
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error:
            "Não foi possível consultar o Tutor OAB agora. Tente novamente em instantes.",
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("\n")
        .trim() || "";

    if (!answer) {
      return NextResponse.json(
        { error: "A IA não retornou uma resposta válida." },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao consultar o Tutor OAB."
      },
      { status: 500 }
    );
  }
}