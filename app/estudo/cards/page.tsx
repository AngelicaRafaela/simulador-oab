"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";
import { useOabData } from "@/hooks/useOabData";
import type { Question, StudyCard } from "@/lib/types";

type FlashcardItem = {
  id: string;
  questionId: string;
  questionNumber: number;
  subject: string;
  mainTopic?: string;
  cardTitle: string;
  front: string;
  back: string;
};

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandSynonyms(text: string) {
  let normalized = normalizeText(text);

  const replacements: Array<[RegExp, string]> = [
    [/\bnao e permitido\b/g, "vedado proibido nao permitido"],
    [/\bnao pode\b/g, "vedado proibido nao permitido"],
    [/\be proibido\b/g, "vedado proibido nao permitido"],
    [/\be vedado\b/g, "vedado proibido nao permitido"],
    [/\bvedada\b/g, "vedado proibido nao permitido"],
    [/\bvedado\b/g, "vedado proibido nao permitido"],
    [/\bdivulgacao\b/g, "divulgacao publicidade anunciar"],
    [/\bdivulgar\b/g, "divulgacao publicidade anunciar"],
    [/\bpublicidade\b/g, "divulgacao publicidade anunciar"],
    [/\badvocacia\b/g, "advocacia servicos advocaticios advogado"],
    [/\badvocaticios\b/g, "advocacia servicos advocaticios advogado"],
    [/\bservicos juridicos\b/g, "advocacia servicos advocaticios juridicos"],
    [/\boutra atividade\b/g, "outra atividade atividade diversa conjunto"],
    [/\boutras atividades\b/g, "outra atividade atividade diversa conjunto"],
    [/\bem conjunto\b/g, "conjunto junto juntamente"]
  ];

  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized;
}

function getKeywords(text: string) {
  const stopwords = new Set([
    "a",
    "o",
    "as",
    "os",
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "em",
    "no",
    "na",
    "nos",
    "nas",
    "um",
    "uma",
    "para",
    "por",
    "com",
    "que",
    "se",
    "ao",
    "aos",
    "ou",
    "é",
    "ser",
    "foi",
    "são",
    "como",
    "mais",
    "menos",
    "qual",
    "quando",
    "onde",
    "sobre"
  ]);

  return expandSynonyms(text)
    .split(" ")
    .filter((token) => token.length > 2 && !stopwords.has(token));
}

function calculateSimilarity(userAnswer: string, expectedAnswer: string) {
  const normalizedUser = expandSynonyms(userAnswer);
  const normalizedExpected = expandSynonyms(expectedAnswer);

  if (!normalizedUser || !normalizedExpected) return 0;

  // Respostas curtas afirmando a ideia central devem ser valorizadas.
  const userSaysForbidden =
    normalizedUser.includes("vedado") ||
    normalizedUser.includes("proibido") ||
    normalizedUser.includes("nao permitido");

  const expectedSaysForbidden =
    normalizedExpected.includes("vedado") ||
    normalizedExpected.includes("proibido") ||
    normalizedExpected.includes("nao permitido");

  if (userSaysForbidden && expectedSaysForbidden) {
    const userMentionsCore =
      normalizedUser.includes("advocacia") ||
      normalizedUser.includes("advogado") ||
      normalizedUser.includes("divulgacao") ||
      normalizedUser.includes("publicidade") ||
      normalizedUser.includes("atividade") ||
      normalizedUser.includes("conjunto");

    if (userMentionsCore) {
      return 90;
    }

    return 75;
  }

  const userTokens = getKeywords(userAnswer);
  const expectedTokens = getKeywords(expectedAnswer);

  if (userTokens.length === 0 || expectedTokens.length === 0) {
    return 0;
  }

  const userSet = new Set(userTokens);
  const expectedSet = new Set(expectedTokens);

  let intersections = 0;

  expectedSet.forEach((token) => {
    if (userSet.has(token)) intersections++;
  });

  const expectedCoverage = intersections / expectedSet.size;
  const userCoverage = intersections / userSet.size;

  const score = Math.round((expectedCoverage * 0.65 + userCoverage * 0.35) * 100);

  return Math.max(0, Math.min(score, 100));
}

  const userSet = new Set(userTokens);
  const expectedSet = new Set(expectedTokens);

  let intersections = 0;

  expectedSet.forEach((token) => {
    if (userSet.has(token)) intersections++;
  });

  const score = Math.round((intersections / expectedSet.size) * 100);

  return Math.max(0, Math.min(score, 100));
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Ótimo";
  if (score >= 60) return "Bom";
  if (score >= 40) return "Razoável";
  return "Precisa revisar";
}

function getScoreClass(score: number) {
  if (score >= 80) return "flashcard-score good";
  if (score >= 60) return "flashcard-score medium";
  if (score >= 40) return "flashcard-score warn";
  return "flashcard-score bad";
}

function CardsStudyContent() {
  const { questions, setQuestions } = useOabData();

  const [subject, setSubject] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);

  const validQuestions = questions.filter(
    (q) => q.review_status === "validado" && q.study_cards && q.study_cards.length > 0
  );

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(validQuestions.map((q) => q.subject_confirmed || q.subject || "Sem disciplina"))
      ).sort(),
    [validQuestions]
  );

  const cards = useMemo(() => {
    const list: FlashcardItem[] = [];

    validQuestions.forEach((question) => {
      const matchesSubject =
        !subject ||
        (question.subject_confirmed || question.subject || "Sem disciplina") === subject;

      if (!matchesSubject) return;

      (question.study_cards || []).forEach((card: StudyCard, index) => {
        list.push({
          id: `${question.id}-${index}`,
          questionId: question.id,
          questionNumber: question.number,
          subject: question.subject_confirmed || question.subject || "Sem disciplina",
          mainTopic: question.main_topic || question.topic,
          cardTitle: card.title,
          front: card.front,
          back: card.back
        });
      });
    });

    return list;
  }, [validQuestions, subject]);

  const currentCard = cards[currentIndex] || null;
  const currentQuestion =
    questions.find((q) => q.id === currentCard?.questionId) || null;

  const handleReveal = () => {
    if (!currentCard) return;

    const score = calculateSimilarity(userAnswer, currentCard.back);
    setSavedScore(score);
    setRevealed(true);
  };

  const handleNext = () => {
    setUserAnswer("");
    setRevealed(false);
    setSavedScore(null);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    setUserAnswer("");
    setRevealed(false);
    setSavedScore(null);

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleResetFilter = (value: string) => {
    setSubject(value);
    setCurrentIndex(0);
    setUserAnswer("");
    setRevealed(false);
    setSavedScore(null);
  };

  const handleSaveNotes = (value: string) => {
    if (!currentQuestion) return;

    const updated = questions.map((q) =>
      q.id === currentQuestion.id
        ? {
            ...q,
            user_notes: value,
            updated_at: new Date().toISOString()
          }
        : q
    );

    setQuestions(updated);
  };

  return (
    <div className="grid">
      <div className="card">
        <div className="actions" style={{ justifyContent: "space-between", marginTop: 0 }}>
          <div>
            <h1>Estudo por cards</h1>
            <p className="lead">
              Responda os cards em formato de pergunta e resposta e compare sua
              resposta com a resposta esperada.
            </p>
          </div>

          <Link href="/estudo" className="btn secondary">
            Voltar para Estudo
          </Link>
        </div>

        <div className="form-row" style={{ marginTop: 16 }}>
          <div>
            <label>Disciplina</label>
            <select
              className="select"
              value={subject}
              onChange={(e) => handleResetFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {subjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Total de cards</label>
            <input className="input" value={`${cards.length} card(s)`} readOnly />
          </div>

          <div>
            <label>Posição</label>
            <input
              className="input"
              value={cards.length > 0 ? `${currentIndex + 1} de ${cards.length}` : "0 de 0"}
              readOnly
            />
          </div>
        </div>
      </div>

      {!currentCard ? (
        <div className="card">
          <p className="muted">
            Nenhum card encontrado. Gere explicações/cards nas questões antes de usar esta área.
          </p>
        </div>
      ) : (
        <>
          <div className="flashcard-page">
            <div className={`flashcard-qa-card ${revealed ? "revealed" : ""}`}>
              <div className="flashcard-topline">
                <div className="flashcard-meta">
                  <span className="badge">{currentCard.subject}</span>
                  {currentCard.mainTopic && <span className="badge">{currentCard.mainTopic}</span>}
                  <span className="badge">Questão {currentCard.questionNumber}</span>
                </div>

                <h2>{currentCard.cardTitle}</h2>
              </div>

              <div className="flashcard-side">
                <h3>Pergunta</h3>
                <p>{currentCard.front}</p>
              </div>

              {!revealed ? (
                <div className="flashcard-answer-box">
                  <label>Sua resposta</label>
                  <textarea
                    className="textarea"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Escreva sua resposta aqui..."
                    style={{ minHeight: 150 }}
                  />

                  <div className="actions">
                    <button
                      className="btn"
                      onClick={handleReveal}
                      disabled={!userAnswer.trim()}
                    >
                      Responder e virar card
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flashcard-result-grid">
                  <div className="flashcard-side">
                    <h3>Sua resposta</h3>
                    <p>{userAnswer}</p>
                  </div>

                  <div className="flashcard-side">
                    <h3>Resposta esperada</h3>
                    <p>{currentCard.back}</p>
                  </div>

                  <div className="flashcard-evaluation">
                    <div className={getScoreClass(savedScore || 0)}>
                      {savedScore ?? 0}%
                    </div>

                    <div>
                      <strong>{getScoreLabel(savedScore || 0)}</strong>
                      <p className="muted small" style={{ marginTop: 6 }}>
                        A porcentagem é baseada na similaridade entre sua resposta
                        e a resposta esperada do sistema.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="actions" style={{ justifyContent: "space-between" }}>
                <button
                  className="btn secondary"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  Card anterior
                </button>

                {revealed ? (
                  <button
                    className="btn"
                    onClick={handleNext}
                    disabled={currentIndex === cards.length - 1}
                  >
                    Próximo card
                  </button>
                ) : (
                  <span className="muted small">
                    Responda o card para visualizar a comparação.
                  </span>
                )}
              </div>
            </div>
          </div>

          {currentQuestion && (
            <div className="card">
              <h2>Anotações da questão</h2>
              <p className="muted">
                Questão {currentQuestion.number} •{" "}
                {currentQuestion.subject_confirmed || currentQuestion.subject || "Sem disciplina"}
              </p>

              <textarea
                className="textarea"
                defaultValue={currentQuestion.user_notes || ""}
                onBlur={(e) => handleSaveNotes(e.target.value)}
                placeholder="Escreva aqui suas anotações sobre esta questão..."
                style={{ minHeight: 160 }}
              />

              <p className="muted small" style={{ marginTop: 10 }}>
                As anotações são salvas automaticamente quando você sai do campo.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CardsStudyPage() {
  return (
    <ClientOnly>
      <CardsStudyContent />
    </ClientOnly>
  );
}