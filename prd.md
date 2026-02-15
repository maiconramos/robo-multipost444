# PRD — Robô MultiPost (Self-Hosted Social Scheduler + IA)

## 1) Visão Geral

O **Robô MultiPost** é um painel **self-hosted** para **agendar e publicar conteúdo em múltiplas redes sociais**, com recursos de **IA para gerar texto e imagens**.  
Ele deve ser simples de instalar para alunos não-desenvolvedores (principalmente via **Vercel + Neon**) e, ao mesmo tempo, robusto o suficiente para agências (multiusuário, workspaces por cliente).

### Problema que resolve
- Hoje muitos alunos conseguem postar via automações (ex: n8n), mas faltam:
  - **calendário visual**
  - **fila (queue)**
  - **status / logs / reprocessamento**
  - **gestão de múltiplas contas e clientes**
  - **criação assistida por IA** integrada ao editor

### Diferencial estratégico
- O produto suporta dois modos:
  1) **BYO (Bring Your Own App / Token):** o aluno cria o app na rede (quando necessário) e insere credenciais/tokens no painel.
  2) **Modo Late (opcional):** o aluno que já usa Late pode conectar e publicar por lá, evitando burocracias (especialmente em redes mais chatas, ex: TikTok).

---

## 2) Objetivos (Outcomes)

### Objetivo principal
Entregar um **software pronto (painel)** que permita ao aluno:
- conectar contas sociais (BYO e/ou Late),
- criar e agendar posts em um calendário,
- publicar automaticamente no horário,
- visualizar logs e falhas,
- usar IA para gerar legendas e imagens,
- operar com **múltiplos usuários** e (opcional) **workspaces por cliente**.

### Objetivos secundários
- Disponibilizar uma **Public API** para integrações externas (ex: n8n, WordPress, automações).
- Manter um modelo de distribuição que permita:
  - **repo privado**, fork bloqueado,
  - atualizações controladas (release branches) sem quebrar apps de alunos automaticamente.

---

## 3) Não-Objetivos (Explicitamente fora do escopo inicial)
- Ser um “clone do Late”.
- Garantir suporte completo a todas as redes no MVP (as redes serão adicionadas incrementalmente).
- Fazer “aprovação especial” complexa em nome do produto para todas as redes.
- Construir um sistema de atendimento/inbox no MVP (pode entrar como roadmap).

---

## 4) Usuários e Casos de Uso

### Perfis
1) **Aluno solo (iniciante):**
   - Quer instalar rápido e agendar posts com calendário.
2) **Dono de agência:**
   - Quer multiusuário e separação por clientes.
3) **Usuário avançado:**
   - Quer API pública para automatizar criação e envio de posts.

### Casos de uso principais
- “Conectar Instagram BYO e agendar 30 posts no mês.”
- “Usar Late para TikTok e BYO para Instagram.”
- “Equipe da agência revisa, aprova e agenda conteúdo por cliente.”
- “Automação externa cria posts e agenda via Public API.”

---

## 5) Repositório Base e Estratégia de Desenvolvimento

### Base do produto
- O projeto parte do sistema base do Robô MultiPost (originalmente LateWiz) como base de UI/UX e estrutura (calendário, queue, compose).  
- O desenvolvimento será feito com **Vibe Coding** (agentes de IA), com regras claras para mudanças incrementais.

### Uso do Postiz
- O **Postiz** será usado **somente como referência conceitual/benchmark** para:
  - entender funcionalidades que fazem sentido,
  - mapear fluxos e entidades (posts, status, retries, APIs),
  - inspirar UX e checks.
- **Regra obrigatória:** não copiar código nem portar arquivos do Postiz (evitar risco de licença e dependência).

---

## 6) Arquitetura do Produto (Alvo)

### Stack alvo (padrão recomendado)
- **Frontend/Backend:** Next.js (App Router)
- **Banco:** Neon (Postgres) + Prisma
- **Auth:** Neon Auth (Better Auth) com sessão via cookies httpOnly
- **Scheduler:** Vercel Cron chamando endpoint de publicação
- **Storage de mídia (default):** Vercel Blob (com opção URL_ONLY e opção S3 compatível/R2 no futuro)

### Multiusuário e multi-cliente (workspaces)
- **1 instalação = 1 agência/cliente (tenant da instalação)**
- Dentro da instalação:
  - múltiplos usuários
  - (opcional) múltiplos workspaces por cliente
- Feature flag sugerida:
  - `ENABLE_MULTI_WORKSPACE=false` por padrão

---

## 7) Fluxos Funcionais (End-to-End)

### 7.1 Auth e acesso
1) Usuário acessa `/login` ou `/signup`
2) Neon Auth cria sessão (cookie httpOnly)
3) Middleware protege `/dashboard/*` e APIs internas
4) Primeiro usuário pode “bootstrap” um workspace padrão e virar OWNER
5) Usuários sem workspace veem `/no-access` até receberem convite

### 7.2 Conexão de Providers
O sistema terá uma interface comum de provider (SocialProvider):

- **LateProvider**
  - usa `LATE_API_KEY` (Credential criptografada)
  - publica via Late API
- **BYOProvider (por rede)**
  - o usuário insere credenciais/tokens (criptografados)
  - o app publica direto na rede (quando viável)
  - redes complexas podem ser “Late only” inicialmente

### 7.3 Criação e agendamento de posts
1) Usuário cria post (DRAFT)
2) Adiciona mídia (upload ou URL)
3) Adiciona texto/legenda
4) Define providerTarget (Late / rede BYO)
5) Agenda (SCHEDULED com `scheduledAt`)
6) Post aparece no calendário e na fila

### 7.4 Publicação automática
1) Cron chama `/api/cron/publish`
2) Busca posts vencidos (`scheduledAt <= now`)
3) Faz lock (muda status para PUBLISHING)
4) Executa publisher do providerTarget
5) Atualiza status:
   - `PUBLISHED` + `publishedAt`
   - ou `FAILED` + logs e retry

### 7.5 Logs, erros e reprocessamento
- Cada tentativa gera `PostLog` (INFO/ERROR) com payload sanitizado.
- Post mantém contador `attempts`.
- UI permite “Retry” manual para posts FAILED (roadmap ou MVP dependendo do tempo).

---

## 8) IA Integrada (Texto e Imagem)

### Objetivo
Adicionar IA diretamente no editor (compose), para acelerar produção:

- **Gerar legenda** (texto)
- **Gerar variações** (texto)
- **Gerar imagem** (imagem)

### Providers planejados
- **OpenRouter** (texto e imagem) como provider principal.
- **KIE AI (Nano Banana)** como alternativa futura para imagem.

### Regras importantes
- Chaves de IA nunca vão ao client.
- Chamadas sempre via endpoints internos `/api/ai/*`.
- Resultados de IA ficam como conteúdo do post (não publicam automaticamente).

---

## 9) Public API (Plus para automações)

### Objetivo
Permitir que ferramentas externas (ex: n8n, WordPress, pipelines) criem/agendem posts no painel.

### Endpoints mínimos (v1)
- `POST /api/public/v1/posts` — cria ou agenda
- `GET /api/public/v1/posts` — lista por status/data
- (Opcional) `POST /api/public/v1/media` — upload/registro de mídia

### Autenticação
- API Key por workspace/user (armazenada criptografada).
- Rate limit básico (roadmap).

---

## 10) Segurança e Boas Práticas (Obrigatório)

- **Nunca** armazenar credenciais em localStorage.
- Credenciais/tokens devem ficar:
  - criptografados (AES-256-GCM)
  - no banco (Credential)
- Logs devem ser sanitizados:
  - nunca logar tokens completos
- Proteção server-side com middleware:
  - bloquear dashboard e APIs internas sem sessão

---

## 11) Estratégia de Distribuição, Atualizações e Risco

### Distribuição
- Repositório **privado** (acesso por assinatura)
- Fork bloqueado
- Aluno pode clonar/baixar (realidade), então o controle é por acesso a updates + licença/termos.

### Atualizações sem quebrar alunos
- Sem auto-deploy por padrão: alunos atualizam quando desejarem.
- Releases via branches:
  - `release/v1.0.0`, `release/v1.0.1`, etc.
- Aluno escolhe a branch na Vercel (ou cria novo projeto) para atualizar/rollback.

---

## 12) Roadmap por Fases (alto nível)

### Fase A — Foundation (infra base)
- Prisma + Neon
- Criptografia de credentials
- Modelos: posts, contas, logs

### Fase B — Auth + Workspaces
- Neon Auth (Better Auth)
- Middleware de proteção
- Workspaces e convites
- Bootstrap do primeiro usuário (OWNER)

### Fase C — Core Scheduler + UI
- CRUD de posts no DB
- Calendar/Queue usando DB como fonte de verdade
- Cron publish pipeline + locks + logs

### Fase D — Providers
- LateProvider funcional
- Instagram BYO MVP (imagem única + legenda)
- Outras redes BYO incrementalmente
- Redes complexas: usar Late como fallback

### Fase E — Storage
- Vercel Blob (default)
- URL_ONLY
- S3 compatível (R2) opcional

### Fase F — IA
- OpenRouter: texto + imagem
- KIE Nano Banana (opcional)
- UX no composer

### Fase G — Public API
- Endpoints v1 + API keys
- Docs e exemplos
- Rate limit básico

---

## 13) Critérios de Sucesso (MVP)
- Usuário consegue:
  - criar conta, logar, ter workspace
  - configurar provider Late e/ou BYO
  - criar post, anexar mídia, agendar
  - o cron publica automaticamente e registra logs
  - ver calendário e status corretamente
  - gerar legenda e imagem via IA (ao menos 1 provider)

---

## 14) Perguntas em Aberto (para decidir durante o desenvolvimento)
- Quais redes entram no MVP BYO além de Instagram?
- Quais formatos entram primeiro (imagem única vs carrossel vs reels)?
- Limites padrão de upload (imagem/vídeo) para reduzir suporte no plano gratuito?
- Aprovação/fluxos específicos por rede: o que ficará “Late only”?
- Nível de colaboração no MVP: precisa de “aprovação” ou só multiuser?

---

## 15) Glossário
- **BYO:** Bring Your Own (o aluno fornece credenciais/tokens/apps)
- **Provider:** conector de publicação (Late ou rede BYO)
- **Workspace:** agrupamento por cliente/agência dentro da mesma instalação
- **Cron/Scheduler:** rotina que publica posts vencidos
- **Credential:** entidade segura (criptografada) para armazenar segredos
