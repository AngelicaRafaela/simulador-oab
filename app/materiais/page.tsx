"use client";

import { useMemo, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";

type StudySection = {
  title: string;
  items: string[];
};

type StudyTopic = {
  title: string;
  short_summary: string;
  deep_explanation: string;
  key_points: string[];
  oab_attention: string;
  legal_references: string[];
  sections?: StudySection[];
};

type StudyMaterial = {
  id: string;
  title: string;
  discipline: string;
  main_topic: string;
  source_file_name: string;
  summary: string;
  study_objective: string;
  topics: StudyTopic[];
  suggested_study_order: string[];
  review_checklist: string[];
  created_at: string;
  updated_at: string;
};

const STORAGE_KEY = "oab-study-materials-v1";

function loadMaterials(): StudyMaterial[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMaterials(materials: StudyMaterial[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
}

function MateriaisContent() {
  const [materials, setMaterials] = useState<StudyMaterial[]>(loadMaterials);
  const [selectedId, setSelectedId] = useState("");
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const disciplines = useMemo(
    () =>
      Array.from(new Set(materials.map((item) => item.discipline))).sort(),
    [materials]
  );

  const filteredMaterials = useMemo(() => {
    return materials.filter(
      (item) => !disciplineFilter || item.discipline === disciplineFilter
    );
  }, [materials, disciplineFilter]);

  const selectedMaterial =
    materials.find((item) => item.id === selectedId) ||
    filteredMaterials[0] ||
    null;

  const selectedTopic =
    selectedMaterial?.topics?.[selectedTopicIndex] ||
    selectedMaterial?.topics?.[0] ||
    null;

const prettifyLabel = (value: string) => {
  const normalized = value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const replacements: Record<string, string> = {
    "Vedacao Ao Anonimato": "Vedação ao anonimato",
    "Direito De Resposta": "Direito de resposta",
    "Liberdade Religiosa": "Liberdade religiosa",
    "Escusa De Consciencia": "Escusa de consciência",
    "Atividade Intelectual Artistica Cientifica Comunicacao":
      "Atividade intelectual, artística, científica e de comunicação",
    "Intimidade Vida Privada Honra Imagem":
      "Intimidade, vida privada, honra e imagem",
    "Inviolabilidade De Domicilio": "Inviolabilidade de domicílio",
    "Regra Geral": "Regra geral",
    "Conceito De Casa": "Conceito de casa",
    "Com Consentimento Do Morador": "Com consentimento do morador",
    "Sem Consentimento Durante O Dia": "Sem consentimento durante o dia",
    "Sem Consentimento A Noite": "Sem consentimento à noite",
    "Pegadinha Oab": "Pegadinha OAB",
    "Inviolabilidade De Sigilos": "Inviolabilidade de sigilos",
    "Cpi E Sigilos": "CPI e sigilos",
    "Livre Exercicio Profissional": "Livre exercício profissional",
    "Acesso A Informacao": "Acesso à informação",
    "Livre Locomocao": "Livre locomoção",
    "Direito De Reuniao": "Direito de reunião",
    "Associacoes": "Associações",
    "Dissolucao E Suspensao De Associacoes":
      "Dissolução e suspensão de associações",
    "Liberdade De Associacao": "Liberdade de associação",
    "Representacao Por Entidades Associativas":
      "Representação por entidades associativas",
    "Direito De Propriedade": "Direito de propriedade",
    "Desapropriacao": "Desapropriação",
    "Desapropriacao Sancao": "Desapropriação-sanção",
    "Necessidade Utilidade Publica Ou Interesse Social":
      "Necessidade, utilidade pública ou interesse social",
    "Uso Da Propriedade Particular": "Uso da propriedade particular",
    "Art 243": "Art. 243",
    "Pequena Propriedade Rural": "Pequena propriedade rural",
    "Direito Sucessorio": "Direito sucessório",
    "Direito Autoral": "Direito autoral",
    "Direito De Peticao E Certidao": "Direito de petição e certidão",
    "Direito De Peticao": "Direito de petição",
    "Direito De Certidao": "Direito de certidão",
    "Observacao Oab": "Observação OAB",
    "Inafastabilidade De Jurisdicao": "Inafastabilidade de jurisdição",
    "Direito Adquirido Ato Juridico Perfeito Coisa Julgada":
      "Direito adquirido, ato jurídico perfeito e coisa julgada",
    "Juiz Natural": "Juiz natural",
    "Tribunal Do Juri": "Tribunal do Júri",
    "Crimes Dolosos Contra A Vida Listados No Pdf":
      "Crimes dolosos contra a vida listados no PDF",
    "Crimes Conexos": "Crimes conexos",
    "Foro Por Prerrogativa De Funcao": "Foro por prerrogativa de função",
    "Irretroatividade Da Lei Penal": "Irretroatividade da lei penal",
    "Crimes Imprescritiveis": "Crimes imprescritíveis",
    "Observacao Pdf": "Observação do PDF",
    "Conceito De Imprescritivel": "Conceito de imprescritível",
    "Crimes Hediondos Ttt": "Crimes hediondos + TTT",
    "Personalidade Da Pena": "Personalidade da pena",
    "Penas Permitidas": "Penas permitidas",
    "Penas Proibidas": "Penas proibidas",
    "Direitos Dos Presos": "Direitos dos presos",
    "Penas Observacao Atualizacao Legislativa":
      "Observação sobre atualização legislativa das penas",
    "Informacao Do Pdf": "Informação do PDF",
    "Atualizacao Legislativa": "Atualização legislativa",
    "Orientacao De Estudo": "Orientação de estudo"
  };

  return replacements[normalized] || normalized;
};

const flattenValue = (value: any, prefix = ""): string[] => {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [prefix ? `${prefix}: ${value}` : String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
      ) {
        return [prefix ? `${prefix}: ${item}` : String(item)];
      }

      return flattenValue(item, prefix);
    });
  }

  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => {
      const label = prettifyLabel(key);
      const nextPrefix = prefix ? `${prefix} - ${label}` : label;

      return flattenValue(item, nextPrefix);
    });
  }

  return [prefix ? `${prefix}: ${String(value)}` : String(value)];
};

const formatValue = (value: any): string[] => {
  return flattenValue(value);
};

const assuntoToTopic = (assunto: any): StudyTopic => {
  const sections: StudySection[] = [];

  if (Array.isArray(assunto.pontos_de_estudo)) {
    sections.push({
      title: "Pontos de estudo",
      items: assunto.pontos_de_estudo.map((ponto: any) => {
        const titulo = ponto.topico || ponto.titulo || "Ponto";
        const autor = ponto.autor ? ` (${ponto.autor})` : "";
        const conteudo = ponto.conteudo || "";

        return `${titulo}${autor}: ${conteudo}`;
      })
    });
  }

  if (assunto.classificacoes) {
    sections.push({
      title: "Classificações",
      items: formatValue(assunto.classificacoes)
    });
  }

  if (assunto.elementos) {
    sections.push({
      title: "Elementos",
      items: formatValue(assunto.elementos)
    });
  }

  if (assunto.funcoes) {
    sections.push({
      title: "Funções",
      items: formatValue(assunto.funcoes)
    });
  }

  if (assunto.tipos) {
    sections.push({
      title: "Tipos",
      items: formatValue(assunto.tipos)
    });
  }

  if (assunto.preambulo) {
    sections.push({
      title: "Preâmbulo",
      items: formatValue(assunto.preambulo)
    });
  }

  if (assunto.adct) {
    sections.push({
      title: "ADCT",
      items: formatValue(assunto.adct)
    });
  }

  if (assunto.republica) {
    sections.push({
      title: "República",
      items: formatValue(assunto.republica)
    });
  }

  if (assunto.fundamentos_art_1) {
    sections.push({
      title: "Fundamentos do art. 1º",
      items: formatValue(assunto.fundamentos_art_1)
    });
  }

  if (assunto.democracia) {
    sections.push({
      title: "Democracia",
      items: formatValue(assunto.democracia)
    });
  }

  if (assunto.objetivos_art_3) {
    sections.push({
      title: "Objetivos do art. 3º",
      items: formatValue(assunto.objetivos_art_3)
    });
  }

  if (assunto.principios_relacoes_internacionais_art_4) {
    sections.push({
      title: "Relações internacionais",
      items: formatValue(assunto.principios_relacoes_internacionais_art_4)
    });
  }

  if (assunto.dimensoes) {
    sections.push({
      title: "Dimensões dos direitos fundamentais",
      items: formatValue(assunto.dimensoes)
    });
  }

  if (assunto.topicos) {
    sections.push({
      title: "Tópicos do art. 5º",
      items: formatValue(assunto.topicos)
    });
  }

  if (Array.isArray(assunto.atencao)) {
    sections.push({
      title: "Atenção para prova",
      items: assunto.atencao
    });
  }

  const resumo = Array.isArray(assunto.resumo)
    ? assunto.resumo
    : assunto.resumo
      ? [assunto.resumo]
      : [];

  return {
    title: assunto.tema || assunto.titulo || "Tópico sem título",
    short_summary: resumo.join(" "),
    deep_explanation: "",
    key_points: resumo,
    oab_attention: Array.isArray(assunto.atencao)
      ? assunto.atencao.join(" ")
      : "",
    legal_references: assunto.paginas
      ? [`Página(s) ${assunto.paginas.join(", ")} do material enviado`]
      : [],
    sections
  };
};

const handleUpload = async () => {
  if (!file) {
    setError("Selecione um arquivo JSON antes de importar.");
    return;
  }

  setLoading(true);
  setError("");
  setMessage("");

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const topics = Array.isArray(parsed.topics)
      ? parsed.topics
      : Array.isArray(parsed.topicos)
        ? parsed.topicos
        : Array.isArray(parsed.assuntos)
          ? parsed.assuntos.map(assuntoToTopic)
          : [];

    const material: StudyMaterial = {
      id: parsed.id || `mat-${Date.now()}`,
      title:
        parsed.title ||
        parsed.titulo ||
        parsed.documento?.titulo ||
        "Material de estudo",
      discipline:
        parsed.discipline ||
        parsed.disciplina ||
        "Direito Constitucional",
      main_topic:
        parsed.main_topic ||
        parsed.materia ||
        parsed.titulo ||
        parsed.assuntos?.[0]?.tema ||
        "Material importado",
      source_file_name:
        parsed.source_file_name ||
        parsed.fonte?.arquivo ||
        file.name,
      summary:
        parsed.summary ||
        parsed.resumo ||
        parsed.fonte?.observacao ||
        `Material importado com ${topics.length} tópico(s) de estudo.`,
      study_objective:
        parsed.study_objective ||
        parsed.objetivo_estudo ||
        "Estudar e revisar os principais pontos do material.",
      topics,
      suggested_study_order: Array.isArray(parsed.suggested_study_order)
        ? parsed.suggested_study_order
        : Array.isArray(parsed.ordem_estudo)
          ? parsed.ordem_estudo
          : Array.isArray(parsed.assuntos)
            ? parsed.assuntos.map((assunto: any) => assunto.tema).filter(Boolean)
            : [],
      review_checklist: Array.isArray(parsed.review_checklist)
        ? parsed.review_checklist
        : Array.isArray(parsed.checklist_revisao)
          ? parsed.checklist_revisao
          : Array.isArray(parsed.checklist_oab)
            ? parsed.checklist_oab
            : [],
      created_at: parsed.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!material.topics || material.topics.length === 0) {
      throw new Error(
        "O JSON foi lido, mas não possui tópicos reconhecíveis. Use 'topics', 'topicos' ou 'assuntos'."
      );
    }

    const nextMaterials = [material, ...materials];

    setMaterials(nextMaterials);
    saveMaterials(nextMaterials);
    setSelectedId(material.id);
    setSelectedTopicIndex(0);
    setFile(null);
    setMessage("Material JSON importado com sucesso.");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Erro ao importar o arquivo JSON."
    );
  } finally {
    setLoading(false);
  }
};

  const handleDelete = (id: string) => {
    const confirmDelete = window.confirm(
      "Deseja excluir este material de estudo?"
    );

    if (!confirmDelete) return;

    const next = materials.filter((item) => item.id !== id);

    setMaterials(next);
    saveMaterials(next);
    setSelectedId("");
    setSelectedTopicIndex(0);
  };

  return (
    <div className="materials-page">
      <section className="card">
        <div
          className="actions"
          style={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginTop: 0
          }}
        >
          <div>
            <h1>Estudo aprofundado</h1>

<p className="lead">
  Importe materiais em JSON para estudar por disciplina, matéria e tópicos aprofundados.
</p>
          </div>
        </div>

        <div className="form-row" style={{ marginTop: 16 }}>
          <div>
            <label>Arquivo JSON de estudo</label>

          <input
  className="input"
  type="file"
  accept="application/json,.json"
  onChange={(event) => setFile(event.target.files?.[0] || null)}
/>
          </div>

          <div>
            <label>Filtro por disciplina</label>

            <select
              className="select"
              value={disciplineFilter}
              onChange={(event) => {
                setDisciplineFilter(event.target.value);
                setSelectedId("");
                setSelectedTopicIndex(0);
              }}
            >
              <option value="">Todas</option>

              {disciplines.map((discipline) => (
                <option key={discipline} value={discipline}>
                  {discipline}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Ação</label>

            <button className="btn" onClick={handleUpload} disabled={loading}>
              {loading ? "Importando JSON..." : "Importar material JSON"}
            </button>
          </div>
        </div>

        {message && (
          <div className="success" style={{ marginTop: 16 }}>
            {message}
          </div>
        )}

        {error && (
          <div className="error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}
      </section>

      {filteredMaterials.length === 0 ? (
        <section className="card">
          <p className="muted">
            Nenhum material encontrado. Envie um PDF para gerar um estudo
            aprofundado.
          </p>
        </section>
      ) : (
        <section className="materials-layout">
          <aside className="materials-sidebar card">
            <h2>Materiais</h2>

            <div className="materials-list">
              {filteredMaterials.map((material) => (
                <button
                  key={material.id}
                  className={`material-list-item ${
                    selectedMaterial?.id === material.id ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedId(material.id);
                    setSelectedTopicIndex(0);
                  }}
                >
                  <strong>{material.main_topic}</strong>
                  <span>{material.discipline}</span>
                  <small>{material.source_file_name}</small>
                </button>
              ))}
            </div>
          </aside>

          {selectedMaterial && (
            <main className="materials-content">
              <section className="card">
                <div
                  className="actions"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginTop: 0
                  }}
                >
                  <div>
                    <span className="badge">
                      {selectedMaterial.discipline}
                    </span>

                    <h2 style={{ marginTop: 12 }}>
                      {selectedMaterial.main_topic}
                    </h2>

                    <p className="muted">
                      Fonte: {selectedMaterial.source_file_name}
                    </p>
                  </div>

                  <button
                    className="btn danger"
                    onClick={() => handleDelete(selectedMaterial.id)}
                  >
                    Excluir
                  </button>
                </div>

                {selectedMaterial.summary && (
                  <>
                    <div className="divider" />

                    <h3>Resumo geral</h3>

                    <p style={{ lineHeight: 1.8 }}>
                      {selectedMaterial.summary}
                    </p>
                  </>
                )}

                {selectedMaterial.study_objective && (
                  <div className="notice">
                    <strong>Objetivo do estudo:</strong>{" "}
                    {selectedMaterial.study_objective}
                  </div>
                )}
              </section>

              <section className="materials-topic-layout">
                <aside className="card">
                  <h3>Tópicos</h3>

                  <div className="materials-topic-list">
                    {selectedMaterial.topics.map((topic, index) => (
                      <button
                        key={`${topic.title}-${index}`}
                        className={`topic-button ${
                          selectedTopicIndex === index ? "active" : ""
                        }`}
                        onClick={() => setSelectedTopicIndex(index)}
                      >
                        {topic.title}
                      </button>
                    ))}
                  </div>
                </aside>

                <article className="card">
                  {!selectedTopic ? (
                    <p className="muted">
                      Nenhum tópico encontrado neste material.
                    </p>
                  ) : (
                    <>
                      <h2>{selectedTopic.title}</h2>

                      <p className="lead">{selectedTopic.short_summary}</p>

                      <div className="divider" />

                      {selectedTopic.sections && selectedTopic.sections.length > 0 ? (
  <>
    <div className="divider" />

    <h3>Conteúdo do tópico</h3>

    <div className="material-section-list">
      {selectedTopic.sections.map((section, sectionIndex) => (
        <div
          className="material-section-card"
          key={`${section.title}-${sectionIndex}`}
        >
          <h4>{section.title}</h4>

          <ul className="material-list">
            {section.items.map((item, itemIndex) => (
              <li key={`${itemIndex}-${item.slice(0, 20)}`}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </>
) : selectedTopic.deep_explanation ? (
  <>
    <div className="divider" />

    <h3>Aprofundamento</h3>

    <p style={{ lineHeight: 1.85 }}>
      {selectedTopic.deep_explanation}
    </p>
  </>
) : null}

                      {selectedTopic.key_points?.length > 0 && (
                        <>
                          <div className="divider" />

                          <h3>Pontos importantes</h3>

                          <ul className="material-list">
                            {selectedTopic.key_points.map((point, index) => (
                              <li key={`${point}-${index}`}>{point}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {selectedTopic.oab_attention && (
                        <>
                          <div className="divider" />

                          <div className="notice">
                            <strong>Atenção para OAB:</strong>{" "}
                            {selectedTopic.oab_attention}
                          </div>
                        </>
                      )}

                      {selectedTopic.legal_references?.length > 0 && (
                        <>
                          <div className="divider" />

                          <h3>Base legal citada</h3>

                          <div className="actions">
                            {selectedTopic.legal_references.map(
                              (reference, index) => (
                                <span
                                  className="badge"
                                  key={`${reference}-${index}`}
                                >
                                  {reference}
                                </span>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </article>
              </section>

              {selectedMaterial.suggested_study_order?.length > 0 && (
                <section className="card">
                  <h3>Ordem sugerida de estudo</h3>

                  <ol className="material-list">
                    {selectedMaterial.suggested_study_order.map(
                      (item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      )
                    )}
                  </ol>
                </section>
              )}

              {selectedMaterial.review_checklist?.length > 0 && (
                <section className="card">
                  <h3>Checklist de revisão</h3>

                  <ul className="material-list">
                    {selectedMaterial.review_checklist.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}
            </main>
          )}
        </section>
      )}
    </div>
  );
}

export default function MateriaisPage() {
  return (
    <ClientOnly>
      <MateriaisContent />
    </ClientOnly>
  );
}