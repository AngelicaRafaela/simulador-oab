import type { Question } from "@/lib/types";

function splitExplanation(explanation?: string) {
  if (!explanation) {
    return {
      simple: "",
      technical: ""
    };
  }

  const simpleMarker = "Explicação simples:";
  const technicalMarker = "Fundamentação técnica:";

  const hasSimple = explanation.includes(simpleMarker);
  const hasTechnical = explanation.includes(technicalMarker);

  if (hasSimple && hasTechnical) {
    const simpleStart = explanation.indexOf(simpleMarker) + simpleMarker.length;
    const technicalStart = explanation.indexOf(technicalMarker);

    const simple = explanation.slice(simpleStart, technicalStart).trim();

    const technical = explanation
      .slice(technicalStart + technicalMarker.length)
      .trim();

    return {
      simple,
      technical
    };
  }

  return {
    simple: explanation,
    technical: ""
  };
}

export function StudyExplanation({ question }: { question: Question }) {
  const { simple, technical } = splitExplanation(question.explanation);

  const cards = question.study_cards || [];

  const hasContent =
    Boolean(question.explanation) ||
    Boolean(question.legal_reference) ||
    Boolean(question.legal_text) ||
    Boolean(question.confidence) ||
    cards.length > 0;

  if (!hasContent) {
    return (
      <div className="notice">
        Ainda não há explicação gerada para esta questão.
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      {simple && (
        <section className="card" style={{ boxShadow: "none" }}>
          <h3>Explicação simples</h3>

          <p style={{ lineHeight: 1.8, marginBottom: 0 }}>{simple}</p>
        </section>
      )}

      {technical && (
        <section className="card" style={{ boxShadow: "none" }}>
          <h3>Fundamentação técnica</h3>

          <p style={{ lineHeight: 1.8, marginBottom: 0 }}>{technical}</p>
        </section>
      )}

      {(question.legal_reference || question.legal_text || question.confidence) && (
        <section className="card" style={{ boxShadow: "none" }}>
          <h3>Base legal e segurança</h3>

          {question.legal_reference && (
            <p>
              <strong>Base legal:</strong> {question.legal_reference}
            </p>
          )}

          {question.legal_text && (
            <p>
              <strong>Texto legal:</strong> {question.legal_text}
            </p>
          )}

          {question.confidence && (
            <p>
              <strong>Confiança da IA:</strong> {question.confidence}
            </p>
          )}
        </section>
      )}

      {cards.length > 0 && (
        <section className="card" style={{ boxShadow: "none" }}>
          <h3>Cards de estudo</h3>

          <div className="grid grid-3">
            {cards.map((card, index) => (
              <div className="study-card" key={`${card.title}-${index}`}>
                <strong>{card.title}</strong>

                <p style={{ marginBottom: 14 }}>{card.front}</p>

                <div className="divider" />

                <p>{card.back}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}