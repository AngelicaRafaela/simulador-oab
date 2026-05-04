"use client";

import { useMemo, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { useOabData } from "@/hooks/useOabData";
import { generateExplanation } from "@/lib/aiClient";
import type { Question, ReviewStatus } from "@/lib/types";

function StatusBadge({ status }: { status: ReviewStatus }) {
  return <span className={`badge ${status}`}>{status}</span>;
}

function QuestionDetail({
  question,
  onClose,
  onStatusChange,
  onUpdateQuestion
}: {
  question: Question;
  onClose: () => void;
  onStatusChange: (status: ReviewStatus) => void;
  onUpdateQuestion: (question: Question) => void;
}) {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleAi = async () => {
    setLoadingAi(true);
    setAiError("");

    try {
      const generated = await generateExplanation(question);

      onUpdateQuestion({
        ...question,
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
    <div className="card">
      <div
        className="actions"
        style={{ justifyContent: "space-between", marginTop: 0 }}
      >
        <h2 style={{ margin: 0 }}>Questão {question.number}</h2>

        <button className="btn secondary" onClick={onClose}>
          Fechar
        </button>
      </div>

      <p className="muted">
        {question.exam} • {question.test_type} •{" "}
        {question.subject || "Sem disciplina"} •{" "}
        <StatusBadge status={question.review_status} />
      </p>

      <div className="divider" />

      <p style={{ lineHeight: 1.7 }}>{question.statement}</p>

      <div className="question-box">
        {(["A", "B", "C", "D"] as const).map((alt) => (
          <div
            key={alt}
            className={`option ${
              question.correct_answer === alt ? "correct" : ""
            }`}
          >
            <strong>{alt})</strong> {question.options[alt]}
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div>
          <label>Status</label>

          <select
            className="select"
            value={question.review_status}
            onChange={(e) => onStatusChange(e.target.value as ReviewStatus)}
          >
            <option value="pendente">pendente</option>
            <option value="precisa_revisao">precisa_revisao</option>
            <option value="validado">validado</option>
            <option value="rejeitado">rejeitado</option>
          </select>
        </div>

        <div>
          <label>Resposta correta</label>

          <input className="input" value={question.correct_answer} readOnly />
        </div>
      </div>

      <div className="actions">
        <button className="btn" onClick={handleAi} disabled={loadingAi}>
          {loadingAi ? "Gerando..." : "Gerar explicação com Gemini"}
        </button>
      </div>

      {aiError && <div className="error">{aiError}</div>}

      {(question.explanation ||
        question.legal_reference ||
        question.legal_text ||
        question.confidence) && (
        <>
          <div className="divider" />

          <h3>Estudo</h3>

          {question.explanation && <p>{question.explanation}</p>}

          {question.legal_reference && (
            <p>
              <strong>Base legal:</strong> {question.legal_reference}
            </p>
          )}

          {question.legal_text && (
            <p>
              <strong>Texto da lei:</strong> {question.legal_text}
            </p>
          )}

          {question.confidence && (
            <p>
              <strong>Confiança da IA:</strong> {question.confidence}
            </p>
          )}
        </>
      )}

      {question.study_cards && question.study_cards.length > 0 && (
        <>
          <div className="divider" />

          <h3>Cards</h3>

          <div className="grid grid-3">
            {question.study_cards.map((card, index) => (
              <div className="study-card" key={index}>
                <strong>{card.title}</strong>

                <p>{card.front}</p>

                <div className="divider" />

                <p>{card.back}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BancoContent() {
  const { questions, setQuestions } = useOabData();

  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Question | null>(null);

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(questions.map((q) => q.subject || "Sem disciplina"))
      ).sort(),
    [questions]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return questions.filter((item) => {
      const matchSubject =
        !subject || (item.subject || "Sem disciplina") === subject;

      const matchStatus = !status || item.review_status === status;

      const text = `${item.statement} ${item.subject} ${item.topic} ${item.number}`.toLowerCase();

      const matchSearch = !term || text.includes(term);

      return matchSubject && matchStatus && matchSearch;
    });
  }, [questions, subject, status, search]);

  const updateQuestion = (nextQuestion: Question) => {
    const next = questions.map((q) =>
      q.id === nextQuestion.id ? nextQuestion : q
    );

    setQuestions(next);
    setSelected(nextQuestion);
  };

  const updateStatus = (question: Question, nextStatus: ReviewStatus) => {
    updateQuestion({
      ...question,
      review_status: nextStatus,
      updated_at: new Date().toISOString()
    });
  };

  return (
    <div className="grid">
      <div className="card">
        <h1>Banco de questões</h1>

        <p className="lead">
          Revise, filtre, gere explicações e valide questões antes de usá-las no
          simulado.
        </p>

        <div className="notice">
          Ao importar o gabarito oficial, questões completas são validadas
          automaticamente. A validação manual continua disponível para ajustes.
        </div>

        <div className="form-row" style={{ marginTop: 16 }}>
          <div>
            <label>Buscar</label>

            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Texto, tema, número..."
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
            <label>Status</label>

            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendente">pendente</option>
              <option value="precisa_revisao">precisa_revisao</option>
              <option value="validado">validado</option>
              <option value="rejeitado">rejeitado</option>
            </select>
          </div>
        </div>
      </div>

      {selected && (
        <QuestionDetail
          question={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(next) => updateStatus(selected, next)}
          onUpdateQuestion={updateQuestion}
        />
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Disciplina</th>
              <th>Enunciado</th>
              <th>Status</th>
              <th>Gabarito</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((q) => (
              <tr key={q.id}>
                <td>{q.number}</td>

                <td>{q.subject || "Sem disciplina"}</td>

                <td>
                  {q.statement.slice(0, 170)}
                  {q.statement.length > 170 ? "..." : ""}
                </td>

                <td>
                  <StatusBadge status={q.review_status} />
                </td>

                <td>
                  <strong>{q.correct_answer}</strong>
                </td>

                <td>
                  <button
                    className="btn secondary"
                    onClick={() => setSelected(q)}
                  >
                    Abrir
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhuma questão encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BancoPage() {
  return (
    <ClientOnly>
      <BancoContent />
    </ClientOnly>
  );
}