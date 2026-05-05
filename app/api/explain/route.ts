import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GroundingSource = {
  title: string;
  uri: string;
  official: boolean;
};

const OFFICIAL_DOMAINS = [
  "planalto.gov.br",
  "stf.jus.br",
  "stj.jus.br",
  "tst.jus.br",
  "tse.jus.br",
  "tre-",
  "trt",
  "trf",
  "cnj.jus.br",
  "senado.leg.br",
  "camara.leg.br",
  "cjf.jus.br",
  "oab.org.br",
  "cfoab.org.br",
  "oas.org",
  "corteidh.or.cr",
  "ilo.org",
  "who.int",
  "un.org",
  "receita.economia.gov.br",
  "gov.br",
  "ibama.gov.br",
  "mma.gov.br"
];

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

function sanitizeLegalText(value: unknown) {
  if (typeof value !== "string") return "";

  const cleaned = value.trim();

  if (!cleaned) return "";

  // Evita transcrições longas ou artigos com vários incisos.
  if (cleaned.length > 350) return "";

  // Evita texto com recortes, porque provavelmente não é literal completo/confiável.
  if (
    cleaned.includes("[...]") ||
    cleaned.includes("...") ||
    cleaned.includes("(...)") ||
    cleaned.includes("[…]")
  ) {
    return "";
  }

  // Evita quando a IA mistura vários artigos ou muitos incisos no mesmo campo.
  const tooManyLegalMarkers =
    (cleaned.match(/\bArt\.|\bart\.|\b§|\binciso\b|\bI\s*-|\bII\s*-|\bIII\s*-/g) || [])
      .length > 4;

  if (tooManyLegalMarkers) return "";

  return cleaned;
}

function isOfficialSource(uri: string) {
  const normalized = uri.toLowerCase();

  return OFFICIAL_DOMAINS.some((domain) => normalized.includes(domain));
}

function getGroundingSources(response: any): GroundingSource[] {
  const chunks =
    response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const web = chunk?.web;

    if (!web?.uri) continue;

    const uri = String(web.uri);
    const title = String(web.title || uri);

    sources.push({
      title,
      uri,
      official: isOfficialSource(uri)
    });
  }

  const deduplicated = new Map<string, GroundingSource>();

  for (const source of sources) {
    if (!deduplicated.has(source.uri)) {
      deduplicated.set(source.uri, source);
    }
  }

  return Array.from(deduplicated.values());
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

Sua tarefa é explicar uma questão objetiva da OAB com precisão jurídica, usando busca em fontes oficiais sempre que possível.

IMPORTANTE:
Você tem acesso à Pesquisa Google por grounding. Use a busca para conferir a base legal, súmula, artigo, inciso ou entendimento aplicável antes de responder.

FONTES PRIORITÁRIAS:
Use preferencialmente fontes oficiais, como:
- planalto.gov.br
- stf.jus.br
- stj.jus.br
- tst.jus.br
- tse.jus.br
- trf.jus.br
- trt.jus.br
- cnj.jus.br
- senado.leg.br
- camara.leg.br
- cfoab.org.br
- oab.org.br
- oas.org
- corteidh.or.cr
- ilo.org
- gov.br

REGRAS GERAIS:
- Responda em português do Brasil.
- Não use emojis.
- Não use linguagem informal.
- Não invente lei, artigo, inciso, parágrafo, súmula, tese ou jurisprudência.
- Se a fonte oficial não confirmar o artigo, inciso ou súmula, não cite esse artigo.
- Se não encontrar base legal oficial segura, deixe "legal_reference" como string vazia.
- Se souber apenas a lei, mas não o artigo, informe somente a lei.
- Se souber artigo, inciso, parágrafo, alínea ou súmula, informe com precisão.
- Nunca cite artigo aproximado ou duvidoso.
- Se citar artigo, ele precisa corresponder exatamente ao tema da questão.
- Não adapte ou invente texto legal.
- O campo "legal_text" NÃO é obrigatório.
- Prefira deixar "legal_text" vazio.
- Só preencha "legal_text" quando o trecho legal for curto, literal, essencial para entender a questão e confirmado em fonte oficial.
- Não transcreva artigos longos, parágrafos inteiros ou vários incisos.
- Não resuma lei dentro de "legal_text"; esse campo deve conter apenas texto literal.
- Se o artigo for longo, coloque apenas a referência em "legal_reference" e deixe "legal_text" vazio.
- Se houver qualquer dúvida sobre a literalidade do trecho, deixe "legal_text" vazio.
- Se a resposta depender de emenda constitucional, jurisprudência, súmula ou interpretação, prefira explicar no campo "technical_explanation" e deixar "legal_text" vazio.
- Não diga “conforme a lei” sem indicar qual lei, se souber.
- Não afirme que uma alternativa está errada sem explicar o motivo jurídico.
- Evite respostas genéricas.
- Priorize legislação vigente e entendimento consolidado.
- Se a questão for conceitual e não depender diretamente de artigo de lei, explique o conceito e deixe "legal_reference" vazio, salvo se houver referência segura.
- A explicação principal deve ser didática e simples.
- A fundamentação técnica deve ficar separada.
- Não coloque artigos logo no primeiro período, salvo se a questão depender diretamente da literalidade da lei.
- Se houver dúvida sobre o artigo exato, não cite o artigo.
- Antes de responder, confira se o inciso citado corresponde exatamente ao princípio ou regra indicada.
- Não mencione exceções complexas ou hipóteses secundárias se elas não forem necessárias para resolver a questão.
- Na explicação simples, foque apenas na regra que resolve a alternativa correta.

REGRAS ESPECÍFICAS DE PRECISÃO:
- Se a questão mencionar livre concorrência na Constituição Federal, confira se a referência correta é o art. 170, IV.
- Se a questão envolver lei municipal que impede instalação de estabelecimento comercial do mesmo ramo em determinada área, verifique a Súmula Vinculante 49 do STF.
- Se a questão envolver divulgação de advocacia em conjunto com outra atividade, verifique o art. 1º, § 3º, da Lei nº 8.906/1994.
- Se a questão envolver incompatibilidade ou impedimento na advocacia, verifique os arts. 27 a 30 da Lei nº 8.906/1994.
- Se a questão envolver infração disciplinar na advocacia, verifique o art. 34 da Lei nº 8.906/1994.
- Não use essas regras específicas se elas não forem compatíveis com o enunciado.

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
A resposta deve ter duas camadas:

1. "simple_explanation":
1. "simple_explanation":
- Explique de forma simples, como se estivesse ensinando uma pessoa que está começando a estudar para a OAB.
- Use linguagem clara e direta.
- Evite começar com muitos artigos, incisos e detalhes técnicos.
- Primeiro explique a lógica da questão.
- Depois diga, de forma curta, por que as alternativas erradas estão erradas.
- Não mencione exceções complexas ou hipóteses secundárias se elas não forem necessárias para resolver a questão.
- Foque apenas na regra que resolve a alternativa correta.
- Máximo de 160 palavras.

2. "technical_explanation":
- Explique a fundamentação jurídica com maior precisão.
- Indique artigo, inciso, parágrafo, súmula ou entendimento consolidado apenas quando tiver certeza.
- Não invente base legal.
- Se a base legal exata for duvidosa, deixe legal_reference vazio ou indique apenas a lei.
- Máximo de 180 palavras.

O campo "explanation" deve juntar as duas camadas em um único texto organizado assim:

Explicação simples:
[texto da simple_explanation]

Fundamentação técnica:
[texto da technical_explanation]

CRITÉRIO PARA O CAMPO "confidence":
- Use "alta" quando a resposta e a base jurídica forem confirmadas em fonte oficial.
- Use "media" quando a explicação estiver segura, mas a base legal exata não puder ser confirmada em fonte oficial.
- Use "baixa" quando houver risco de imprecisão ou ausência de fonte oficial segura.

REGRAS PARA OS CARDS:
- Os cards devem ajudar na memorização da regra central.
- Não crie cards muito longos.
- Não coloque base legal duvidosa nos cards.
- O card de pegadinha deve destacar a armadilha da questão.

RETORNE SOMENTE JSON VÁLIDO, SEM MARKDOWN, SEM TEXTO FORA DO JSON.

Formato obrigatório:
{
  "simple_explanation": "Explicação simples e didática para estudo inicial.",
  "technical_explanation": "Fundamentação jurídica mais técnica e precisa.",
  "explanation": "Explicação simples:\\n...\\n\\nFundamentação técnica:\\n...",
  "legal_reference": "Base legal precisa confirmada em fonte oficial. Se não souber com segurança, deixe vazio.",
  "legal_text": "Trecho literal, curto e essencial da lei. Na dúvida, deixe vazio.",
  "confidence": "alta | media | baixa",
  "official_sources_used": [
    {
      "title": "Nome da fonte oficial usada",
      "url": "URL oficial usada"
    }
  ],
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

    const ai = new GoogleGenAI({
      apiKey
    });

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [
          {
            googleSearch: {}
          }
        ]
      }
    });

    const text = response.text || "";
    const parsed = extractJson(text);
    const groundingSources = getGroundingSources(response);

    if (
  !parsed ||
  (
    typeof parsed.explanation !== "string" &&
    typeof parsed.simple_explanation !== "string" &&
    typeof parsed.technical_explanation !== "string"
  )
) {
  return NextResponse.json(
    {
      error: "A IA não retornou JSON válido.",
      raw: text,
      sources: groundingSources
    },
    {
      status: 502
    }
  );
}

    const simpleExplanation =
      typeof parsed.simple_explanation === "string"
        ? parsed.simple_explanation.trim()
        : "";

    const technicalExplanation =
      typeof parsed.technical_explanation === "string"
        ? parsed.technical_explanation.trim()
        : "";

   const fallbackExplanation =
  typeof parsed.explanation === "string" ? parsed.explanation.trim() : "";

    const finalExplanation =
      simpleExplanation || technicalExplanation
        ? [
            simpleExplanation
              ? `Explicação simples:\n${simpleExplanation}`
              : "",
            technicalExplanation
              ? `Fundamentação técnica:\n${technicalExplanation}`
              : ""
          ]
            .filter(Boolean)
            .join("\n\n")
        : fallbackExplanation;

    const officialGroundingSources = groundingSources.filter(
      (source) => source.official
    );

    const parsedOfficialSources = Array.isArray(parsed.official_sources_used)
      ? parsed.official_sources_used
      : [];

    return NextResponse.json({
      explanation: finalExplanation,
      legal_reference:
        typeof parsed.legal_reference === "string"
          ? parsed.legal_reference
          : "",
      legal_text: sanitizeLegalText(parsed.legal_text),
      confidence:
        parsed.confidence === "alta" ||
        parsed.confidence === "media" ||
        parsed.confidence === "baixa"
          ? parsed.confidence
          : "baixa",
      official_sources_used: parsedOfficialSources,
      grounding_sources: groundingSources,
      official_grounding_sources: officialGroundingSources,
      study_cards: Array.isArray(parsed.study_cards) ? parsed.study_cards : []
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao gerar explicação."
      },
      {
        status: 500
      }
    );
  }
}