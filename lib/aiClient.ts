import type { Question } from "@/lib/types";

export async function generateExplanation(question: Question) {
  const response = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(question) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Erro ao gerar explicação.");
  return data as { explanation: string; legal_reference: string; legal_text: string; study_cards: Array<{ title: string; type?: string; front: string; back: string }> };
}
