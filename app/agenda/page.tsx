"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";

type StudyTopic = {
  title: string;
};

type StudyMaterial = {
  id: string;
  title: string;
  discipline: string;
  main_topic: string;
  source_file_name: string;
  topics: StudyTopic[];
};

type StudyScheduleItem = {
  id: string;
  date: string;
  discipline: string;
  matter: string;
  estimated_minutes: number;
  status: "pendente" | "em_andamento" | "concluido";
  completed_at?: string;
};

const MATERIALS_STORAGE_KEY = "oab-study-materials-v1";
const SCHEDULE_STORAGE_KEY = "oab-study-schedule-v1";

const WEEKDAYS = [
  { label: "Segunda", value: 1 },
  { label: "Terça", value: 2 },
  { label: "Quarta", value: 3 },
  { label: "Quinta", value: 4 },
  { label: "Sexta", value: 5 },
  { label: "Sábado", value: 6 },
  { label: "Domingo", value: 0 }
];

function loadMaterials(): StudyMaterial[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSchedule(): StudyScheduleItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSchedule(schedule: StudyScheduleItem[]) {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule));
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit"
  });
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getStudyQueue(materials: StudyMaterial[]) {
  return materials.flatMap((material) =>
    (material.topics || []).map((topic) => ({
      discipline: material.discipline || "Sem disciplina",
      matter: topic.title
    }))
  );
}

function AgendaContent() {
  const [materials] = useState<StudyMaterial[]>(loadMaterials);
  const [schedule, setSchedule] =
    useState<StudyScheduleItem[]>(loadSchedule);

  const [hoursPerDay, setHoursPerDay] = useState("2");
  const [startDate, setStartDate] = useState(toInputDate(new Date()));
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const studyQueue = useMemo(() => getStudyQueue(materials), [materials]);

  const progress = useMemo(() => {
    const total = schedule.length;
    const done = schedule.filter((item) => item.status === "concluido").length;
    const pending = schedule.filter((item) => item.status !== "concluido").length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, pending, percentage };
  }, [schedule]);

  const groupedSchedule = useMemo(() => {
    return schedule.reduce<Record<string, StudyScheduleItem[]>>((acc, item) => {
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
        "Nenhum material encontrado. Importe materiais JSON antes de gerar a agenda."
      );
      return;
    }

    if (selectedDays.length === 0) {
      setError("Selecione pelo menos um dia da semana para estudo.");
      return;
    }

    const minutes = Math.max(30, Number(hoursPerDay || 1) * 60);
    const start = new Date(`${startDate}T12:00:00`);
    const nextSchedule: StudyScheduleItem[] = [];

    let currentDate = start;
    let queueIndex = 0;
    let safety = 0;

    while (queueIndex < studyQueue.length && safety < 1000) {
      const weekday = currentDate.getDay();

      if (selectedDays.includes(weekday)) {
        const item = studyQueue[queueIndex];

        nextSchedule.push({
          id: `agenda-${Date.now()}-${queueIndex}`,
          date: toInputDate(currentDate),
          discipline: item.discipline,
          matter: item.matter,
          estimated_minutes: minutes,
          status: "pendente"
        });

        queueIndex++;
      }

      currentDate = addDays(currentDate, 1);
      safety++;
    }

    setSchedule(nextSchedule);
    saveSchedule(nextSchedule);
    setMessage("Cronograma gerado com sucesso.");
  };

  const updateStatus = (
    id: string,
    status: StudyScheduleItem["status"]
  ) => {
    const updated = schedule.map((item) =>
      item.id === id
        ? {
            ...item,
            status,
            completed_at:
              status === "concluido" ? new Date().toISOString() : undefined
          }
        : item
    );

    setSchedule(updated);
    saveSchedule(updated);
  };

  const clearSchedule = () => {
    const confirmClear = window.confirm(
      "Deseja apagar o cronograma atual?"
    );

    if (!confirmClear) return;

    setSchedule([]);
    saveSchedule([]);
    setMessage("Cronograma apagado.");
  };

  return (
    <div className="agenda-page">
      <section className="card agenda-hero">
        <div>
          <h1>Agenda de estudos</h1>

          <p className="lead">
            Gere um cronograma com uma matéria por dia, baseado nos materiais
            importados e no tempo disponível para estudar.
          </p>
        </div>

        <div className="agenda-progress-card">
          <strong>{progress.percentage}%</strong>
          <span>do cronograma concluído</span>
        </div>
      </section>

      <section className="agenda-grid">
        <aside className="card agenda-config">
          <h2>Configuração</h2>

          <div className="form-row single">
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
          </div>

          <div className="divider" />

          <h3>Dias de estudo</h3>

          <div className="weekday-grid">
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

          <div className="divider" />

          <div className="actions">
            <button className="btn" onClick={generateSchedule}>
              Gerar cronograma
            </button>

            <button className="btn secondary" onClick={clearSchedule}>
              Limpar
            </button>
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
        </aside>

        <main className="agenda-content">
          <section className="agenda-stats">
            <div className="card stat-card">
              <span>Total</span>
              <strong>{progress.total}</strong>
            </div>

            <div className="card stat-card">
              <span>Concluídas</span>
              <strong>{progress.done}</strong>
            </div>

            <div className="card stat-card">
              <span>Pendentes</span>
              <strong>{progress.pending}</strong>
            </div>
          </section>

          {schedule.length === 0 ? (
            <section className="card">
              <p className="muted">
                Nenhum cronograma gerado ainda. Configure os dias e clique em
                “Gerar cronograma”.
              </p>
            </section>
          ) : (
            <section className="agenda-calendar">
              {Object.entries(groupedSchedule).map(([date, items]) => (
                <div className="card agenda-day" key={date}>
                  <h2>{formatDate(date)}</h2>

                  <div className="agenda-day-list">
                    {items.map((item) => {
                      const studyUrl = `/materiais?disciplina=${encodeURIComponent(
                        item.discipline
                      )}&materia=${encodeURIComponent(item.matter)}`;

                      return (
                        <div
                          key={item.id}
                          className={`agenda-item ${item.status}`}
                        >
                          <div>
                            <span className="badge">{item.discipline}</span>

                            <h3>{item.matter}</h3>

                            <p className="muted">
                              Tempo sugerido: {item.estimated_minutes} minutos
                            </p>

                            <p className="muted small">
                              Status:{" "}
                              <strong>
                                {item.status === "concluido"
                                  ? "Concluído"
                                  : item.status === "em_andamento"
                                    ? "Em andamento"
                                    : "Pendente"}
                              </strong>
                            </p>
                          </div>

                          <div className="agenda-actions">
                            <Link
                              className="btn"
                              href={studyUrl}
                              onClick={() =>
                                updateStatus(item.id, "em_andamento")
                              }
                            >
                              Estudar
                            </Link>

                            <button
                              className="btn secondary"
                              onClick={() =>
                                updateStatus(item.id, "concluido")
                              }
                            >
                              Marcar como feito
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>
      </section>
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