"use client";

import { useMemo, useState } from "react";
import type { Alternative, Question } from "@/lib/types";
import { StudyQuestionCard } from "@/components/StudyQuestionCard";

export type StudyMaterialForSession = {
  id: string;
  title: string;
  discipline: string;
  main_topic: string;
  source_file_name: string;
  topics: Array<{
    title: string;
    short_summary?: string;
    deep_explanation?: string;
    key_points?: string[];
    oab_attention?: string;
    legal_references?: string[];
    sections?: Array<{
      title: string;
      items: string[];
    }>;
  }>;
};

export type ScheduleMatter = {
  title: string;
  label: string;
};

export type ScheduleSession = {
  id: string;
  date: string;
  discipline: string;
  matters: ScheduleMatter[];
  reading_minutes: number;
  questions_minutes: number;
  simulation_minutes: number;
  estimated_minutes: number;
  question_count: number;
  status: "pendente" | "em_andamento" | "concluido";
  completed_at?: string;
};

type SessionStep = "materials" | "questions" | "simulation" | "done";

type StudySessionModalProps = {
  session: ScheduleSession;
  materials: StudyMaterialForSession[];
  questions: Question[];
  onClose: () => void;
  onComplete: (sessionId: string) => void;
};

const QUESTION_NOTES_KEY = "oab-study-question-notes-v1";

function loadQuestionNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(QUESTION_NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveQuestionNotes(notes: Record<string, string>) {
  localStorage.setItem(QUESTION_NOTES_KEY, JSON.stringify(notes));
}

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function formatMatterTitle(name: string) {
  const cleaned = name
    .replace(/\s*-\s*continuação/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const replacements: Record<string, string> = {
    "Art. 5º - Direitos e deveres individuais e coletivos":
      "Art. 5º: Direitos e Deveres Individuais e Coletivos",
    "Art. 5º - direitos e deveres individuais e coletivos":
      "Art. 5º: Direitos e Deveres Individuais e Coletivos",
    "Art. 5º, §§ 1º a 4º e tratados internacionais":
      "Art. 5º, §§ 1º a 4º e Tratados Internacionais",
    "Competência exclusiva da União - art. 21":
      "Competência Exclusiva da União: Art. 21",
    "Competência privativa da União - art. 22":
      "Competência Privativa da União: Art. 22",
    "Competência comum - art. 23": "Competência Comum: Art. 23",
    "Competência concorrente - art. 24": "Competência Concorrente: Art. 24",
    "Direitos sociais - art. 6º a 11": "Direitos Sociais: Arts. 6º a 11",
    "Administração Pública - princípios": "Administração Pública: Princípios",
    "Nacionalidade - brasileiros natos": "Nacionalidade: Brasileiros Natos",
    "Nacionalidade - brasileiros naturalizados":
      "Nacionalidade: Brasileiros Naturalizados",
    "Organização do Estado - formas de Estado":
      "Organização do Estado: Formas de Estado",
    "Direito sindical - continuação": "Direito Sindical"
  };

  if (replacements[cleaned]) return replacements[cleaned];

  return cleaned
    .replace(/\s+-\s+/g, ": ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bDe\b/g, "de")
    .replace(/\bDa\b/g, "da")
    .replace(/\bDo\b/g, "do")
    .replace(/\bDas\b/g, "das")
    .replace(/\bDos\b/g, "dos")
    .replace(/\bE\b/g, "e")
    .replace(/\bA\b/g, "a")
    .replace(/\bO\b/g, "o")
    .replace(/\bAo\b/g, "ao")
    .replace(/\bÀ\b/g, "à");
}

function getQuestionsForSession(session: ScheduleSession, questions: Question[]) {
  const subjectQuestions = questions.filter(
    (question) =>
      question.review_status === "validado" &&
      question.subject === session.discipline
  );

  const matterLabels = session.matters.map((matter) =>
    normalizeText(matter.label)
  );

  const topicQuestions = subjectQuestions.filter((question) => {
    if (!question.topic) return false;

    return matterLabels.includes(normalizeText(formatMatterTitle(question.topic)));
  });

  return topicQuestions.length > 0 ? topicQuestions : subjectQuestions;
}

export function StudySessionModal({
  session,
  materials,
  questions,
  onClose,
  onComplete
}: StudySessionModalProps) {
  const [step, setStep] = useState<SessionStep>("materials");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseAnswers, setExerciseAnswers] = useState<
    Record<string, Alternative>
  >({});
  const [exerciseReveal, setExerciseReveal] = useState<Record<string, boolean>>(
    {}
  );

  const [simulationIndex, setSimulationIndex] = useState(0);
  const [simulationAnswers, setSimulationAnswers] = useState<
    Record<string, Alternative>
  >({});
  const [simulationFinished, setSimulationFinished] = useState(false);

  const [questionNotes, setQuestionNotes] =
    useState<Record<string, string>>(loadQuestionNotes);

  const matterLabels = useMemo(
    () => session.matters.map((matter) => matter.label),
    [session.matters]
  );

  const materialTopics = useMemo(() => {
    const labels = matterLabels.map(normalizeText);

    return materials.flatMap((material) => {
      if (material.discipline !== session.discipline) return [];

      return material.topics
        .filter((topic) =>
          labels.includes(normalizeText(formatMatterTitle(topic.title)))
        )
        .map((topic) => ({
          material,
          topic: {
            ...topic,
            title: formatMatterTitle(topic.title)
          }
        }));
    });
  }, [materials, session.discipline, matterLabels]);

  const sessionQuestions = useMemo(
    () => getQuestionsForSession(session, questions),
    [session, questions]
  );

  const exerciseQuestions = sessionQuestions.slice(0, 8);
  const simulationQuestions = sessionQuestions.slice(0, 5);

  const currentExercise = exerciseQuestions[exerciseIndex] || null;
  const currentSimulation = simulationQuestions[simulationIndex] || null;

  const exerciseDone =
    exerciseQuestions.length > 0 &&
    exerciseQuestions.every((question) => exerciseReveal[question.id]);

  const simulationCorrect = simulationQuestions.filter(
    (question) => simulationAnswers[question.id] === question.correct_answer
  ).length;

  const simulationPercentage =
    simulationQuestions.length > 0
      ? Math.round((simulationCorrect / simulationQuestions.length) * 100)
      : 0;

  const updateQuestionNote = (questionId: string, value: string) => {
    const next = {
      ...questionNotes,
      [questionId]: value
    };

    setQuestionNotes(next);
    saveQuestionNotes(next);
  };

  const goNextStep = () => {
    if (step === "materials") {
      setStep("questions");
      return;
    }

    if (step === "questions") {
      setStep("simulation");
      return;
    }

    if (step === "simulation") {
      setStep("done");
    }
  };

  const goPreviousStep = () => {
    if (step === "questions") {
      setStep("materials");
      return;
    }

    if (step === "simulation") {
      setStep("questions");
      return;
    }

    if (step === "done") {
      setStep("simulation");
    }
  };

  const finishSession = () => {
    onComplete(session.id);
  };

  return (
    <div className="session-modal-backdrop">
      <div className="session-modal">
        <header className="session-modal-header">
          <div>
            <span className="badge">{session.discipline}</span>

            <h2>Sessão de estudo</h2>

            <div className="session-modal-matters">
              {matterLabels.map((matter) => (
                <span key={matter}>{matter}</span>
              ))}
            </div>
          </div>

          <button type="button" className="btn ghost" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="session-steps">
          {[
            ["materials", "Materiais"],
            ["questions", "Questões"],
            ["simulation", "Mini simulado"],
            ["done", "Conclusão"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={step === value ? "active" : ""}
              onClick={() => setStep(value as SessionStep)}
            >
              {label}
            </button>
          ))}
        </div>

        <main className="session-modal-body">
          {step === "materials" && (
            <section className="session-step-content">
              <div className="session-step-title">
                <h3>Materiais da sessão</h3>
                <p>
                  Leia os tópicos abaixo antes de avançar para as questões.
                </p>
              </div>

              {materialTopics.length === 0 ? (
                <div className="notice">
                  Nenhum material específico encontrado para essas matérias.
                  Verifique se os nomes das matérias no JSON e no cronograma
                  estão iguais.
                </div>
              ) : (
                <div className="session-material-list">
                  {materialTopics.map(({ material, topic }) => (
                    <article
                      key={`${material.id}-${topic.title}`}
                      className="session-material-card"
                    >
                      <div className="material-breadcrumb">
                        <span>{material.discipline}</span>
                        <strong>›</strong>
                        <span>{topic.title}</span>
                      </div>

                      <h3>{topic.title}</h3>

                      {topic.short_summary && <p>{topic.short_summary}</p>}

                      {topic.sections?.map((section, index) => (
                        <section
                          key={`${topic.title}-${section.title}-${index}`}
                          className="session-material-section"
                        >
                          <h4>{section.title}</h4>

                          <ul>
                            {section.items.slice(0, 8).map((item, itemIndex) => (
                              <li key={`${itemIndex}-${item.slice(0, 20)}`}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {step === "questions" && (
            <section className="session-step-content">
              <div className="session-step-title">
                <h3>Questões de fixação</h3>
                <p>
                  Resolva questões da disciplina e, quando disponível, da matéria
                  selecionada.
                </p>
              </div>

              {exerciseQuestions.length === 0 ? (
                <div className="notice">
                  Nenhuma questão validada encontrada para esta disciplina.
                </div>
              ) : (
                <>
                  {!sessionQuestions.some((question) => question.topic) && (
                    <div className="notice">
                      As questões ainda não possuem matéria vinculada. Foram
                      exibidas questões da disciplina.
                    </div>
                  )}

                  {currentExercise && (
                    <StudyQuestionCard
                      question={currentExercise}
                      index={exerciseIndex}
                      total={exerciseQuestions.length}
                      selectedAnswer={exerciseAnswers[currentExercise.id] || ""}
                      showAnswer={Boolean(exerciseReveal[currentExercise.id])}
                      notes={questionNotes[currentExercise.id] || ""}
                      onSelect={(answer) =>
                        setExerciseAnswers((current) => ({
                          ...current,
                          [currentExercise.id]: answer
                        }))
                      }
                      onShowAnswer={() =>
                        setExerciseReveal((current) => ({
                          ...current,
                          [currentExercise.id]: true
                        }))
                      }
                      onNotesChange={(value) =>
                        updateQuestionNote(currentExercise.id, value)
                      }
                    />
                  )}
                </>
              )}
            </section>
          )}

          {step === "simulation" && (
            <section className="session-step-content">
              <div className="session-step-title">
                <h3>Mini simulado</h3>
                <p>
                  Faça até 5 questões para testar seu desempenho na sessão.
                </p>
              </div>

              {simulationQuestions.length === 0 ? (
                <div className="notice">
                  Nenhuma questão disponível para gerar o mini simulado.
                </div>
              ) : simulationFinished ? (
                <div className="session-result-card">
                  <span>Resultado</span>
                  <strong>{simulationPercentage}%</strong>
                  <p>
                    {simulationCorrect} acerto(s) de{" "}
                    {simulationQuestions.length} questão(ões).
                  </p>
                </div>
              ) : (
                currentSimulation && (
                  <StudyQuestionCard
                    question={currentSimulation}
                    index={simulationIndex}
                    total={simulationQuestions.length}
                    selectedAnswer={simulationAnswers[currentSimulation.id] || ""}
                    showAnswer={false}
                    notes={questionNotes[currentSimulation.id] || ""}
                    onSelect={(answer) =>
                      setSimulationAnswers((current) => ({
                        ...current,
                        [currentSimulation.id]: answer
                      }))
                    }
                    onShowAnswer={() => undefined}
                    onNotesChange={(value) =>
                      updateQuestionNote(currentSimulation.id, value)
                    }
                  />
                )
              )}
            </section>
          )}

          {step === "done" && (
            <section className="session-final-card">
              <h3>Sessão finalizada</h3>

              <p>
                Ao concluir, esta sessão será marcada como feita no cronograma.
              </p>

              {simulationQuestions.length > 0 && (
                <div className="session-result-card compact">
                  <span>Mini simulado</span>
                  <strong>{simulationPercentage}%</strong>
                  <p>
                    {simulationCorrect} acerto(s) de{" "}
                    {simulationQuestions.length} questão(ões).
                  </p>
                </div>
              )}
            </section>
          )}
        </main>

        <footer className="session-modal-footer">
          <button
            type="button"
            className="btn secondary"
            onClick={goPreviousStep}
            disabled={step === "materials"}
          >
            Anterior
          </button>

          {step === "questions" && exerciseQuestions.length > 0 && (
            <div className="session-footer-center">
              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  setExerciseIndex((current) => Math.max(0, current - 1))
                }
                disabled={exerciseIndex === 0}
              >
                Questão anterior
              </button>

              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  setExerciseIndex((current) =>
                    Math.min(exerciseQuestions.length - 1, current + 1)
                  )
                }
                disabled={exerciseIndex === exerciseQuestions.length - 1}
              >
                Próxima questão
              </button>
            </div>
          )}

          {step === "simulation" &&
            simulationQuestions.length > 0 &&
            !simulationFinished && (
              <div className="session-footer-center">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() =>
                    setSimulationIndex((current) => Math.max(0, current - 1))
                  }
                  disabled={simulationIndex === 0}
                >
                  Anterior
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={!currentSimulation || !simulationAnswers[currentSimulation.id]}
                  onClick={() => {
                    if (simulationIndex < simulationQuestions.length - 1) {
                      setSimulationIndex((current) => current + 1);
                    } else {
                      setSimulationFinished(true);
                    }
                  }}
                >
                  {simulationIndex < simulationQuestions.length - 1
                    ? "Próxima"
                    : "Ver resultado"}
                </button>
              </div>
            )}

          {step !== "done" ? (
            <button
              type="button"
              className="btn"
              onClick={goNextStep}
              disabled={step === "questions" && !exerciseDone}
            >
              {step === "materials"
                ? "Próximo: questões"
                : step === "questions"
                  ? "Próximo: mini simulado"
                  : "Finalizar"}
            </button>
          ) : (
            <button type="button" className="btn" onClick={finishSession}>
              Marcar sessão como concluída
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}