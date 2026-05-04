import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function extractJson(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
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
      {
        error: "GEMINI_API_KEY não configurada na Vercel."
      },
      {
        status: 400
      }
    );
  }

  try {
    const q = await request.json();

    const prompt = `
Você é um professor especialista em preparação para a 1ª fase da OAB, com domínio de Direito brasileiro e estilo didático, objetivo e seguro.

Sua tarefa é explicar uma questão objetiva da OAB com máxima precisão jurídica.

REGRAS GERAIS:
- Responda em português do Brasil.
- Não use emojis.
- Não use linguagem informal.
- Não invente lei, artigo, inciso, súmula, tese ou jurisprudência.
- Se não souber a base legal exata, deixe "legal_reference" como string vazia.
- Se souber apenas a lei, mas não o artigo, informe somente a lei.
- Se souber artigo, inciso, parágrafo, alínea ou súmula, informe com precisão.
- Nunca cite artigo aproximado ou duvidoso.
- Não diga “conforme a lei” sem indicar qual lei, se souber.
- Não afirme que uma alternativa está errada sem explicar o motivo jurídico.
- Seja claro, mas não escreva uma resposta longa demais.
- Evite respostas genéricas.
- Priorize legislação vigente e entendimento consolidado.
- Se a questão for conceitual e não depender diretamente de artigo de lei, explique o conceito e deixe "legal_reference" vazio, salvo se houver referência segura.

REGRAS DE PRECISÃO POR DISCIPLINA:
- Em Ética Profissional, priorize Lei nº 8.906/1994, Regulamento Geral da OAB, Código de Ética e Disciplina da OAB e Provimentos do CFOAB.
- Em Direito Constitucional, priorize Constituição Federal, ADCT, súmulas vinculantes e entendimento consolidado do STF quando for essencial.
- Em Direito Administrativo, priorize Constituição Federal, Lei nº 14.133/2021, Lei nº 8.429/1992, Lei nº 9.784/1999, LINDB e legislação administrativa pertinente.
- Em Direito Civil, priorize Código Civil, legislação civil especial e súmulas do STJ quando aplicáveis.
- Em Processo Civil, priorize CPC/2015, Constituição Federal e súmulas do STF/STJ quando aplicáveis.
- Em Direito Penal, priorize Código Penal, leis penais especiais e súmulas quando aplicáveis.
- Em Processo Penal, priorize CPP, Constituição Federal, legislação penal especial e súmulas quando aplicáveis.
- Em Direito do Trabalho, priorize CLT, Constituição Federal, legislação trabalhista especial, súmulas e OJs do TST quando aplicáveis.
- Em Processo do Trabalho, priorize CLT, CPC aplicado subsidiariamente, Constituição Federal, súmulas e OJs do TST.
- Em Direito Tributário, priorize Constituição Federal, CTN, legislação tributária específica e súmulas do STF/STJ.
- Em Direito Empresarial, priorize Código Civil, Lei das S.A., Lei de Falências, Lei de Duplicatas, legislação empresarial especial e súmulas quando aplicáveis.
- Em Direito do Consumidor, priorize CDC e súmulas do STJ quando aplicáveis.
- Em ECA, priorize Estatuto da Criança e do Adolescente.
- Em Direitos Humanos, priorize Constituição Federal, tratados internacionais de direitos humanos, Convenção Americana de Direitos Humanos, jurisprudência da Corte IDH quando aplicável.
- Em Direito Internacional, priorize Constituição Federal, LINDB, Lei de Migração, tratados e normas internacionais pertinentes.
- Em Direito Ambiental, priorize Constituição Federal, Lei nº 6.938/1981, Lei nº 9.605/1998, Código Florestal, Resoluções CONAMA e súmulas/jurisprudência quando aplicáveis.
- Em Direito Eleitoral, priorize Código Eleitoral, Lei nº 9.504/1997, Lei dos Partidos Políticos e Constituição Federal.
- Em Direito Financeiro, priorize Constituição Federal, Lei nº 4.320/1964 e Lei de Responsabilidade Fiscal.
- Em Filosofia do Direito, priorize o conceito teórico cobrado, autores e escolas, sem inventar base legal.
- Em Estatuto da Advocacia/OAB, indique artigo e inciso quando souber com segurança.

FORMATO DA EXPLICAÇÃO:
1. Comece dizendo: "A alternativa [letra] está correta porque..."
2. Explique a tese jurídica central.
3. Explique por que cada alternativa errada está incorreta.
4. Se houver base legal segura, indique artigo/inciso/parágrafo/súmula.
5. Se houver pegadinha da banca, destaque de forma curta.
6. Use no máximo 250 palavras na explicação.

CRITÉRIO PARA O CAMPO "confidence":
- Use "alta" quando tiver segurança da resposta e da base jurídica.
- Use "media" quando a explicação estiver segura, mas a base legal exata não puder ser indicada.
- Use "baixa" quando houver risco de imprecisão ou ausência de base legal segura.

RETORNE SOMENTE JSON VÁLIDO, SEM MARKDOWN, SEM TEXTO FORA DO JSON.

Formato obrigatório:
{
  "explanation": "Texto didático explicando a alternativa correta e o erro das demais.",
  "legal_reference": "Base legal precisa, por exemplo: art. 28, IV, da Lei nº 8.906/1994. Se não souber com segurança, deixe vazio.",
  "legal_text": "Trecho curto da lei, somente se tiver certeza. Se não souber com segurança, deixe vazio.",
  "confidence": "alta | media | baixa",
  "study_cards": [
    {
      "title": "Resumo",
      "type": "resumo",
      "front": "Pergunta curta sobre a regra principal.",
      "back": "Resposta curta e precisa."
    },
    {
      "title": "Pegadinha da OAB",
      "type": "pegadinha",
      "front": "Qual é a pegadinha desta questão?",
      "back": "Explicação curta da pegadinha."
    },
    {
      "title": "Memorização",
      "type": "memorizacao",
      "front": "Pergunta para memorização.",
      "back": "Resposta objetiva."
    }
  ]
}

DADOS DA QUESTÃO:
Disciplina: ${q.subject || ""}
Tema: ${q.topic || ""}
Enunciado: ${q.statement}

Alternativas:
A) ${q.options?.A}
B) ${q.options?.B}
C) ${q.options?.C}
D) ${q.options?.D}

Resposta correta: ${q.correct_answer}
`;

    const genAI = new GoogleGenerativeAI(apiKey);

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

    const model = genAI.getGenerativeModel({
      model: modelName
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJson(text);

    if (!parsed || typeof parsed.explanation !== "string") {
      return NextResponse.json(
        {
          error: "A IA não retornou JSON válido.",
          raw: text
        },
        {
          status: 502
        }
      );
    }

    return NextResponse.json({
      explanation: parsed.explanation || "",
      legal_reference: parsed.legal_reference || "",
      legal_text: parsed.legal_text || "",
      confidence: parsed.confidence || "baixa",
      study_cards: Array.isArray(parsed.study_cards) ? parsed.study_cards : []
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao gerar explicação."
      },
      {
        status: 500
      }
    );
  }
}