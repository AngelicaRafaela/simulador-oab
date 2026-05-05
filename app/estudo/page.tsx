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

  const filtered = useMemo(
    () =>
      validQuestions.filter(
        (q) => !subject || (q.subject || "Sem disciplina") === subject
      ),
    [validQuestions, subject]
  );

  const selectedQuestion = selected || filtered[0] || null;

  const updateQuestion = (q: Question) => {
    setQuestions(questions.map((item) => (item.id === q.id ? q : item)));
    setSelected(q);
  };

  const handleAi = async () => {
    if (!selectedQuestion) return;

    setLoadingAi(true);
    setAiError("");

    try {
      const generated = await generateExplanation(selectedQuestion);

      updateQuestion({
        ...selectedQuestion,
        explanation: generated.explanation,
        legal_reference: generated.legal_reference,
        legal_text: generated.legal_text,
        confidence: generated.confidence,
        study_cards: generated.study_cards,
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

  return (
    <div className="grid">
      <div className="card">
        <h1>Área de estudo</h1>

        <p className="lead">
          Estude as questões validadas antes de iniciar o simulado. Gere
          explicações e cards com Gemini.
        </p>

        <div className="form-row">
          <div>
            <label>Disciplina</label>

            <select
              className="select"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setSelected(null);
              }}
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
            <label>Questões validadas</label>

            <input
              className="input"
              value={`${filtered.length} questão(ões)`}
              readOnly
            />
          </div>

          <div>
            <label>Ação</label>

            <a className="btn" href="/simulado">
              Ir para simulado
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Lista</h2>

          {filtered.length === 0 ? (
            <p className="muted">Nenhuma questão validada encontrada.</p>
          ) : (
            <div className="grid">
              {filtered.map((q) => (
                <button
                  key={q.id}
                  className={`option ${
                    selectedQuestion?.id === q.id ? "selected" : ""
                  }`}
                  onClick={() => setSelected(q)}
                >
                  <strong>Questão {q.number}</strong>
                  <br />

                  <span className="muted">
                    {q.subject || "Sem disciplina"}
                  </span>
                  <br />

                  {q.statement.slice(0, 140)}...
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          {!selectedQuestion ? (
            <p className="muted">Selecione uma questão para estudar.</p>
          ) : (
            <>
              <h2>Questão {selectedQuestion.number}</h2>

              <p className="muted">
                {selectedQuestion.subject || "Sem disciplina"} • Resposta:{" "}
                <strong>{selectedQuestion.correct_answer}</strong>
              </p>

              <p style={{ lineHeight: 1.8 }}>{selectedQuestion.statement}</p>

              <div className="question-box">
                {(["A", "B", "C", "D"] as const).map((alt) => (
                  <div
                    key={alt}
                    className={`option ${
                      selectedQuestion.correct_answer === alt ? "correct" : ""
                    }`}
                  >
                    <strong>{alt})</strong> {selectedQuestion.options[alt]}
                  </div>
                ))}
              </div>

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

              <div className="divider" />

              <StudyExplanation question={selectedQuestion} />
            </>
          )}
        </div>
      </div>
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