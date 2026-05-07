"use client";

import { useMemo, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { SimulationResultView } from "@/components/SimulationResultView";
import { useOabData } from "@/hooks/useOabData";
import type {
  Alternative,
  Question,
  Simulation,
  SimulationAnswer
} from "@/lib/types";

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function SimuladoContent() {
  const { questions, simulations, setSimulations } = useOabData();

  const [subject, setSubject] = useState("");
  const [count, setCount] = useState(10);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Alternative>>({});
  const [result, setResult] = useState<Simulation | null>(null);

  const validated = useMemo(
    () => questions.filter((q) => q.review_status === "validado"),
    [questions]
  );

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(validated.map((q) => q.subject || "Sem disciplina"))
      ).sort(),
    [validated]
  );

  const currentPool = validated.filter(
    (q) => !subject || (q.subject || "Sem disciplina") === subject
  );

  const start = () => {
    const pool = validated.filter(
      (q) => !subject || (q.subject || "Sem disciplina") === subject
    );

    const chosen = shuffle(pool).slice(0, Math.min(count, pool.length));

    setSelectedQuestions(chosen);
    setAnswers({});
    setIndex(0);
    setStartedAt(new Date().toISOString());
    setResult(null);
    setRunning(true);
  };

  const finish = () => {
    const items: SimulationAnswer[] = [];

    for (const q of selectedQuestions) {
      const selected = answers[q.id];

      if (!selected) continue;

      items.push({
        question_id: q.id,
        number: q.number,
        selected_answer: selected,
        correct_answer: q.correct_answer,
        is_correct: selected === q.correct_answer
      });
    }

    const totalCorrect = items.filter((a) => a.is_correct).length;
    const totalQuestions = selectedQuestions.length;

    const simulation: Simulation = {
      id: `sim-${Date.now()}`,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      total_questions: totalQuestions,
      total_correct: totalCorrect,
      total_wrong: totalQuestions - totalCorrect,
      score_percentage: totalQuestions
        ? Math.round((totalCorrect / totalQuestions) * 10000) / 100
        : 0,
      answers: items
    };

    setSimulations([simulation, ...simulations]);
    setResult(simulation);
    setRunning(false);
  };

  if (result) {
    return (
      <SimulationResultView
        simulation={result}
        questions={questions}
        title={`Simulado #${simulations.length} concluído`}
      />
    );
  }

  if (running) {
    const q = selectedQuestions[index];

    if (!q) {
      return (
        <div className="card">
          <h1>Simulado</h1>

          <p className="muted">Nenhuma questão selecionada.</p>

          <button className="btn" onClick={() => setRunning(false)}>
            Voltar
          </button>
        </div>
      );
    }

    const selected = answers[q.id];
    const isLast = index === selectedQuestions.length - 1;
    const allAnswered = selectedQuestions.every((item) => answers[item.id]);

    return (
      <div className="grid">
        <div className="card">
          <p className="muted">
            Questão {index + 1} de {selectedQuestions.length} • {q.subject}
          </p>

          <h2>Questão {q.number}</h2>

          <p style={{ lineHeight: 1.8 }}>{q.statement}</p>

          <div className="question-box">
            {(["A", "B", "C", "D"] as const).map((alt) => (
              <button
                key={alt}
                className={`option ${selected === alt ? "selected" : ""}`}
                onClick={() =>
                  setAnswers((current) => ({
                    ...current,
                    [q.id]: alt
                  }))
                }
              >
                <strong>{alt})</strong> {q.options[alt]}
              </button>
            ))}
          </div>

          <div className="actions">
            <button
              className="btn secondary"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              Anterior
            </button>

            {!isLast ? (
              <button
                className="btn"
                onClick={() => setIndex(index + 1)}
                disabled={!selected}
              >
                Próxima
              </button>
            ) : (
              <button className="btn" onClick={finish} disabled={!allAnswered}>
                Finalizar
              </button>
            )}

            <button
              className="btn ghost"
              onClick={() => {
                setRunning(false);
                setSelectedQuestions([]);
              }}
            >
              Cancelar
            </button>
          </div>

          {!allAnswered && isLast && (
            <p className="muted">Responda todas as questões para finalizar.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card">
        <h1>Simulado</h1>

        <p className="lead">
          O simulado usa apenas questões com status <strong>validado</strong>.
        </p>

        <div className="form-row">
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
            <label>Quantidade</label>

            <input
              className="input"
              type="number"
              min={1}
              max={80}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Disponíveis</label>

            <input
              className="input"
              value={`${currentPool.length} questões`}
              readOnly
            />
          </div>
        </div>

        <div className="actions">
          <button
            className="btn"
            onClick={start}
            disabled={currentPool.length === 0}
          >
            Iniciar
          </button>
        </div>

        {currentPool.length === 0 && (
          <div className="notice">
            Nenhuma questão validada encontrada. Importe as questões e depois o
            gabarito oficial para validação automática.
          </div>
        )}
      </div>
    </div>
  );
}

export default function SimuladoPage() {
  return (
    <ClientOnly>
      <SimuladoContent />
    </ClientOnly>
  );
}