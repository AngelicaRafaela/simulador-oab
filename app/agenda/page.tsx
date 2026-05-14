"use client";

import { useMemo, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { useOabData } from "@/hooks/useOabData";
import {
  StudySessionModal,
  formatMatterTitle,
  type ScheduleMatter,
  type ScheduleSession,
  type StudyMaterialForSession
} from "@/components/StudySessionModal";

type StudyQueueItem = {
  discipline: string;
  matter: ScheduleMatter;
  estimated_reading_minutes: number;
  source_order: number;
  topic_order: number;
};

const MATERIALS_STORAGE_KEY = "oab-study-materials-v1";
const SCHEDULE_STORAGE_KEY = "oab-study-schedule-v4";

const WEEKDAYS = [
  { label: "Segunda", value: 1 },
  { label: "Terça", value: 2 },
  { label: "Quarta", value: 3 },
  { label: "Quinta", value: 4 },
  { label: "Sexta", value: 5 },
  { label: "Sábado", value: 6 },
  { label: "Domingo", value: 0 }
];

function loadMaterials(): StudyMaterialForSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSchedule(): ScheduleSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSchedule(schedule: ScheduleSession[]) {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule));
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateTitle(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  const today = new Date();
  const tomorrow = addDays(today, 1);

  const input = toInputDate(date);
  const todayInput = toInputDate(today);
  const tomorrowInput = toInputDate(tomorrow);

  const dayMonth = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });

  if (input === todayInput) return `Hoje • ${dayMonth}`;
  if (input === tomorrowInput) return `Amanhã • ${dayMonth}`;

  const weekday = date.toLocaleDateString("pt-BR", {
    weekday: "long"
  });

  const capitalizedWeekday =
    weekday.charAt(0).toUpperCase() + weekday.slice(1);

  return `${capitalizedWeekday} • ${dayMonth}`;
}

function extractSourceOrder(fileName: string) {
  const match = fileName.match(/-(\d+)-(\d+)\.pdf/i);

  if (match?.[1]) return Number(match[1]);

  return 9999;
}

function estimateReadingMinutes(topic: StudyMaterialForSession["topics"][number]) {
  const summaryWords = (topic.short_summary || "")
    .split(/\s+/)
    .filter(Boolean).length;

  const sectionItems =
    topic.sections?.reduce((total, section) => total + section.items.length, 0) ||
    0;

  const estimated = Math.ceil(summaryWords / 90) + Math.ceil(sectionItems / 5) * 5;

  return Math.max(8, Math.min(estimated, 35));
}

function getStudyQueue(materials: StudyMaterialForSession[]): StudyQueueItem[] {
  return materials
    .flatMap((material) =>
      (material.topics || []).map((topic, topicIndex) => ({
        discipline: material.discipline || "Sem disciplina",
        matter: {
          title: topic.title,
          label: formatMatterTitle(topic.title)
        },
        estimated_reading_minutes: estimateReadingMinutes(topic),
        source_order: extractSourceOrder(material.source_file_name || ""),
        topic_order: topicIndex
      }))
    )
    .sort((a, b) => {
      if (a.discipline !== b.discipline) {
        return a.discipline.localeCompare(b.discipline);
      }

      if (a.source_order !== b.source_order) {
        return a.source_order - b.source_order;
      }

      return a.topic_order - b.topic_order;
    });
}

function countQuestionsForSession(
  discipline: string,
  matters: ScheduleMatter[],
  questions: ReturnType<typeof useOabData>["questions"]
) {
  const subjectQuestions = questions.filter(
    (question) =>
      question.review_status === "validado" && question.subject === discipline
  );

  const matterLabels = matters.map((matter) => matter.label.toLowerCase());

  const topicQuestions = subjectQuestions.filter((question) => {
    if (!question.topic) return false;

    return matterLabels.includes(formatMatterTitle(question.topic).toLowerCase());
  });

  return topicQuestions.length > 0 ? topicQuestions.length : subjectQuestions.length;
}

function AgendaContent() {
  const { questions } = useOabData();

  const [materials] = useState<StudyMaterialForSession[]>(loadMaterials);
  const [schedule, setSchedule] = useState<ScheduleSession[]>(loadSchedule);
  const [activeSession, setActiveSession] = useState<ScheduleSession | null>(
    null
  );

  const [hoursPerDay, setHoursPerDay] = useState("3");
  const [startDate, setStartDate] = useState(toInputDate(addDays(new Date(), 1)));
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [showConfig, setShowConfig] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const studyQueue = useMemo(() => getStudyQueue(materials), [materials]);

  const progress = useMemo(() => {
    const total = schedule.length;
    const done = schedule.filter((item) => item.status === "concluido").length;
    const pending = schedule.filter((item) => item.status !== "concluido").length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

    const totalMinutes = schedule.reduce(
      (sum, item) => sum + item.estimated_minutes,
      0
    );

    const doneMinutes = schedule
      .filter((item) => item.status === "concluido")
      .reduce((sum, item) => sum + item.estimated_minutes, 0);

    return { total, done, pending, percentage, totalMinutes, doneMinutes };
  }, [schedule]);

  const groupedSchedule = useMemo(() => {
    return schedule.reduce<Record<string, ScheduleSession[]>>((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {});
  }, [schedule]);

  const toggleWeekday = (value: number) => {
    setSelectedDays((current) =>
      current.includes(value)
        ? current.filter((day) => day !== value)
        : [...current, value].sort()
    );
  };

  const generateSchedule = () => {
    setMessage("");
    setError("");

    if (studyQueue.length === 0) {
      setError(
        "Nenhum material encontrado. Importe materiais JSON antes de gerar o cronograma."
      );
      return;
    }

    if (selectedDays.length === 0) {
      setError("Selecione pelo menos um dia da semana.");
      return;
    }

    const dailyMinutes = Math.max(30, Number(hoursPerDay || 1) * 60);

    const readingTarget = Math.min(
      Math.max(25, Math.round(dailyMinutes * 0.35)),
      70
    );

    const questionsMinutes = Math.max(20, Math.round(dailyMinutes * 0.38));
    const simulationMinutes = Math.max(
      10,
      dailyMinutes - readingTarget - questionsMinutes
    );

    const start = new Date(`${startDate}T12:00:00`);
    const nextSchedule: ScheduleSession[] = [];

    let currentDate = start;
    let queueIndex = 0;
    let safety = 0;

    while (queueIndex < studyQueue.length && safety < 1000) {
      const weekday = currentDate.getDay();

      if (selectedDays.includes(weekday)) {
        const dayMatters: StudyQueueItem[] = [];
        let readingMinutes = 0;
        const firstDiscipline = studyQueue[queueIndex].discipline;

        while (
          queueIndex < studyQueue.length &&
          studyQueue[queueIndex].discipline === firstDiscipline &&
          readingMinutes < readingTarget
        ) {
          const item = studyQueue[queueIndex];

          dayMatters.push(item);
          readingMinutes += item.estimated_reading_minutes;
          queueIndex++;

          if (dayMatters.length >= 4) break;
        }

        const matters = dayMatters.map((item) => item.matter);
        const questionCount = countQuestionsForSession(
          firstDiscipline,
          matters,
          questions
        );

        nextSchedule.push({
          id: `agenda-${Date.now()}-${nextSchedule.length}`,
          date: toInputDate(currentDate),
          discipline: firstDiscipline,
          matters,
          reading_minutes: readingMinutes,
          questions_minutes: questionsMinutes,
          simulation_minutes: simulationMinutes,
          estimated_minutes: dailyMinutes,
          question_count: questionCount,
          status: "pendente"
        });
      }

      currentDate = addDays(currentDate, 1);
      safety++;
    }

    setSchedule(nextSchedule);
    saveSchedule(nextSchedule);
    setMessage("Cronograma gerado com sucesso.");
    setShowConfig(false);
  };

  const updateSession = (updatedSession: ScheduleSession) => {
    const updated = schedule.map((item) =>
      item.id === updatedSession.id ? updatedSession : item
    );

    setSchedule(updated);
    saveSchedule(updated);
  };

  const cycleStatus = (session: ScheduleSession) => {
    const nextStatus =
      session.status === "pendente"
        ? "em_andamento"
        : session.status === "em_andamento"
          ? "concluido"
          : "pendente";

    updateSession({
      ...session,
      status: nextStatus,
      completed_at:
        nextStatus === "concluido" ? new Date().toISOString() : undefined
    });
  };

  const markComplete = (sessionId: string) => {
    const updated = schedule.map((item) =>
      item.id === sessionId
        ? {
            ...item,
            status: "concluido" as const,
            completed_at: new Date().toISOString()
          }
        : item
    );

    setSchedule(updated);
    saveSchedule(updated);
    setActiveSession(null);
  };

  const clearSchedule = () => {
    const confirmClear = window.confirm("Deseja apagar o cronograma atual?");

    if (!confirmClear) return;

    setSchedule([]);
    saveSchedule([]);
    setMessage("Cronograma apagado.");
  };

  return (
    <div className="cronograma-page">
      <section className="cronograma-header">
        <div>
          <h1>Cronograma de Estudos</h1>
          <p>Clique em qualquer sessão para estudar os materiais e questões.</p>
        </div>

        <div className="cronograma-header-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setShowConfig((current) => !current)}
          >
            Reconfigurar
          </button>

          <button type="button" className="btn" onClick={generateSchedule}>
            Gerar Cronograma
          </button>
        </div>
      </section>

      {showConfig && (
        <section className="card cronograma-config">
          <div className="form-row">
            <div>
              <label>Horas por dia</label>

              <input
                className="input"
                type="number"
                min="0.5"
                step="0.5"
                value={hoursPerDay}
                onChange={(event) => setHoursPerDay(event.target.value)}
              />
            </div>

            <div>
              <label>Data de início</label>

              <input
                className="input"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>

            <div>
              <label>Ação</label>

              <button type="button" className="btn" onClick={generateSchedule}>
                Aplicar cronograma
              </button>
            </div>
          </div>

          <div className="weekday-grid cronograma-weekdays">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                className={`weekday-button ${
                  selectedDays.includes(day.value) ? "active" : ""
                }`}
                onClick={() => toggleWeekday(day.value)}
              >
                {day.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <section className="cronograma-progress card">
        <div>
          <strong>Progresso geral</strong>
          <span>
            {progress.done} de {progress.total} sessões concluídas •{" "}
            {Math.round(progress.doneMinutes / 60)}h de{" "}
            {Math.round(progress.totalMinutes / 60)}h
          </span>
        </div>

        <strong className="cronograma-percent">{progress.percentage}%</strong>

        <div className="cronograma-progress-bar">
          <div style={{ width: `${progress.percentage}%` }} />
        </div>
      </section>

      {schedule.length === 0 ? (
        <section className="card">
          <p className="muted">
            Nenhum cronograma gerado ainda. Clique em “Gerar Cronograma”.
          </p>
        </section>
      ) : (
        <section className="cronograma-list">
          {Object.entries(groupedSchedule).map(([date, items]) => (
            <div className="cronograma-day" key={date}>
              <div className="cronograma-day-title">
                <h2>{formatDateTitle(date)}</h2>

                <span>
                  {items.reduce((sum, item) => sum + item.estimated_minutes, 0) /
                    60}
                  h • {items.filter((item) => item.status === "concluido").length}
                  /{items.length} ok
                </span>
              </div>

              <div className="cronograma-day-items">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className={`cronograma-item ${item.status}`}
                    onClick={() => {
                      if (item.status === "pendente") {
                        updateSession({ ...item, status: "em_andamento" });
                      }

                      setActiveSession({
                        ...item,
                        status:
                          item.status === "pendente"
                            ? "em_andamento"
                            : item.status
                      });
                    }}
                  >
                    <button
                      type="button"
                      className="cronograma-status-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        cycleStatus(item);
                      }}
                      aria-label="Alterar status"
                    >
                      {item.status === "concluido" ? "✓" : ""}
                    </button>

                    <div className="cronograma-item-body">
                      <strong>{item.discipline}</strong>

                      <div className="cronograma-matters">
                        {item.matters.slice(0, 3).map((matter) => (
                          <span key={matter.label}>{matter.label}</span>
                        ))}

                        {item.matters.length > 3 && (
                          <span>+{item.matters.length - 3} matéria(s)</span>
                        )}
                      </div>

                      <p>
                        {item.reading_minutes} min leitura •{" "}
                        {item.question_count || 0} questões • mini simulado
                      </p>
                    </div>

                    <span className="cronograma-arrow">›</span>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {schedule.length > 0 && (
        <div className="actions">
          <button type="button" className="btn secondary" onClick={clearSchedule}>
            Limpar cronograma
          </button>
        </div>
      )}

      {activeSession && (
        <StudySessionModal
          session={activeSession}
          materials={materials}
          questions={questions}
          onClose={() => setActiveSession(null)}
          onComplete={markComplete}
        />
      )}
    </div>
  );
}

export default function AgendaPage() {
  return (
    <ClientOnly>
      <AgendaContent />
    </ClientOnly>
  );
}