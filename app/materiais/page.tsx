"use client";

import { useMemo, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";

type StudyTopic = {
  title: string;
  short_summary: string;
  deep_explanation: string;
  key_points: string[];
  oab_attention: string;
  legal_references: string[];
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

  const handleUpload = async () => {
    if (!file) {
      setError("Selecione um PDF antes de enviar.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/materials/analyze", {
  method: "POST",
  body: formData
});

const rawText = await response.text();

let data: any = null;

try {
  data = JSON.parse(rawText);
} catch {
  throw new Error(
    rawText?.slice(0, 300) ||
      "A API retornou uma resposta inválida. Verifique os logs da Vercel."
  );
}

if (!response.ok) {
  throw new Error(data?.error || "Erro ao analisar o PDF.");
}

      const nextMaterials = [data as StudyMaterial, ...materials];

      setMaterials(nextMaterials);
      saveMaterials(nextMaterials);
      setSelectedId(data.id);
      setSelectedTopicIndex(0);
      setFile(null);
      setMessage("PDF analisado e material de estudo criado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar o PDF.");
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
              Envie PDFs de estudo para a IA transformar em resumos, matérias e
              tópicos aprofundados.
            </p>
          </div>
        </div>

        <div className="form-row" style={{ marginTop: 16 }}>
          <div>
            <label>PDF de estudo</label>

            <input
              className="input"
              type="file"
              accept="application/pdf"
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
              {loading ? "Analisando PDF..." : "Enviar e analisar PDF"}
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

                      <h3>Aprofundamento</h3>

                      <p style={{ lineHeight: 1.85 }}>
                        {selectedTopic.deep_explanation}
                      </p>

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