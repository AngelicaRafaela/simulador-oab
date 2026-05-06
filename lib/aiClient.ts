import type { Question } from "@/lib/types";

export async function generateExplanation(question: Question) {
  const response = await fetch("/api/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(question)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Erro ao gerar explicação.");
  }

  return data as {
    explanation: string;
    legal_reference: string;
    legal_text: string;
    confidence?: "alta" | "media" | "baixa";
    study_cards: Array<{
      title: string;
      type?: string;
      front: string;
      back: string;
    }>;

    subject_confirmed?: string;
    main_topic?: string;
    study_topics?: string[];
    study_focus?: string;
    exam_trap?: string;

    official_sources_used?: Array<{
      title: string;
      url: string;
    }>;

    grounding_sources?: Array<{
      title: string;
      uri: string;
      official: boolean;
    }>;

    official_grounding_sources?: Array<{
      title: string;
      uri: string;
      official: boolean;
    }>;
  };
}