"use client";

import Link from "next/link";
import type { Question, Simulation } from "@/lib/types";

function getScoreTone(score: number) {
  if (score >= 70) {
    return {
      scoreClass: "score-good",
      statusLabel: "Ótimo resultado"
    };
  }

  if (score >= 40) {
    return {
      scoreClass: "score-medium",
      statusLabel: "Resultado mediano"
    };
  }

  return {
    scoreClass: "score-bad",
    statusLabel: "Precisa revisar mais"
  };
}

export function SimulationResultView({
  simulation,
  questions,
  title
}: {
  simulation: Simulation;
  questions: Question[];
  title?: string;
}) {
  const questionsMap = new Map(questions.map((q) => [q.id, q]));

  const answeredCount = simulation.answers.length;
  const unansweredCount = Math.max(
    simulation.total_questions - answeredCount,
    0
  );

  const score = Number(simulation.score_percentage || 0);
  const { scoreClass, statusLabel } = getScoreTone(score);

  const reviewItems = simulation.answers.map((answer) => {
    const question = questionsMap.get(answer.question_id);

    return {
      ...answer,
      question
    };
  });

  return (
    <div className="result-page">
      <div className="result-header">
        <div>
          <h1>Resultado</h1>
          <p className="lead">
            {title || "Simulado concluído"}
          </p>
        </div>

        <div className="actions">
          <Link className="btn secondary" href="/simulado">
            Novo simulado
          </Link>

          <Link className="btn" href="/estudo">
            Ir para estudos
          </Link>
        </div>
      </div>

      <div className="result-summary-card card">
        <div className="result-trophy">🏆</div>

        <div className={`result-score ${scoreClass}`}>
          {score.toFixed(1)}%
        </div>

        <p className="result-summary-text">
          {simulation.total_correct} acertos de {simulation.total_questions} questões
        </p>

        <p className="muted small">{statusLabel}</p>

        <div className="result-metrics">
          <div className="result-metric">
            <strong className="score-good">{simulation.total_correct}</strong>
            <span>Corretas</span>
          </div>

          <div className="result-metric">
            <strong className="score-bad">{simulation.total_wrong}</strong>
            <span>Erradas</span>
          </div>

          <div className="result-metric">
            <strong className="score-neutral">{unansweredCount}</strong>
            <span>Sem resposta</span>
          </div>
        </div>
      </div>

      <div className="result-review-section">
        <div className="result-section-title">
          <h2>Revisão das questões</h2>
          <p className="muted">
            Veja rapidamente o que acertou e errou no simulado.
          </p>
        </div>

        <div className="result-review-list">
          {reviewItems.map((item, index) => {
            const question = item.question;
            const toneClass = item.is_correct
              ? "review-correct"
              : "review-wrong";

            return (
              <div
                className={`result-review-item ${toneClass}`}
                key={`${item.question_id}-${index}`}
              >
                <div className="result-review-icon">
                  {item.is_correct ? "✓" : "✕"}
                </div>

                <div className="result-review-content">
                  <div className="result-review-top">
                    <div className="result-review-badges">
                      <span className="badge">
                        {question?.exam || "Prova"}
                      </span>

                      <span className="badge">
                        {question?.subject || "Sem disciplina"}
                      </span>

                      {question?.main_topic && (
                        <span className="badge">
                          {question.main_topic}
                        </span>
                      )}
                    </div>

                    <div className="result-review-answer-line">
                      <span>
                        Sua: <strong>{item.selected_answer}</strong>
                      </span>

                      {!item.is_correct && (
                        <span>
                          • Correta:{" "}
                          <strong className="score-good">
                            {item.correct_answer}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="result-review-snippet">
                    <strong>
                      Questão {question?.number || index + 1}
                    </strong>{" "}
                    {question?.statement
                      ? question.statement.slice(0, 180)
                      : "Enunciado não encontrado."}
                    {question?.statement && question.statement.length > 180
                      ? "..."
                      : ""}
                  </div>
                </div>
              </div>
            );
          })}

          {reviewItems.length === 0 && (
            <div className="card">
              <p className="muted">
                Nenhuma resposta encontrada para este simulado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}