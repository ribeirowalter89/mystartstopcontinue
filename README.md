# Start Stop Continue - Collaborative Realtime Board

Aplicacao web full-stack para retrospectivas de equipe no formato Start / Stop / Continue, com colaboracao em tempo real via WebSocket.

## Tecnologias

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + TypeScript + Express + ws
- Realtime: WebSocket (delta events + estado inicial autoritativo)
- Persistencia: driver configuravel (`memory` ou `postgres`)
- Testes: Vitest (camada de dominio)

## Estrutura de pastas

```txt
.
|- src
|  |- client
|  |  |- components
|  |  |- hooks
|  |  |- lib
|  |  |- pages
|  |  `- styles
|  |- server
|  |  |- domain
|  |  |- http
|  |  |- persistence
|  |  `- transport
|  `- shared
|- sql
|- docker-compose.yml
|- index.html
|- package.json
`- README.md
```

## Como rodar localmente (memory)

1. Instale dependencias:

```bash
npm install
```

2. Rode frontend + backend em paralelo:

```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API + WS: [http://localhost:3001](http://localhost:3001) e `ws://localhost:3001/ws`

## Como rodar com PostgreSQL

1. Suba um Postgres local (exemplo com Docker):

```bash
docker compose up -d postgres
```

2. Configure `.env`:

```env
PERSISTENCE_DRIVER=postgres
POSTGRES_URL=postgresql://ssc:ssc@localhost:5432/ssc
```

3. Rode a aplicacao:

```bash
npm run dev
```

Observacao: o backend executa criacao da tabela `boards` automaticamente no startup. O SQL de referencia esta em `sql/postgres-init.sql`.

## Scripts

- `npm run dev`: sobe frontend e backend em modo desenvolvimento
- `npm run build`: build client e server
- `npm start`: executa servidor compilado
- `npm test`: executa testes de dominio

## Variaveis de ambiente

Backend:

- `PORT` (default: `3001`)
- `CLIENT_ORIGIN` (default: `http://localhost:5173`)
- `PERSISTENCE_DRIVER` (`memory` por padrao, ou `postgres`)
- `POSTGRES_URL` (obrigatoria quando `PERSISTENCE_DRIVER=postgres`)

Frontend (`.env`):

- `VITE_API_BASE_URL` (default: `http://localhost:3001`)
- `VITE_WS_BASE_URL` (default derivado automaticamente de `VITE_API_BASE_URL`)

## Funcionalidades implementadas

- Criacao de board (`POST /api/boards`)
- Link publico de board (`/board/:boardId`)
- 3 colunas fixas: Start, Stop, Continue
- CRUD de cards em tempo real
- Drag-and-drop entre colunas em tempo real
- Presenca online (avatar bolinha + nome/cor)
- Votacao por pontos com limite por usuario
- Toggle de votacao (somente criador do board, via owner token localStorage)
- Estado autoritativo do servidor com resolucao de conflito por ultima escrita
- Ultimos boards visitados (localStorage)
- Modal de nome de exibicao ao entrar
- Tratamento simples de erros com toast no cliente

## Eventos WebSocket

Cliente -> Servidor:

- `JOIN_BOARD`
- `CREATE_CARD`
- `UPDATE_CARD`
- `DELETE_CARD`
- `MOVE_CARD`
- `TOGGLE_VOTE`
- `TOGGLE_VOTING`

Servidor -> Cliente:

- `BOARD_STATE`
- `CARD_CREATED`
- `CARD_UPDATED`
- `CARD_DELETED`
- `CARD_MOVED`
- `VOTE_UPDATED`
- `USER_VOTE_STATE`
- `BOARD_SETTINGS_UPDATED`
- `PRESENCE_UPDATE`
- `ERROR`

## Exemplo de fluxo realtime

1. Usuario A cria board na home (`Create new board`).
2. Backend retorna `boardId` + `ownerToken`.
3. Usuario A e Usuario B entram em `/board/{boardId}`.
4. Cada cliente envia `JOIN_BOARD`; servidor responde `BOARD_STATE` e publica `PRESENCE_UPDATE`.
5. Usuario A cria um card em Start -> todos recebem `CARD_CREATED`.
6. Usuario B arrasta o card para Continue -> todos recebem `CARD_MOVED` imediatamente.
7. Usuario A inicia votacao -> todos recebem `BOARD_SETTINGS_UPDATED`.
8. Usuarios votam no card -> todos recebem `VOTE_UPDATED`; cada usuario recebe seu `USER_VOTE_STATE`.

## Arquitetura de persistencia

A regra de negocio esta centralizada em `BoardService` (camada `domain`).

- `InMemoryBoardRepository`: rapido para desenvolvimento local.
- `PostgresBoardRepository`: salva o estado completo do board em `JSONB`, mantendo o mesmo contrato de dominio.

Isso permite trocar persistencia sem alterar os eventos de realtime nem os componentes React.

## Testes incluidos

Arquivo: `src/server/domain/board-service.test.ts`

- limite de votos por usuario
- movimentacao de card entre colunas
- limpeza de votos ao excluir card

## Como testar no GitHub (passo a passo para leigos)

Este projeto ja inclui um workflow de CI em `.github/workflows/ci.yml` que roda automaticamente:

- `npm install`
- `npm test`
- `npm run build`

Siga este roteiro:

1. Crie uma conta no GitHub (se ainda nao tiver).
2. Clique em **New repository**.
3. Escolha um nome (exemplo: `my-start-stop-continue`), deixe como **Public** ou **Private**, e clique em **Create repository**.
4. No seu computador, dentro da pasta do projeto, rode:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```

5. Abra o repositório no GitHub e clique na aba **Actions**.
6. Voce vera o workflow **CI** rodando sozinho apos o `push`.
7. Clique no workflow para ver cada etapa:
- **Install dependencies**
- **Run tests**
- **Build project**

Como interpretar:

- Check verde: passou.
- X vermelho: falhou.
- Clicando na etapa voce ve o erro detalhado.

### Rodar manualmente no GitHub

Se quiser testar de novo sem novo commit:

1. Aba **Actions**.
2. Clique no workflow **CI**.
3. Clique em **Run workflow**.
4. Selecione a branch `main` e confirme.

### Se der erro no CI

- Copie o texto do erro da etapa que falhou e me envie.
- Eu te digo exatamente o que ajustar no codigo.
