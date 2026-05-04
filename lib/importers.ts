import type { Alternative, AnswerKeyPayload, AnswerKeyResult, ImportResult, Question, ReviewStatus } from "@/lib/types";

const VALID_ANSWERS = ["A", "B", "C", "D"] as const;
const VALID_STATUS: ReviewStatus[] = ["pendente", "precisa_revisao", "validado", "rejeitado"];

function isAlternative(value: unknown): value is Alternative {
  return typeof value === "string" && VALID_ANSWERS.includes(value as Alternative);
}

function normalizeStatus(value: unknown): ReviewStatus {
  return typeof value === "string" && VALID_STATUS.includes(value as ReviewStatus) ? value as ReviewStatus : "precisa_revisao";
}

function makeId(q: Partial<Question>) {
  return [q.exam || "prova", q.phase || "fase", q.test_type || "tipo", q.number || Math.random()]
    .join("|").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
}

function isCompleteQuestion(q: Question) {
  return Boolean(q.exam && q.phase && q.test_type && q.number >= 1 && q.statement && q.options.A && q.options.B && q.options.C && q.options.D && isAlternative(q.correct_answer));
}

export function extractQuestionArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray((payload as any).questions)) return (payload as any).questions;
  return [];
}

export function normalizeQuestion(raw: any): { question?: Question; warning?: string } {
  const number = Number(raw?.number);
  const options = raw?.options || {};
  const missing: string[] = [];
  if (!number || number < 1) missing.push("number");
  if (!raw?.statement || typeof raw.statement !== "string") missing.push("statement");
  if (!options?.A) missing.push("options.A");
  if (!options?.B) missing.push("options.B");
  if (!options?.C) missing.push("options.C");
  if (!options?.D) missing.push("options.D");
  if (!isAlternative(raw?.correct_answer)) missing.push("correct_answer");
  if (missing.length) return { warning: `Questão ${raw?.number ?? "sem número"} ignorada: campos inválidos/ausentes (${missing.join(", ")}).` };
  const now = new Date().toISOString();
  return { question: {
    id: raw.id || makeId(raw), exam: String(raw.exam || "Exame não informado"), phase: String(raw.phase || "1ª fase"), exam_date: raw.exam_date || "", question_type: raw.question_type || "objetiva", test_type: raw.test_type || "", number,
    subject: raw.subject || "", topic: raw.topic || "", statement: String(raw.statement).trim(),
    options: { A: String(options.A).trim(), B: String(options.B).trim(), C: String(options.C).trim(), D: String(options.D).trim() },
    correct_answer: raw.correct_answer, source_file: raw.source_file || "", source_page: raw.source_page ?? null,
    review_status: normalizeStatus(raw.review_status), review_notes: raw.review_notes || "", legal_reference: raw.legal_reference || "", legal_text: raw.legal_text || "", explanation: raw.explanation || "", difficulty: raw.difficulty || "", study_cards: Array.isArray(raw.study_cards) ? raw.study_cards : [], created_at: raw.created_at || now, updated_at: now
  }};
}

export function importQuestionsPayload(existing: Question[], payload: unknown): { questions: Question[]; result: ImportResult } {
  const rows = extractQuestionArray(payload); const warnings: string[] = []; let imported = 0, ignored = 0;
  const byId = new Map(existing.map(q => [q.id, q]));
  for (const raw of rows) {
    const { question, warning } = normalizeQuestion(raw);
    if (!question) { ignored++; if (warning) warnings.push(warning); continue; }
    const current = byId.get(question.id);
    byId.set(question.id, { ...current, ...question, review_status: current?.review_status === "validado" ? "validado" : question.review_status, created_at: current?.created_at || question.created_at, updated_at: new Date().toISOString() });
    imported++;
  }
  return { questions: Array.from(byId.values()).sort((a,b)=>`${a.exam}${a.test_type}`.localeCompare(`${b.exam}${b.test_type}`) || a.number-b.number), result: { imported, ignored, warnings } };
}

export function extractAnswerKey(payload: AnswerKeyPayload): Record<number, Alternative> {
  const result: Record<number, Alternative> = {};
  if (payload.answers_compact && typeof payload.answers_compact === "object") {
    for (const [k,v] of Object.entries(payload.answers_compact)) { const n = Number(k); if (n > 0 && isAlternative(v)) result[n] = v; }
    return result;
  }
  if (Array.isArray(payload.answers)) for (const item of payload.answers) { const n = Number(item.number); if (n > 0 && isAlternative(item.correct_answer)) result[n] = item.correct_answer; }
  return result;
}

export function importAnswerKeyPayload(existing: Question[], payload: AnswerKeyPayload, options: { autoValidate?: boolean } = { autoValidate: true }): { questions: Question[]; result: AnswerKeyResult } {
  const answerKey = extractAnswerKey(payload); const warnings: string[] = [];
  let updated = 0, not_found = 0, divergences = 0, autoValidated = 0;
  const exam = payload.exam || "", phase = payload.phase || "", testType = payload.test_type || "";
  const questions = existing.map(q => {
    const answer = answerKey[q.number]; if (!answer) return q;
    const match = (!exam || q.exam === exam) && (!phase || q.phase === phase) && (!testType || q.test_type === testType);
    if (!match) return q;
    if (q.correct_answer !== answer) { divergences++; warnings.push(`Questão ${q.number}: gabarito anterior ${q.correct_answer}, gabarito oficial ${answer}. Atualizado.`); }
    const nextQuestion: Question = { ...q, correct_answer: answer, updated_at: new Date().toISOString() };
    let nextStatus = q.review_status;
    if (options.autoValidate && isCompleteQuestion(nextQuestion)) { nextStatus = "validado"; autoValidated++; }
    updated++;
    return { ...nextQuestion, review_status: nextStatus, review_notes: nextStatus === "validado" ? "Validada automaticamente: possui enunciado, alternativas A/B/C/D e resposta conferida pelo gabarito oficial importado." : nextQuestion.review_notes };
  });
  for (const [number] of Object.entries(answerKey)) {
    const n = Number(number); const found = existing.some(q => q.number === n && (!exam || q.exam === exam) && (!phase || q.phase === phase) && (!testType || q.test_type === testType));
    if (!found) { not_found++; warnings.push(`Questão ${n}: não encontrada no banco para este exame/fase/tipo.`); }
  }
  if (autoValidated > 0) warnings.unshift(`${autoValidated} questão(ões) validadas automaticamente com base no gabarito oficial.`);
  return { questions, result: { processed: Object.keys(answerKey).length, updated, not_found, divergences, warnings } };
}
