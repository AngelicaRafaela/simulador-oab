"use client";

import { useMemo, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { StudyExplanation } from "@/components/StudyExplanation";
import { useOabData } from "@/hooks/useOabData";
import { generateExplanation } from "@/lib/aiClient";
import type { Question } from "@/lib/types";

function EstudoContent() {
  const { questions, setQuestions } = useOabData();

  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Question | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState("");

  const validQuestions = questions.filter((q) => q.review_status === "validado");

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(validQuestions.map((q) => q.subject || "Sem disciplina"))
      ).sort(),
    [validQuestions]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return validQuestions.filter((q) => {
      const matchSubject =
        !subject || (q.subject || "Sem disciplina") === subject;

      const text = `${q.number} ${q.subject} ${q.topic} ${q.statement}`.toLowerCase();

      const matchSearch = !term || text.includes(term);

      return matchSubject && matchSearch;
    });
  }, [validQuestions, subject, search]);

  const updateQuestion = (q: Question) => {
    setQuestions(questions.map((item) => (item.id === q.id ? q : item)));
    setSelected(q);
  };

  const handleAi = async () => {
    if (!selected) return;

    setLoadingAi(true);
    setAiError("");

    try {
      const generated = await generateExplanation(selected);

      updateQuestion({
  ...selected,
  explanation: generated.explanation,
  legal_reference: generated.legal_reference,
  legal_text: generated.legal_text,
  confidence: generated.confidence,
  study_cards: generated.study_cards,

  subject_confirmed: generated.subject_confirmed,
  main_topic: generated.main_topic,
  study_topics: generated.study_topics,
  study_focus: generated.study_focus,
  exam_trap: generated.exam_trap,

  subject: generated.subject_confirmed || selected.subject,
  topic: generated.main_topic || selected.topic,

  updated_at: new Date().toISOString()
});
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : "Erro ao gerar explicação."
      );
    } finally {
      setLoadingAi(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setAiError("");
  };

  return (
    <div className="grid">
      <div className="card">
        <h1>Área de estudo</h1>

        <p className="lead">
          Escolha uma questão para estudar. Ao clicar, ela abre em uma janela
          maior com alternativas, explicação, base legal e cards.
        </p>

        <div className="form-row">
          <div>
            <label>Buscar</label>

            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por texto, tema ou número..."
            />
          </div>

          <div>
            <label>Disciplina</label>

            <select
              className="select"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">Todas</option>

              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Questões</label>

            <input
              className="input"
              value={`${filtered.length} questão(ões)`}
              readOnly
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <p className="muted">Nenhuma questão validada encontrada.</p>
        </div>
      ) : (
        <div className="study-list-grid">
          {filtered.map((q) => (
            <button
              key={q.id}
              className="study-question-card"
              onClick={() => {
                setSelected(q);
                setAiError("");
              }}
            >
              <div className="study-question-card-header">
                <span className="badge validado">Questão {q.number}</span>
                <span className="muted small">
                  {q.subject || "Sem disciplina"}
                </span>
              </div>

              <h3>{q.topic || q.subject || "Questão de estudo"}</h3>

              <p>{q.statement.slice(0, 210)}...</p>

              <div className="study-question-card-footer">
                <span>Resposta: {q.correct_answer}</span>

                {q.explanation ? (
                  <span className="badge validado">Com explicação</span>
                ) : (
                  <span className="badge precisa_revisao">Sem explicação</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="study-modal" onClick={(e) => e.stopPropagation()}>
            <div className="study-modal-header">
              <div>
                <span className="badge validado">Questão {selected.number}</span>

                <h2>{selected.subject || "Sem disciplina"}</h2>

                <p className="muted">
                  {selected.exam} • {selected.test_type} • Resposta:{" "}
                  <strong>{selected.correct_answer}</strong>
                </p>
              </div>

              <button className="btn secondary" onClick={closeModal}>
                Fechar
              </button>
            </div>

            <div className="study-modal-body">
              <section className="study-modal-section">
                <h3>Enunciado</h3>

                <p style={{ lineHeight: 1.8 }}>{selected.statement}</p>
              </section>

              <section className="study-modal-section">
                <h3>Alternativas</h3>

                <div className="question-box">
                  {(["A", "B", "C", "D"] as const).map((alt) => (
                    <div
                      key={alt}
                      className={`option ${
                        selected.correct_answer === alt ? "correct" : ""
                      }`}
                    >
                      <strong>{alt})</strong> {selected.options[alt]}
                    </div>
                  ))}
                </div>
              </section>

              <div className="actions">
                <button
                  className="btn"
                  onClick={handleAi}
                  disabled={loadingAi}
                >
                  {loadingAi ? "Gerando..." : "Gerar explicação/cards"}
                </button>
              </div>

              {aiError && <div className="error">{aiError}</div>}

              <StudyExplanation question={selected} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EstudoPage() {
  return (
    <ClientOnly>
      <EstudoContent />
    </ClientOnly>
  );
}