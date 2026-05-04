export type ReviewStatus = "pendente" | "precisa_revisao" | "validado" | "rejeitado";
export type Alternative = "A" | "B" | "C" | "D";
export type Confidence = "alta" | "media" | "baixa";

export type QuestionOptions = {
  A: string;
  B: string;
  C: string;
  D: string;
};

export type StudyCard = {
  title: string;
  type?: string;
  front: string;
  back: string;
};

export type Question = {
  id: string;
  exam: string;
  phase: string;
  exam_date?: string;
  question_type?: string;
  test_type?: string;
  number: number;
  subject?: string;
  topic?: string;
  statement: string;
  options: QuestionOptions;
  correct_answer: Alternative;
  source_file?: string;
  source_page?: number | null;
  review_status: ReviewStatus;
  review_notes?: string;
  legal_reference?: string;
  legal_text?: string;
  explanation?: string;
  confidence?: Confidence;
  difficulty?: string;
  study_cards?: StudyCard[];
  created_at: string;
  updated_at: string;
};

export type AnswerKeyPayload = {
  project?: string;
  content_type?: string;
  exam?: string;
  phase?: string;
  test_type?: string;
  exam_date?: string;
  answer_key_date?: string;
  source_file?: string;
  total_questions?: number;
  review_status?: string;
  answers_compact?: Record<string, Alternative>;
  answers?: Array<{
    number: number;
    correct_answer: Alternative;
    exam?: string;
    phase?: string;
    test_type?: string;
  }>;
};

export type SimulationAnswer = {
  question_id: string;
  number: number;
  selected_answer: Alternative;
  correct_answer: Alternative;
  is_correct: boolean;
};

export type Simulation = {
  id: string;
  started_at: string;
  finished_at: string;
  total_questions: number;
  total_correct: number;
  total_wrong: number;
  score_percentage: number;
  answers: SimulationAnswer[];
};

export type ImportResult = {
  imported: number;
  ignored: number;
  warnings: string[];
};

export type AnswerKeyResult = {
  processed: number;
  updated: number;
  not_found: number;
  divergences: number;
  warnings: string[];
};