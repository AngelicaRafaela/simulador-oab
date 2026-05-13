"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";

type StudySection = {
  title: string;
  items: string[];
};

type StudyTopic = {
  title: string;
  short_summary: string;
  deep_explanation: string;
  key_points: string[];
  oab_attention: string;
  legal_references: string[];
  sections?: StudySection[];
  user_notes?: string;
  annotations?: Record<string, string>;
};

type StudyMaterial = {
  id: string;
  title: string;
  discipline: string;
  main_topic: string;
  source_file_name: string;
  summary: string;
  study_objective: string;
  topics: StudyTopic[];
  suggested_study_order: string[];
  review_checklist: string[];
  created_at: string;
  updated_at: string;
};

const STORAGE_KEY = "oab-study-materials-v1";

function loadMaterials(): StudyMaterial[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMaterials(materials: StudyMaterial[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
}

function MateriaisContent() {
  const [materials, setMaterials] = useState<StudyMaterial[]>(loadMaterials);
  const [selectedId, setSelectedId] = useState("");
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [matterFilter, setMatterFilter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [activeAnnotationKey, setActiveAnnotationKey] = useState("");
  const [activeAnnotationLabel, setActiveAnnotationLabel] = useState("");
  const [annotationDraft, setAnnotationDraft] = useState("");

  const disciplines = useMemo(
    () =>
      Array.from(new Set(materials.map((item) => item.discipline))).sort(),
    [materials]
  );

  const matters = useMemo(() => {
    if (!disciplineFilter) return [];

    return Array.from(
      new Set(
        materials
          .filter((item) => item.discipline === disciplineFilter)
          .flatMap((item) => item.topics.map((topic) => topic.title))
      )
    ).sort();
  }, [materials, disciplineFilter]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      const matchesDiscipline =
        !disciplineFilter || item.discipline === disciplineFilter;

      const matchesMatter =
        !matterFilter ||
        item.topics.some((topic) => topic.title === matterFilter);

      return matchesDiscipline && matchesMatter;
    });
  }, [materials, disciplineFilter, matterFilter]);

  const selectedMaterial =
    filteredMaterials.find((item) => item.id === selectedId) ||
    filteredMaterials[0] ||
    null;

  const visibleTopics = selectedMaterial
    ? selectedMaterial.topics.filter(
        (topic) => !matterFilter || topic.title === matterFilter
      )
    : [];

  const selectedTopic =
    visibleTopics[selectedTopicIndex] || visibleTopics[0] || null;
useEffect(() => {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const disciplina = params.get("disciplina");
  const materia = params.get("materia");

  if (disciplina) {
    setDisciplineFilter(disciplina);
  }

  if (materia) {
    setMatterFilter(materia);
    setSelectedTopicIndex(0);
  }
}, []);

  const prettifyLabel = (value: string) => {
    const normalized = value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const replacements: Record<string, string> = {
      "Vedacao Ao Anonimato": "Vedação ao anonimato",
      "Direito De Resposta": "Direito de resposta",
      "Liberdade Religiosa": "Liberdade religiosa",
      "Escusa De Consciencia": "Escusa de consciência",
      "Atividade Intelectual Artistica Cientifica Comunicacao":
        "Atividade intelectual, artística, científica e de comunicação",
      "Intimidade Vida Privada Honra Imagem":
        "Intimidade, vida privada, honra e imagem",
      "Inviolabilidade De Domicilio": "Inviolabilidade de domicílio",
      "Regra Geral": "Regra geral",
      "Conceito De Casa": "Conceito de casa",
      "Com Consentimento Do Morador": "Com consentimento do morador",
      "Sem Consentimento Durante O Dia": "Sem consentimento durante o dia",
      "Sem Consentimento A Noite": "Sem consentimento à noite",
      "Pegadinha Oab": "Pegadinha OAB",
      "Inviolabilidade De Sigilos": "Inviolabilidade de sigilos",
      "Cpi E Sigilos": "CPI e sigilos",
      "Livre Exercicio Profissional": "Livre exercício profissional",
      "Acesso A Informacao": "Acesso à informação",
      "Livre Locomocao": "Livre locomoção",
      "Direito De Reuniao": "Direito de reunião",
      Associacoes: "Associações",
      "Dissolucao E Suspensao De Associacoes":
        "Dissolução e suspensão de associações",
      "Liberdade De Associacao": "Liberdade de associação",
      "Representacao Por Entidades Associativas":
        "Representação por entidades associativas",
      "Direito De Propriedade": "Direito de propriedade",
      Desapropriacao: "Desapropriação",
      "Desapropriacao Sancao": "Desapropriação-sanção",
      "Necessidade Utilidade Publica Ou Interesse Social":
        "Necessidade, utilidade pública ou interesse social",
      "Uso Da Propriedade Particular": "Uso da propriedade particular",
      "Art 243": "Art. 243",
      "Pequena Propriedade Rural": "Pequena propriedade rural",
      "Direito Sucessorio": "Direito sucessório",
      "Direito Autoral": "Direito autoral",
      "Direito De Peticao E Certidao": "Direito de petição e certidão",
      "Direito De Peticao": "Direito de petição",
      "Direito De Certidao": "Direito de certidão",
      "Observacao Oab": "Observação OAB",
      "Inafastabilidade De Jurisdicao": "Inafastabilidade de jurisdição",
      "Direito Adquirido Ato Juridico Perfeito Coisa Julgada":
        "Direito adquirido, ato jurídico perfeito e coisa julgada",
      "Juiz Natural": "Juiz natural",
      "Tribunal Do Juri": "Tribunal do Júri",
      "Crimes Dolosos Contra A Vida Listados No Pdf":
        "Crimes dolosos contra a vida listados no PDF",
      "Crimes Conexos": "Crimes conexos",
      "Foro Por Prerrogativa De Funcao": "Foro por prerrogativa de função",
      "Irretroatividade Da Lei Penal": "Irretroatividade da lei penal",
      "Crimes Imprescritiveis": "Crimes imprescritíveis",
      "Observacao Pdf": "Observação do PDF",
      "Conceito De Imprescritivel": "Conceito de imprescritível",
      "Crimes Hediondos Ttt": "Crimes hediondos + TTT",
      "Personalidade Da Pena": "Personalidade da pena",
      "Penas Permitidas": "Penas permitidas",
      "Penas Proibidas": "Penas proibidas",
      "Direitos Dos Presos": "Direitos dos presos",
      "Penas Observacao Atualizacao Legislativa":
        "Observação sobre atualização legislativa das penas",
      "Informacao Do Pdf": "Informação do PDF",
      "Atualizacao Legislativa": "Atualização legislativa",
      "Orientacao De Estudo": "Orientação de estudo",

      "Brasileiro Nato": "Brasileiro nato",
      "Brasileiro Naturalizado": "Brasileiro naturalizado",
      "Devido Processo Legal": "Devido processo legal",
      "Eficacia Horizontal": "Eficácia horizontal",
      "Frutos Da Arvore Envenenada": "Frutos da árvore envenenada",
      "Prova Independente": "Prova independente",
      "Prova Emprestada": "Prova emprestada",
      "Prisao Por Alimentos": "Prisão por alimentos",
      "Depositario Infiel": "Depositário infiel",
      "Status Supralegal": "Status supralegal",
      "Habeas Corpus": "Habeas corpus",
      "Habeas Data": "Habeas data",
      "Mandado De Seguranca": "Mandado de segurança",
      "Mandado De Seguranca Coletivo": "Mandado de segurança coletivo",
      "Mandado De Injuncao": "Mandado de injunção",
      "Acao Popular": "Ação popular",
      "Expressao Chave": "Expressão-chave",
      "Precisa De Advogado": "Precisa de advogado",
      "Impetrado Ou Autoridade Coatora": "Impetrado ou autoridade coatora",
      "Preventivo Ou Salvo Conduto": "Preventivo ou salvo-conduto",
      "Repressivo Ou Liberatorio": "Repressivo ou liberatório",
      "Protecao Contra Despedida": "Proteção contra despedida",
      "Seguro Desemprego": "Seguro-desemprego",
      "Salario Minimo": "Salário mínimo",
      "Piso Salarial": "Piso salarial",
      "Irredutibilidade De Salario": "Irredutibilidade de salário",
      "Remuneracao Variavel": "Remuneração variável",
      "Decimo Terceiro": "Décimo terceiro",
      "Adicional Noturno": "Adicional noturno",
      "Rural Lavoura": "Rural - lavoura",
      "Rural Pecuaria": "Rural - pecuária",
      "Adicional Rural": "Adicional rural",
      "Protecao Do Salario": "Proteção do salário",
      "Participacao Nos Lucros": "Participação nos lucros",
      "Salario Familia": "Salário-família",
      "Turnos Ininterruptos": "Turnos ininterruptos",
      "Repouso Semanal": "Repouso semanal",
      "Horas Extras": "Horas extras",
      "Licenca Gestante": "Licença-gestante",
      "Licenca Paternidade": "Licença-paternidade",
      "Mercado De Trabalho Da Mulher": "Mercado de trabalho da mulher",
      "Aviso Previo": "Aviso prévio",
      "Saude Higiene E Seguranca": "Saúde, higiene e segurança",
      "Adicional Penoso Insalubre Perigoso":
        "Adicional penoso, insalubre e perigoso",
      "Creches E Pre Escolas": "Creches e pré-escolas",
      "Convencoes E Acordos": "Convenções e acordos",
      "Acidente De Trabalho": "Acidente de trabalho",
      Prescricao: "Prescrição",
      "Prescricao Relativa": "Prescrição relativa",
      "Prescricao Total": "Prescrição total",
      "Igualdade E Nao Discriminacao": "Igualdade e não discriminação",
      "Limites Etarios": "Limites etários",
      "Menor De 14": "Menor de 14 anos",
      "A Partir De 14": "A partir de 14 anos",
      "Maior De 16": "Maior de 16 anos",
      "Trabalhador Avulso": "Trabalhador avulso",
      "Trabalhador Domestico": "Trabalhador doméstico",
      "Direitos Previstos No Pdf": "Direitos previstos no PDF",
      "Pontos Oab": "Pontos OAB",
      Remedios: "Remédios",
      "Remedios Constitucionais": "Remédios constitucionais",
      Direitos: "Direitos",
      Cabimento: "Cabimento",
      Natureza: "Natureza",
      Gratuito: "Gratuito",
      Partes: "Partes",
      Impetrante: "Impetrante",
      Paciente: "Paciente",
      Caracteristicas: "Características",
      Especies: "Espécies",
      Lei: "Lei",
      Atencao: "Atenção",
      Legitimidade: "Legitimidade",
      Observacoes: "Observações",
      "Nao Podem Propor": "Não podem propor",
      Foro: "Foro",
      Paginas: "Páginas"
    };

    return replacements[normalized] || normalized;
  };

  const flattenValue = (value: any, prefix = ""): string[] => {
    if (value === null || value === undefined || value === "") {
      return [];
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      const displayValue =
        typeof value === "boolean" ? (value ? "Sim" : "Não") : String(value);

      return [prefix ? `${prefix}: ${displayValue}` : displayValue];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => {
        if (
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
        ) {
          const displayValue =
            typeof item === "boolean" ? (item ? "Sim" : "Não") : String(item);

          return [prefix ? `${prefix}: ${displayValue}` : displayValue];
        }

        return flattenValue(item, prefix);
      });
    }

    if (typeof value === "object") {
      return Object.entries(value).flatMap(([key, item]) => {
        const label = prettifyLabel(key);
        const nextPrefix = prefix ? `${prefix} - ${label}` : label;

        return flattenValue(item, nextPrefix);
      });
    }

    return [prefix ? `${prefix}: ${String(value)}` : String(value)];
  };

  const formatValue = (value: any): string[] => {
    return flattenValue(value);
  };

  const assuntoToTopic = (assunto: any): StudyTopic => {
    const sections: StudySection[] = [];

    if (Array.isArray(assunto.pontos_de_estudo)) {
      sections.push({
        title: "Pontos de estudo",
        items: assunto.pontos_de_estudo.map((ponto: any) => {
          const titulo = ponto.topico || ponto.titulo || "Ponto";
          const autor = ponto.autor ? ` (${ponto.autor})` : "";
          const conteudo = ponto.conteudo || "";

          return `${titulo}${autor}: ${conteudo}`;
        })
      });
    }

    const simpleSectionMap: Array<[string, string]> = [
      ["classificacoes", "Classificações"],
      ["elementos", "Elementos"],
      ["funcoes", "Funções"],
      ["tipos", "Tipos"],
      ["preambulo", "Preâmbulo"],
      ["adct", "ADCT"],
      ["republica", "República"],
      ["fundamentos_art_1", "Fundamentos do art. 1º"],
      ["democracia", "Democracia"],
      ["objetivos_art_3", "Objetivos do art. 3º"],
      ["principios_relacoes_internacionais_art_4", "Relações internacionais"],
      ["dimensoes", "Dimensões dos direitos fundamentais"],
      ["topicos", "Tópicos do art. 5º"],
      ["pontos_oab", "Pontos OAB"]
    ];

    simpleSectionMap.forEach(([key, title]) => {
      if (assunto[key]) {
        sections.push({
          title,
          items: formatValue(assunto[key])
        });
      }
    });

    if (assunto.remedios) {
      Object.entries(assunto.remedios).forEach(([nome, conteudo]) => {
        sections.push({
          title: prettifyLabel(nome),
          items: formatValue(conteudo)
        });
      });
    }

    if (assunto.direitos) {
      Object.entries(assunto.direitos).forEach(([nome, conteudo]) => {
        sections.push({
          title: prettifyLabel(nome),
          items: formatValue(conteudo)
        });
      });
    }

    if (Array.isArray(assunto.atencao)) {
      sections.push({
        title: "Atenção para prova",
        items: assunto.atencao
      });
    }

    const resumo = Array.isArray(assunto.resumo)
      ? assunto.resumo
      : assunto.resumo
        ? [assunto.resumo]
        : [];

    return {
      title: assunto.tema || assunto.titulo || "Matéria sem título",
      short_summary: resumo.join(" "),
      deep_explanation: "",
      key_points: resumo,
      oab_attention: Array.isArray(assunto.atencao)
        ? assunto.atencao.join(" ")
        : "",
      legal_references: assunto.paginas
        ? [`Página(s) ${assunto.paginas.join(", ")} do material enviado`]
        : [],
      sections
    };
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Selecione um arquivo JSON antes de importar.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const topics = Array.isArray(parsed.topics)
        ? parsed.topics
        : Array.isArray(parsed.topicos)
          ? parsed.topicos
          : Array.isArray(parsed.assuntos)
            ? parsed.assuntos.map(assuntoToTopic)
            : [];

      const material: StudyMaterial = {
        id: parsed.id || `mat-${Date.now()}`,
        title:
          parsed.title ||
          parsed.titulo ||
          parsed.documento?.titulo ||
          "Material de estudo",
        discipline:
          parsed.discipline ||
          parsed.disciplina ||
          parsed.fonte?.disciplina ||
          "Direito Constitucional",
        main_topic:
          parsed.main_topic ||
          parsed.materia ||
          parsed.titulo ||
          parsed.assuntos?.[0]?.tema ||
          "Material importado",
        source_file_name:
          parsed.source_file_name || parsed.fonte?.arquivo || file.name,
        summary:
          parsed.summary ||
          parsed.resumo ||
          parsed.fonte?.observacao ||
          `Material importado com ${topics.length} matéria(s) de estudo.`,
        study_objective:
          parsed.study_objective ||
          parsed.objetivo_estudo ||
          "Estudar e revisar os principais pontos do material.",
        topics,
        suggested_study_order: Array.isArray(parsed.suggested_study_order)
          ? parsed.suggested_study_order
          : Array.isArray(parsed.ordem_estudo)
            ? parsed.ordem_estudo
            : Array.isArray(parsed.assuntos)
              ? parsed.assuntos
                  .map((assunto: any) => assunto.tema)
                  .filter(Boolean)
              : [],
        review_checklist: Array.isArray(parsed.review_checklist)
          ? parsed.review_checklist
          : Array.isArray(parsed.checklist_revisao)
            ? parsed.checklist_revisao
            : Array.isArray(parsed.checklist_oab)
              ? parsed.checklist_oab
              : [],
        created_at: parsed.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!material.topics || material.topics.length === 0) {
        throw new Error(
          "O JSON foi lido, mas não possui matérias reconhecíveis. Use 'topics', 'topicos' ou 'assuntos'."
        );
      }

      const nextMaterials = [material, ...materials];

      setMaterials(nextMaterials);
      saveMaterials(nextMaterials);
      setSelectedId(material.id);
      setSelectedTopicIndex(0);
      setDisciplineFilter(material.discipline);
      setMatterFilter("");
      setActiveAnnotationKey("");
      setActiveAnnotationLabel("");
      setAnnotationDraft("");
      setFile(null);
      setMessage("Material JSON importado com sucesso.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao importar o arquivo JSON."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    const confirmDelete = window.confirm(
      "Deseja excluir este material de estudo?"
    );

    if (!confirmDelete) return;

    const next = materials.filter((item) => item.id !== id);

    setMaterials(next);
    saveMaterials(next);
    setSelectedId("");
    setSelectedTopicIndex(0);
    setActiveAnnotationKey("");
    setActiveAnnotationLabel("");
    setAnnotationDraft("");
  };

  const openAnnotation = (key: string, label: string) => {
    setActiveAnnotationKey(key);
    setActiveAnnotationLabel(label);
    setAnnotationDraft(selectedTopic?.annotations?.[key] || "");
  };

  const handleSaveAnnotation = () => {
    if (!selectedMaterial || !selectedTopic || !activeAnnotationKey) return;

    const updatedMaterials = materials.map((material) => {
      if (material.id !== selectedMaterial.id) return material;

      return {
        ...material,
        topics: material.topics.map((topic) => {
          if (topic.title !== selectedTopic.title) return topic;

          return {
            ...topic,
            annotations: {
              ...(topic.annotations || {}),
              [activeAnnotationKey]: annotationDraft
            }
          };
        }),
        updated_at: new Date().toISOString()
      };
    });

    setMaterials(updatedMaterials);
    saveMaterials(updatedMaterials);
  };

  const handleSaveTopicNotes = (value: string) => {
    if (!selectedMaterial || !selectedTopic) return;

    const updatedMaterials = materials.map((material) => {
      if (material.id !== selectedMaterial.id) return material;

      return {
        ...material,
        topics: material.topics.map((topic) =>
          topic.title === selectedTopic.title
            ? {
                ...topic,
                user_notes: value
              }
            : topic
        ),
        updated_at: new Date().toISOString()
      };
    });

    setMaterials(updatedMaterials);
    saveMaterials(updatedMaterials);
  };

  return (
    <div className="materials-page">
      <section className="card">
        <div
          className="actions"
          style={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginTop: 0
          }}
        >
          <div>
            <h1>Estudo aprofundado</h1>

            <p className="lead">
              Importe materiais em JSON para estudar por disciplina, matéria e
              tópicos aprofundados.
            </p>
          </div>
        </div>

        <div className="form-row" style={{ marginTop: 16 }}>
          <div>
            <label>Arquivo JSON de estudo</label>

            <input
              className="input"
              type="file"
              accept="application/json,.json"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </div>

          <div>
            <label>Filtro por disciplina</label>

            <select
              className="select"
              value={disciplineFilter}
              onChange={(event) => {
                setDisciplineFilter(event.target.value);
                setMatterFilter("");
                setSelectedId("");
                setSelectedTopicIndex(0);
                setActiveAnnotationKey("");
                setActiveAnnotationLabel("");
                setAnnotationDraft("");
              }}
            >
              <option value="">Todas</option>

              {disciplines.map((discipline) => (
                <option key={discipline} value={discipline}>
                  {discipline}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Filtro por matéria</label>

            <select
              className="select"
              value={matterFilter}
              disabled={!disciplineFilter}
              onChange={(event) => {
                setMatterFilter(event.target.value);
                setSelectedId("");
                setSelectedTopicIndex(0);
                setActiveAnnotationKey("");
                setActiveAnnotationLabel("");
                setAnnotationDraft("");
              }}
            >
              <option value="">
                {disciplineFilter
                  ? "Todas as matérias"
                  : "Selecione uma disciplina"}
              </option>

              {matters.map((matter) => (
                <option key={matter} value={matter}>
                  {matter}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Ação</label>

            <button className="btn" onClick={handleUpload} disabled={loading}>
              {loading ? "Importando JSON..." : "Importar material JSON"}
            </button>
          </div>
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
      </section>

      {filteredMaterials.length === 0 ? (
        <section className="card">
          <p className="muted">
            Nenhum material encontrado. Importe um JSON para gerar a área de
            estudo aprofundado.
          </p>
        </section>
      ) : (
        <section className="materials-study-layout">
          <aside className="materials-sidebar card">
            <h2>Materiais</h2>

            <div className="materials-list">
              {filteredMaterials.map((material) => (
                <button
                  key={material.id}
                  className={`material-list-item ${
                    selectedMaterial?.id === material.id ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedId(material.id);
                    setSelectedTopicIndex(0);
                    setMatterFilter("");
                    setActiveAnnotationKey("");
                    setActiveAnnotationLabel("");
                    setAnnotationDraft("");
                  }}
                >
                  <strong>{material.main_topic}</strong>
                  <span>{material.discipline}</span>
                  <small>{material.source_file_name}</small>
                </button>
              ))}
            </div>

            {selectedMaterial && (
              <button
                className="btn danger"
                style={{ width: "100%", marginTop: 16 }}
                onClick={() => handleDelete(selectedMaterial.id)}
              >
                Excluir material
              </button>
            )}
          </aside>

          <main className="materials-reader card">
            {!selectedMaterial || !selectedTopic ? (
              <p className="muted">
                Nenhuma matéria encontrada para os filtros selecionados.
              </p>
            ) : (
              <>
                <div className="reader-matter-tabs">
                  {visibleTopics.map((topic, index) => (
                    <button
                      key={`${topic.title}-${index}`}
                      className={`reader-matter-tab ${
                        selectedTopic?.title === topic.title ? "active" : ""
                      }`}
                      onClick={() => {
                        setSelectedTopicIndex(index);
                        setActiveAnnotationKey("");
                        setActiveAnnotationLabel("");
                        setAnnotationDraft("");
                      }}
                    >
                      {topic.title}
                    </button>
                  ))}
                </div>

                <div className="material-breadcrumb">
                  <span>{selectedMaterial.discipline}</span>
                  <strong>›</strong>
                  <span>{selectedTopic.title}</span>
                </div>

                <h1 className="reader-title">{selectedTopic.title}</h1>

                <p className="muted">
                  Fonte: {selectedMaterial.source_file_name}
                </p>

                {selectedTopic.short_summary && (
                  <section className="reader-summary">
                    <h2>Resumo da matéria</h2>
                    <p>{selectedTopic.short_summary}</p>
                  </section>
                )}

                {selectedTopic.sections && selectedTopic.sections.length > 0 ? (
                  <div className="reader-section-list">
                    {selectedTopic.sections.map((section, sectionIndex) => (
                      <section
                        className="reader-section"
                        key={`${section.title}-${sectionIndex}`}
                      >
                        <h2>{section.title}</h2>

                        <div className="reader-items">
                          {section.items.map((item, itemIndex) => {
                            const annotationKey = `${selectedMaterial.id}-${selectedTopic.title}-${section.title}-${itemIndex}`;
                            const hasAnnotation = Boolean(
                              selectedTopic.annotations?.[annotationKey]
                            );

                            return (
                              <div
                                className={`reader-annotable-line ${
                                  hasAnnotation ? "has-annotation" : ""
                                }`}
                                key={`${itemIndex}-${item.slice(0, 20)}`}
                              >
                                <p>{item}</p>

                                <button
                                  type="button"
                                  className="annotation-button"
                                  onClick={() =>
                                    openAnnotation(
                                      annotationKey,
                                      `${section.title}: ${item.slice(0, 120)}`
                                    )
                                  }
                                >
                                  {hasAnnotation ? "Ver anotação" : "Anotar"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : selectedTopic.deep_explanation ? (
                  <section className="reader-section">
                    <h2>Aprofundamento</h2>
                    <p>{selectedTopic.deep_explanation}</p>
                  </section>
                ) : null}

                {selectedTopic.key_points?.filter(Boolean).length > 0 && (
                  <section className="reader-section reader-highlight">
                    <h2>Pontos importantes</h2>

                    <ul>
                      {selectedTopic.key_points
                        .filter(Boolean)
                        .map((point, index) => (
                          <li key={`${point}-${index}`}>{point}</li>
                        ))}
                    </ul>
                  </section>
                )}

                {selectedTopic.oab_attention && (
                  <section className="reader-section reader-warning">
                    <h2>Atenção para OAB</h2>
                    <p>{selectedTopic.oab_attention}</p>
                  </section>
                )}

                {selectedTopic.legal_references?.length > 0 && (
                  <section className="reader-section">
                    <h2>Base / Fonte</h2>

                    <div className="actions">
                      {selectedTopic.legal_references.map(
                        (reference, index) => (
                          <span
                            className="badge"
                            key={`${reference}-${index}`}
                          >
                            {reference}
                          </span>
                        )
                      )}
                    </div>
                  </section>
                )}

                {!matterFilter &&
                  selectedMaterial.suggested_study_order?.length > 0 && (
                    <section className="reader-section">
                      <h2>Ordem sugerida de estudo</h2>

                      <ol>
                        {selectedMaterial.suggested_study_order.map(
                          (item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          )
                        )}
                      </ol>
                    </section>
                  )}

                {!matterFilter &&
                  selectedMaterial.review_checklist?.length > 0 && (
                    <section className="reader-section">
                      <h2>Checklist de revisão</h2>

                      <ul>
                        {selectedMaterial.review_checklist.map(
                          (item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          )
                        )}
                      </ul>
                    </section>
                  )}
              </>
            )}
          </main>

          <aside className="materials-notes card">
            <h2>Anotações</h2>

            {!selectedTopic ? (
              <p className="muted small">
                Selecione uma matéria para criar anotações.
              </p>
            ) : (
              <>
                <div className="notes-block">
                  <h3>Anotação geral da matéria</h3>

                  <textarea
                    className="textarea notes-textarea"
                    value={selectedTopic.user_notes || ""}
                    onChange={(event) =>
                      handleSaveTopicNotes(event.target.value)
                    }
                    placeholder="Anote aqui dúvidas, pontos de revisão ou observações gerais da matéria..."
                  />

                  <p className="muted small">Salvo automaticamente.</p>
                </div>

                <div className="divider" />

                <div className="notes-block">
                  <h3>Anotação do trecho</h3>

                  {activeAnnotationKey ? (
                    <>
                      <p className="selected-snippet">
                        {activeAnnotationLabel}
                      </p>

                      <textarea
                        className="textarea notes-textarea"
                        value={annotationDraft}
                        onChange={(event) =>
                          setAnnotationDraft(event.target.value)
                        }
                        placeholder="Escreva sua anotação sobre esse trecho..."
                      />

                      <button
                        type="button"
                        className="btn"
                        onClick={handleSaveAnnotation}
                      >
                        Salvar anotação
                      </button>
                    </>
                  ) : (
                    <p className="muted small">
                      Clique em “Anotar” ao lado de qualquer trecho do texto.
                    </p>
                  )}
                </div>
              </>
            )}
          </aside>
        </section>
      )}
    </div>
  );
}

export default function MateriaisPage() {
  return (
    <ClientOnly>
      <MateriaisContent />
    </ClientOnly>
  );
}