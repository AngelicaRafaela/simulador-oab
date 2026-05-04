# Simulador OAB — versão Vercel v2

Projeto Next.js pronto para deploy na Vercel, sem Replit.

## Recursos

- Importação de questões por JSON.
- Importação de gabarito oficial por JSON.
- Validação automática das questões completas ao importar o gabarito oficial.
- Banco de questões com busca, filtro e status.
- Simulado usando apenas questões `validado`.
- Revisão das questões erradas.
- Aba dedicada de estudo antes do simulado.
- Geração de explicações e cards com Gemini por API Route do Next.js.
- Armazenamento inicial via `localStorage`.

## Gemini

Configure na Vercel a variável de ambiente:

```text
GEMINI_API_KEY=sua_chave_aqui
```

Localmente, crie `.env.local` com a mesma variável.

Sem essa chave, o sistema continua funcionando, mas o botão de gerar explicação/cards mostrará aviso.

## Fluxo recomendado

1. Importar JSON das questões.
2. Importar JSON do gabarito oficial.
3. O sistema atualiza `correct_answer` e valida automaticamente as questões completas.
4. Ir em Banco para revisar.
5. Ir em Estudo para gerar explicações/cards.
6. Fazer simulado.
7. Revisar erros.

## Rodar localmente

```bash
npm install
npm run dev
```


## Correção v3

Esta versão corrige erro de build na Vercel relacionado à tipagem dos cards de estudo (`study_cards`) e à tipagem das respostas do simulado.
