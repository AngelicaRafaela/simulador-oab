"use client";

import { useMemo, useState } from "react";
import { useOabData } from "@/hooks/useOabData";

type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

type StudyMaterial = {
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

const MATERIALS_STORAGE_KEY = "oab-study-materials-v1";
const CURRENT_CONTEXT_KEY = "oab-current-context";

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function loadMaterials(): StudyMaterial[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadCurrentContext() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CURRENT_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getUrlContext() {
  if (typeof window === "undefined") {
    return {
      path: "",
      disciplina: "",
      materia: "",
      subject: "",
      topic: ""
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    path: window.location.pathname,
    disciplina: params.get("disciplina") || "",
    materia: params.get("materia") || "",
    subject: params.get("subject") || "",
    topic: params.get("topic") || ""
  };
}

function buildMaterialContext(
  materials: StudyMaterial[],
  discipline: string,
  matter: string
) {
  const normalizedDiscipline = normalizeText(discipline);
  const normalizedMatter = normalizeText(matter);

  const matchedTopics = materials.flatMap((material) => {
    const materialDiscipline = normalizeText(material.discipline);

    if (normalizedDiscipline && materialDiscipline !== normalizedDiscipline) {
      return [];
    }

    return material.topics
      .filter((topic) => {
        if (!normalizedMatter) return true;

        return normalizeText(topic.title).includes(normalizedMatter);
      })
      .slice(0, 4)
      .map((topic) => ({
        discipline: material.discipline,
        material_title: material.main_topic || material.title,
        source: material.source_file_name,
        topic: topic.title,
        summary: topic.short_summary || "",
        key_points: topic.key_points?.slice(0, 8) || [],
        oab_attention: topic.oab_attention || "",
        legal_references: topic.legal_references || [],
        sections:
          topic.sections?.slice(0, 5).map((section) => ({
            title: section.title,
            items: section.items.slice(0, 8)
          })) || []
      }));
  });

  return matchedTopics.slice(0, 8);
}

function buildQuestionContext(
  questions: any[],
  discipline: string,
  matter: string
) {
  const normalizedDiscipline = normalizeText(discipline);
  const normalizedMatter = normalizeText(matter);

  const filtered = questions
    .filter((question) => question.review_status === "validado")
    .filter((question) => {
      if (!normalizedDiscipline) return true;

      return normalizeText(question.subject) === normalizedDiscipline;
    })
    .filter((question) => {
      if (!normalizedMatter) return true;

      return normalizeText(question.topic || "").includes(normalizedMatter);
    })
    .slice(0, 8)
    .map((question) => ({
      id: question.id,
      number: question.number,
      exam: question.exam,
      subject: question.subject,
      topic: question.topic,
      statement: question.statement,
      options: question.options,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      legal_reference: question.legal_reference,
      study_classification: question.study_classification,
      cards: question.cards
    }));

  return filtered;
}

function currentQuestionToContext(question: any) {
  if (!question) return null;

  return {
    id: question.id,
    number: question.number,
    exam: question.exam,
    subject: question.subject,
    topic: question.topic,
    statement: question.statement,
    options: question.options,
    correct_answer: question.correct_answer,
    explanation: question.explanation,
    legal_reference: question.legal_reference,
    legal_text: question.legal_text,
    confidence: question.confidence,
    study_classification: question.study_classification,
    cards: question.cards
  };
}

export function TutorOab() {
  const { questions } = useOabData();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      role: "assistant",
      content:
        "Olá! Eu sou o Tutor OAB. Pode me perguntar sobre uma matéria, questão, alternativa, pegadinha ou base legal."
    }
  ]);

  const quickSuggestions = useMemo(
    () => [
      "Explique essa questão de forma simples.",
      "Qual é a pegadinha da OAB aqui?",
      "Por que a alternativa correta está certa?",
      "Faça um resumo para memorizar."
    ],
    []
  );

  const sendMessage = async (customMessage?: string) => {
    const message = (customMessage || input).trim();

    if (!message || loading) return;

    setInput("");
    setLoading(true);

    const nextMessages: TutorMessage[] = [
      ...messages,
      { role: "user", content: message }
    ];

    setMessages(nextMessages);

    try {
      const urlContext = getUrlContext();
      const currentContext = loadCurrentContext();

      const currentQuestion = currentContext?.question || null;

      const discipline =
        currentQuestion?.subject ||
        urlContext.disciplina ||
        urlContext.subject ||
        "";

      const matter =
        currentQuestion?.topic ||
        urlContext.materia ||
        urlContext.topic ||
        "";

      const materials = loadMaterials();

      const context = {
        current_page: urlContext.path,
        current_discipline: discipline,
        current_matter: matter,
        current_context: currentContext
          ? {
              ...currentContext,
              question: currentQuestionToContext(currentQuestion)
            }
          : null,
        relevant_materials: buildMaterialContext(materials, discipline, matter),
        relevant_questions: currentQuestion
          ? [currentQuestionToContext(currentQuestion)]
          : buildQuestionContext(questions, discipline, matter),
        conversation_history: nextMessages.slice(-6)
      };

      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível consultar o Tutor OAB agora."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Erro ao consultar o Tutor OAB."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="tutor-floating-button"
        onClick={() => setOpen(true)}
      >
        Tutor OAB
      </button>

      {open && (
        <div className="tutor-backdrop">
          <aside className="tutor-panel">
            <header className="tutor-header">
              <div>
                <span className="badge">IA de apoio</span>
                <h2>Tutor OAB</h2>
                <p>Tire dúvidas sobre matérias, questões e pegadinhas.</p>
              </div>

              <button
                type="button"
                className="btn ghost"
                onClick={() => setOpen(false)}
              >
                Fechar
              </button>
            </header>

            <div className="tutor-suggestions">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <main className="tutor-messages">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`tutor-message ${message.role}`}
                >
                  <p>{message.content}</p>
                </div>
              ))}

              {loading && (
                <div className="tutor-message assistant">
                  <p>Consultando o Tutor OAB...</p>
                </div>
              )}
            </main>

            <footer className="tutor-input-area">
              <textarea
                className="textarea"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Digite sua dúvida. Ex: me explica essa questão de forma simples"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <button
                type="button"
                className="btn"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
              >
                Enviar
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}