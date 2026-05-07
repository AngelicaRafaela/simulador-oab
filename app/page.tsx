"use client";

import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";
import { useOabData } from "@/hooks/useOabData";
import type { Question, SimulationAnswer } from "@/lib/types";

function getQuestionById(questions: Question[]) {
  return new Map(questions.map((q) => [q.id, q]));
}

function getAverageScore(simulations: ReturnType<typeof useOabData>["simulations"]) {
  if (simulations.length === 0) return 0;

  const total = simulations.reduce(
    (sum, simulation) => sum + simulation.score_percentage,
    0
  );

  return Math.round((total / simulations.length) * 10) / 10;
}

function getPerformanceBySubject(
  answers: SimulationAnswer[],
  questions: Question[]
) {
  const questionMap = getQuestionById(questions);
  const map = new Map<
    string,
    {
      subject: string;
      total: number;
      correct: number;
      wrong: number;
      percentage: number;
    }
  >();

  for (const answer of answers) {
    const question = questionMap.get(answer.question_id);
    const subject = question?.subject || "Sem disciplina";

    const current =
      map.get(subject) ||
      {
        subject,
        total: 0,
        correct: 0,
        wrong: 0,
        percentage: 0
      };

    current.total += 1;

    if (answer.is_correct) {
      current.correct += 1;
    } else {
      current.wrong += 1;
    }

    current.percentage =
      current.total > 0
        ? Math.round((current.correct / current.total) * 1000) / 10
        : 0;

    map.set(subject, current);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.subject.localeCompare(b.subject)
  );
}

function getWorstSubjects(
  answers: SimulationAnswer[],
  questions: Question[]
) {
  return getPerformanceBySubject(answers, questions)
    .filter((item) => item.total > 0)
    .sort((a, b) => {
      if (b.wrong !== a.wrong) return b.wrong - a.wrong;
      return a.percentage - b.percentage;
    })
    .slice(0, 5);
}

function getAllAnswers(simulations: ReturnType<typeof useOabData>["simulations"]) {
  return simulations.flatMap((simulation) => simulation.answers);
}

function DashboardContent() {
  const { questions, simulations, stats } = useOabData();

  const validatedQuestions = questions.filter(
    (q) => q.review_status === "validado"
  ).length;

  const pendingQuestions = questions.filter(
    (q) => q.review_status === "pendente" || q.review_status === "precisa_revisao"
  ).length;

  const allAnswers = getAllAnswers(simulations);
  const wrongAnswers = allAnswers.filter((answer) => !answer.is_correct);
  const averageScore = getAverageScore(simulations);
  const performanceBySubject = getPerformanceBySubject(allAnswers, questions);
  const worstSubjects = getWorstSubjects(allAnswers, questions);
  const recentSimulations = simulations.slice(0, 5);

  return (
    <div className="dashboard-page">
      <section className="dashboard-header">
        <div>
          <h1>Dashboard</h1>

          <p className="lead">
            Visão geral do seu progresso na OAB 1ª fase.
          </p>
        </div>

        <div className="actions">
          <Link href="/importar" className="btn secondary">
            Importar questões
          </Link>

          <Link href="/simulado" className="btn">
            Iniciar simulado
          </Link>
        </div>
      </section>

      <section className="dashboard-stats-grid">
        <div className="dashboard-stat-card">
          <div>
            <span>Total de Questões</span>
            <strong>{questions.length}</strong>
          </div>

          <div className="dashboard-stat-icon blue">📘</div>
        </div>

        <div className="dashboard-stat-card">
          <div>
            <span>Validadas</span>
            <strong>{validatedQuestions}</strong>
            <small>
              {questions.length > 0
                ? `${Math.round((validatedQuestions / questions.length) * 100)}% do total`
                : "0% do total"}
            </small>
          </div>

          <div className="dashboard-stat-icon green">✓</div>
        </div>

        <div className="dashboard-stat-card">
          <div>
            <span>Pendentes</span>
            <strong>{pendingQuestions}</strong>
          </div>

          <div className="dashboard-stat-icon orange">⏱</div>
        </div>

        <div className="dashboard-stat-card">
          <div>
            <span>Simulados</span>
            <strong>{simulations.length}</strong>
            <small>Média: {averageScore}%</small>
          </div>

          <div className="dashboard-stat-icon purple">📋</div>
        </div>
      </section>

      <section className="dashboard-panel-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-title">
            <div>
              <h2>Desempenho por Disciplina</h2>
              <p>Taxa de acerto nos simulados realizados.</p>
            </div>
          </div>

          {performanceBySubject.length === 0 ? (
            <div className="dashboard-empty">
              Faça um simulado para visualizar seu desempenho por disciplina.
            </div>
          ) : (
            <div className="dashboard-chart-list">
              {performanceBySubject.map((item) => (
                <div className="dashboard-bar-row" key={item.subject}>
                  <div className="dashboard-bar-label">
                    <span>{item.subject}</span>
                    <small>
                      {item.correct}/{item.total} acertos
                    </small>
                  </div>

                  <div className="dashboard-bar-track">
                    <div
                      className={`dashboard-bar-fill ${
                        item.percentage >= 70
                          ? "good"
                          : item.percentage >= 40
                            ? "medium"
                            : "bad"
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>

                  <strong>{item.percentage}%</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-title">
            <div>
              <h2>Simulados Recentes</h2>
              <p>Últimos resultados registrados.</p>
            </div>
          </div>

          {recentSimulations.length === 0 ? (
            <div className="dashboard-empty">
              Nenhum simulado realizado ainda.
            </div>
          ) : (
            <div className="dashboard-recent-list">
              {recentSimulations.map((simulation, index) => (
                <div className="dashboard-recent-card" key={simulation.id}>
                  <div>
                    <strong>Simulado #{simulations.length - index}</strong>
                    <span>
                      {new Date(simulation.finished_at).toLocaleDateString("pt-BR")} •{" "}
                      {simulation.total_questions} questões
                    </span>
                  </div>

                  <span
                    className={`dashboard-score-badge ${
                      simulation.score_percentage >= 70
                        ? "good"
                        : simulation.score_percentage >= 40
                          ? "medium"
                          : "bad"
                    }`}
                  >
                    {simulation.score_percentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-panel-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-title">
            <div>
              <h2>Disciplinas para reforçar</h2>
              <p>Áreas com mais erros acumulados.</p>
            </div>
          </div>

          {worstSubjects.length === 0 ? (
            <div className="dashboard-empty">
              Ainda não há erros suficientes para análise.
            </div>
          ) : (
            <div className="dashboard-recent-list">
              {worstSubjects.map((item) => (
                <div className="dashboard-recent-card" key={item.subject}>
                  <div>
                    <strong>{item.subject}</strong>
                    <span>
                      {item.wrong} erro(s) • {item.percentage}% de acerto
                    </span>
                  </div>

                  <Link
                    href={`/estudo?subject=${encodeURIComponent(item.subject)}`}
                    className="btn secondary"
                  >
                    Estudar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-title">
            <div>
              <h2>Resumo do banco</h2>
              <p>Distribuição das questões por disciplina.</p>
            </div>
          </div>

          {stats.subjects.length === 0 ? (
            <div className="dashboard-empty">
              Nenhuma questão importada ainda.
            </div>
          ) : (
            <div className="dashboard-subject-list">
              {stats.subjects.slice(0, 10).map((item) => (
                <div className="dashboard-subject-pill" key={item.subject}>
                  <span>{item.subject}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {wrongAnswers.length > 0 && (
        <section className="dashboard-alert-card">
          <div>
            <strong>{wrongAnswers.length} erros acumulados</strong>
            <span>Pratique na seção Revisar Erros.</span>
          </div>

          <Link className="btn secondary" href="/revisao">
            Revisar somente erros
          </Link>
        </section>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <ClientOnly>
      <DashboardContent />
    </ClientOnly>
  );
}