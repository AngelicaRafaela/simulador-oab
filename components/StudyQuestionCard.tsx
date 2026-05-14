"use client";

import type { Alternative, Question } from "@/lib/types";

type StudyQuestionCardProps = {
  question: Question;
  index: number;
  total: number;
  selectedAnswer?: Alternative | "";
  showAnswer: boolean;
  notes: string;
  onSelect: (answer: Alternative) => void;
  onShowAnswer: () => void;
  onNotesChange: (value: string) => void;
};

const ALTERNATIVES: Alternative[] = ["A", "B", "C", "D"];

export function StudyQuestionCard({
  question,
  index,
  total,
  selectedAnswer,
  showAnswer,
  notes,
  onSelect,
  onShowAnswer,
  onNotesChange
}: StudyQuestionCardProps) {
  const isCorrect = selectedAnswer === question.correct_answer;
  const hasSelected = Boolean(selectedAnswer);

  return (
    <div className="session-question-card">
      <div className="session-question-meta">
        <div className="session-question-badges">
          <span className="badge">{question.exam || "OAB"}</span>
          <span className="badge">{question.subject || "Sem disciplina"}</span>
          {question.topic && <span className="badge">{question.topic}</span>}
        </div>

        <span className="session-question-counter">
          {index + 1} / {total}
        </span>
      </div>

      <div className="session-progress">
        <div style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <article className="session-statement">
        <p>{question.statement}</p>
      </article>

      <div className="session-options">
        {ALTERNATIVES.map((alternative) => {
          const isSelected = selectedAnswer === alternative;
          const isRight = question.correct_answer === alternative;

          const className = [
            "session-option",
            isSelected ? "selected" : "",
            showAnswer && isRight ? "correct" : "",
            showAnswer && isSelected && !isRight ? "wrong" : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={alternative}
              type="button"
              className={className}
              onClick={() => onSelect(alternative)}
              disabled={showAnswer}
            >
              <strong>{alternative}</strong>
              <span>{question.options[alternative]}</span>
            </button>
          );
        })}
      </div>

      {!showAnswer ? (
        <div className="session-center-actions">
          <button
            type="button"
            className="btn"
            onClick={onShowAnswer}
            disabled={!hasSelected}
          >
            Ver Gabarito
          </button>
        </div>
      ) : (
        <>
          <div className={`session-feedback ${isCorrect ? "correct" : "wrong"}`}>
            {isCorrect ? (
              <strong>Correto! Boa resposta.</strong>
            ) : (
              <strong>
                Errado. A resposta correta é {question.correct_answer}.
              </strong>
            )}
          </div>

          {(question.explanation || question.legal_reference) && (
            <section className="session-explanation">
              <h3>Explicação da IA</h3>

              {question.explanation && <p>{question.explanation}</p>}

              {question.legal_reference && (
                <p>
                  <strong>Base legal:</strong> {question.legal_reference}
                </p>
              )}
            </section>
          )}
        </>
      )}

      <section className="session-notes-inline">
        <details>
          <summary>Minhas anotações</summary>

          <textarea
            className="textarea"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Anote aqui dúvidas, pontos-chave, dicas..."
          />

          <p className="muted small">Salvo automaticamente.</p>
        </details>
      </section>
    </div>
  );
}