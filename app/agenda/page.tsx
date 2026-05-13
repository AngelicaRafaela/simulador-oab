"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";

type StudyTopic = {
  title: string;
  short_summary?: string;
  sections?: Array<{
    title: string;
    items: string[];
  }>;
};

type StudyMaterial = {
  id: string;
  title: string;
  discipline: string;
  main_topic: string;
  source_file_name: string;
  topics: StudyTopic[];
};

type StudyQueueItem = {
  discipline: string;
  matter: string;
  estimated_reading_minutes: number;
  source_order: number;
};

type StudyScheduleItem = {
  id: string;
  date: string;
  discipline: string;
  matters: string[];
  reading_minutes: number;
  questions_minutes: number;
  simulation_minutes: number;
  estimated_minutes: number;
  status: "pendente" | "em_andamento" | "concluido";
  completed_at?: string;
};

const MATERIALS_STORAGE_KEY = "oab-study-materials-v1";
const SCHEDULE_STORAGE_KEY = "oab-study-schedule-v2";

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

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit"
  });
}

function cleanMatterName(name: string) {
  const cleaned = name
    .replace(/\s*-\s*continuação/gi, "")
    .replace(/\s*-\s*art\.\s*\d+.*$/gi, "")
    .replace(/\s*-\s*páginas?.*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const replacements: Record<string, string> = {
    "Direito sindical": "Direito Sindical",
    "Estabilidade do dirigente sindical": "Estabilidade do Dirigente Sindical",
    "Nacionalidade - brasileiros natos": "Nacionalidade: Brasileiros Natos",
    "Nacionalidade - brasileiros naturalizados":
      "Nacionalidade: Brasileiros Naturalizados",
    "Cargos privativos de brasileiros natos":
      "Cargos Privativos de Brasileiros Natos",
    "Perda da nacionalidade": "Perda da Nacionalidade",
    "Direitos políticos": "Direitos Políticos",
    "Partidos políticos": "Partidos Políticos",
    "Organização do Estado - formas de Estado":
      "Organização do Estado: Formas de Estado",
    "Federação brasileira e União": "Federação Brasileira e União",
    "Relação entre Estado e religião": "Relação entre Estado e Religião",
    "Bens da União": "Bens da União",
    "Alteração territorial de Estados": "Alteração Territorial de Estados",
    "Criação, incorporação, fusão ou desmembramento de Municípios":
      "Criação, Incorporação, Fusão ou Desmembramento de Municípios",
    "Repartição de competências": "Repartição de Competências",
    "Competência exclusiva da União": "Competência Exclusiva da União",
    "Competência privativa da União": "Competência Privativa da União",
    "Competência comum": "Competência Comum",
    "Competência concorrente": "Competência Concorrente",
    "Administração Pública - princípios":
      "Administração Pública: Princípios",
    "Cargos públicos e concurso público":
      "Cargos Públicos e Concurso Público",
    "Liberdade sindical e greve de servidor público civil":
      "Liberdade Sindical e Greve de Servidor Público Civil",
    "Remédios constitucionais": "Remédios Constitucionais",
    "Direitos sociais": "Direitos Sociais",
    "Direitos dos trabalhadores urbanos e rurais":
      "Direitos dos Trabalhadores Urbanos e Rurais",
    "Introdução à Constituição": "Introdução à Constituição",
    "Classificação das Constituições": "Classificação das Constituições",
    "Elementos das Constituições": "Elementos das Constituições",
    "Poderes do Estado e funções": "Poderes do Estado e Funções",
    "Poder Constituinte": "Poder Constituinte",
    "Eficácia e aplicabilidade das normas constitucionais":
      "Eficácia e Aplicabilidade das Normas Constitucionais",
    "Constituição Brasileira de 1988": "Constituição Brasileira de 1988",
    "Princípios Fundamentais": "Princípios Fundamentais",
    "Direitos e Garantias Fundamentais": "Direitos e Garantias Fundamentais",
    "Art. 5º - Direitos e deveres individuais e coletivos":
      "Art. 5º: Direitos e Deveres Individuais e Coletivos"
  };

  if (replacements[cleaned]) {
    return replacements[cleaned];
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMatterList(matters: string[]) {
  if (matters.length === 0) return "";

  if (matters.length === 1) return matters[0];

  if (matters.length === 2) {
    return `${matters[0]} e ${matters[1]}`;
  }

  return `${matters.slice(0, -1).join(", ")} e ${
    matters[matters.length - 1]
  }`;
}

function extractSourceOrder(fileName: string) {
  const match = fileName.match(/-(\d+)-(\d+)\.pdf/i);

  if (match?.[1]) {
    return Number(match[1]);
  }

  return 9999;
}

function estimateReadingMinutes(topic: StudyTopic) {
  const summaryWords = (topic.short_summary || "").split(/\s+/).filter(Boolean)
    .length;

  const sectionItems =
    topic.sections?.reduce((total, section) => total + section.items.length, 0) ||
    0;

  const estimated = Math.ceil(summaryWords / 90) + Math.ceil(sectionItems / 5) * 5;

  return Math.max(8, Math.min(estimated, 35));
}

function getStudyQueue(materials: StudyMaterial[]): StudyQueueItem[] {
  return materials
    .flatMap((material) =>
      (material.topics || []).map((topic) => ({
        discipline: material.discipline || "Sem disciplina",
        matter: cleanMatterName(topic.title),
        estimated_reading_minutes: estimateReadingMinutes(topic),
        source_order: extractSourceOrder(material.source_file_name || "")
      }))
    )
    .sort((a, b) => {
      if (a.discipline !== b.discipline) {
        return a.discipline.localeCompare(b.discipline);
      }

      if (a.source_order !== b.source_order) {
        return a.source_order - b.source_order;
      }

      return a.matter.localeCompare(b.matter);
    });
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

    const dailyMinutes = Math.max(30, Number(hoursPerDay || 1) * 60);

    const readingTarget = Math.min(
      Math.max(20, Math.round(dailyMinutes * 0.35)),
      60
    );

    const questionsMinutes = Math.max(20, Math.round(dailyMinutes * 0.4));
    const simulationMinutes = Math.max(
      10,
      dailyMinutes - readingTarget - questionsMinutes
    );

    const start = new Date(`${startDate}T12:00:00`);
    const nextSchedule: StudyScheduleItem[] = [];

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

        nextSchedule.push({
          id: `agenda-${Date.now()}-${nextSchedule.length}`,
          date: toInputDate(currentDate),
          discipline: firstDiscipline,
          matters: dayMatters.map((item) => item.matter),
          reading_minutes: readingMinutes,
          questions_minutes: questionsMinutes,
          simulation_minutes: simulationMinutes,
          estimated_minutes: dailyMinutes,
          status: "pendente"
        });
      }

      currentDate = addDays(currentDate, 1);
      safety++;
    }

    setSchedule(nextSchedule);
    saveSchedule(nextSchedule);
    setMessage("Cronograma gerado com sessões de leitura, questões e mini simulado.");
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
    const confirmClear = window.confirm("Deseja apagar o cronograma atual?");

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
            Monte sessões diárias combinando leitura do material, resolução de
            questões e mini simulado.
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
              <span>Sessões</span>
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
                      const firstMatter = item.matters[0] || "";
                      const materialUrl = `/materiais?disciplina=${encodeURIComponent(
                        item.discipline
                      )}&materia=${encodeURIComponent(firstMatter)}`;

                      const questionsUrl = `/banco?disciplina=${encodeURIComponent(
                        item.discipline
                      )}&materia=${encodeURIComponent(firstMatter)}`;

                      const simulationUrl = `/simulado?disciplina=${encodeURIComponent(
                        item.discipline
                      )}&materia=${encodeURIComponent(firstMatter)}&modo=mini`;

                      return (
                        <div
                          key={item.id}
                          className={`agenda-item ${item.status}`}
                        >
                          <div>
                            <span className="badge">{item.discipline}</span>

                            <h3>Sessão de estudo</h3>

                            <div className="agenda-matter-list">
                              {item.matters.map((matter) => (
                                <span key={matter}>{matter}</span>
                              ))}
                            </div>

                            <div className="agenda-plan">
                              <p>
                                <strong>Leitura:</strong>{" "}
                                {item.reading_minutes} min
                              </p>

                              <p>
                                <strong>Questões:</strong>{" "}
                                {item.questions_minutes} min
                              </p>

                              <p>
                                <strong>Mini simulado:</strong>{" "}
                                {item.simulation_minutes} min
                              </p>
                            </div>

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
                              href={materialUrl}
                              onClick={() =>
                                updateStatus(item.id, "em_andamento")
                              }
                            >
                              Estudar material
                            </Link>

                            <Link className="btn secondary" href={questionsUrl}>
                              Fazer questões
                            </Link>

                            <Link className="btn secondary" href={simulationUrl}>
                              Mini simulado
                            </Link>

                            <button
                              className="btn"
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