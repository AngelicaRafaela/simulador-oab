"use client";

import { useMemo, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { useOabData } from "@/hooks/useOabData";
import { generateExplanation } from "@/lib/aiClient";
import type { Question, ReviewStatus } from "@/lib/types";
import { StudyExplanation } from "@/components/StudyExplanation";

function StatusBadge({ status }: { status: ReviewStatus }) {
  return <span className={`badge ${status}`}>{status}</span>;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  subject_confirmed: generated.subject_confirmed,
  main_topic: generated.main_topic,
  study_topics: generated.study_topics,
  study_focus: generated.study_focus,
  exam_trap: generated.exam_trap,

  subject: generated.subject_confirmed || question.subject,
  topic: generated.main_topic || question.topic,

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

      <div className="divider" />

      <StudyExplanation question={question} />
    </div>
  );
}

function BancoContent() {
  const { questions, setQuestions } = useOabData();

  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Question | null>(null);

  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkMessage, setBulkMessage] = useState("");

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

      const text =
        `${item.statement} ${item.subject} ${item.topic} ${item.number}`.toLowerCase();

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

  const handleBulkGenerate = async () => {
    if (bulkLoading) return;

    const confirmRun = window.confirm(
      "Deseja gerar explicações com IA para as questões filtradas que ainda não têm explicação? Esse processo pode demorar alguns minutos."
    );

    if (!confirmRun) return;

    const targetQuestions = filtered.filter((q) => !q.explanation);

    if (targetQuestions.length === 0) {
      setBulkMessage(
        "Nenhuma questão sem explicação encontrada nos filtros atuais."
      );
      return;
    }

    setBulkLoading(true);
    setBulkMessage("");
    setBulkProgress({ done: 0, total: targetQuestions.length });

    let updatedQuestions = [...questions];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < targetQuestions.length; i++) {
        const question = targetQuestions[i];

        try {
          const generated = await generateExplanation(question);

const updatedQuestion: Question = {
  ...question,
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

  subject: generated.subject_confirmed || question.subject,
  topic: generated.main_topic || question.topic,

  updated_at: new Date().toISOString()
};

          updatedQuestions = updatedQuestions.map((item) =>
            item.id === updatedQuestion.id ? updatedQuestion : item
          );

          setQuestions(updatedQuestions);

          if (selected?.id === updatedQuestion.id) {
            setSelected(updatedQuestion);
          }

          successCount++;
        } catch (error) {
          console.error(
            "Erro ao gerar explicação da questão",
            question.number,
            error
          );
          errorCount++;
        }

        setBulkProgress({ done: i + 1, total: targetQuestions.length });

        await delay(500);
      }

      setBulkMessage(
        `Processo concluído. ${successCount} questão(ões) geradas com sucesso e ${errorCount} com erro.`
      );
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="grid">
      <div className="card">
        <div
          className="actions"
          style={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginTop: 0
          }}
        >
          <div>
            <h1>Banco de questões</h1>

            <p className="lead">
              Revise, filtre, gere explicações e valide questões antes de
              usá-las no simulado.
            </p>
          </div>

          <button
            className="btn secondary"
            onClick={handleBulkGenerate}
            disabled={bulkLoading || filtered.length === 0}
            title="Gera explicações apenas para as questões filtradas que ainda não possuem explicação"
          >
            {bulkLoading
              ? `Gerando ${bulkProgress.done}/${bulkProgress.total}...`
              : "Gerar explicações e classificar com IA"}
          </button>
        </div>

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

      {bulkLoading && (
        <div className="card">
          <h3>Gerando explicações</h3>

          <p className="muted">
            Processando {bulkProgress.done} de {bulkProgress.total} questão(ões)...
          </p>

          <div className="progress">
            <div
              style={{
                width:
                  bulkProgress.total > 0
                    ? `${(bulkProgress.done / bulkProgress.total) * 100}%`
                    : "0%"
              }}
            />
          </div>
        </div>
      )}

      {bulkMessage && <div className="success">{bulkMessage}</div>}

      {selected && (
  <div className="modal-backdrop" onClick={() => setSelected(null)}>
    <div className="study-modal banco-modal" onClick={(e) => e.stopPropagation()}>
      <div className="study-modal-body">
        <QuestionDetail
          question={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(next) => updateStatus(selected, next)}
          onUpdateQuestion={updateQuestion}
        />
      </div>
    </div>
  </div>
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