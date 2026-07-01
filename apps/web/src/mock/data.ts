import type {
  BoardColumn,
  ClientRef,
  HomeItem,
  Person,
  PresenceUser,
  SpaceNav,
} from "./types";

// --- Pessoas ---------------------------------------------------------------
export const people = {
  ana: { id: "u1", name: "Ana Rocha" },
  bruno: { id: "u2", name: "Bruno Lima" },
  carla: { id: "u3", name: "Carla Nunes" },
  diego: { id: "u4", name: "Diego Farias" },
  eva: { id: "u5", name: "Eva Prado" },
  felipe: { id: "u6", name: "Felipe Souza" },
} satisfies Record<string, Person>;

export const currentUser: Person = people.ana;

// --- Clientes (cidadão de primeira classe) ---------------------------------
export const clients = {
  acme: { id: "c1", name: "Acme Co.", color: "#1D66FF" },
  novva: { id: "c2", name: "Novva Bank", color: "#17C86A" },
  lumen: { id: "c3", name: "Lumen Foods", color: "#FFB800" },
} satisfies Record<string, ClientRef>;

// --- Workspace / topbar ----------------------------------------------------
export const workspaces = [
  { id: "w1", name: "Wayline Studio", plan: "Growth" },
  { id: "w2", name: "Norte Digital", plan: "Free" },
];

export const activeWorkspace = workspaces[0]!;

// --- Painel Home -----------------------------------------------------------
export const homeItems: HomeItem[] = [
  { id: "inbox", label: "Inbox", icon: "inbox", count: 8 },
  { id: "replies", label: "Replies", icon: "reply", count: 2 },
  { id: "assigned", label: "Assigned Comments", icon: "comment", count: 3 },
  { id: "tasks", label: "My Tasks", icon: "check", count: 12 },
  { id: "more", label: "More", icon: "more" },
];

// --- Spaces ----------------------------------------------------------------
export const spaces: SpaceNav[] = [
  {
    id: "s1",
    name: "Marketing",
    color: "#1D66FF",
    lists: [
      { id: "l1", name: "Launch Campaign", count: 14 },
      { id: "l2", name: "Content Calendar", count: 9 },
      { id: "l3", name: "Paid Media", count: 6 },
    ],
  },
  {
    id: "s2",
    name: "Product",
    color: "#7C5CFF",
    lists: [
      { id: "l4", name: "Roadmap", count: 21 },
      { id: "l5", name: "Discovery", count: 5 },
    ],
  },
  {
    id: "s3",
    name: "Quality Engineering",
    color: "#17C86A",
    lists: [
      { id: "l6", name: "Regression", count: 7 },
      { id: "l7", name: "Bug Triage", count: 4 },
    ],
  },
];

export const activeSpaceId = "s1";
export const activeListName = "Launch Campaign";

// --- Board (Kanban) --------------------------------------------------------
export const board: BoardColumn[] = [
  {
    id: "col-open",
    name: "Open",
    kind: "open",
    color: "#94A3B8",
    cards: [
      {
        id: "t1",
        title: "Definir posicionamento da campanha de lançamento",
        client: clients.acme,
        assignees: [people.bruno, people.carla],
        priority: "high",
        dueLabel: "3 Jul",
        tags: [{ label: "Estratégia", color: "#1D66FF" }],
        attachments: 2,
        comments: 4,
        subtasks: { done: 1, total: 4 },
      },
      {
        id: "t2",
        title: "Briefing de criativos para social",
        client: clients.lumen,
        assignees: [people.diego],
        priority: "normal",
        dueLabel: "5 Jul",
        tags: [{ label: "Conteúdo", color: "#FFB800" }],
        attachments: 0,
        comments: 1,
      },
      {
        id: "t3",
        title: "Mapear personas e canais de aquisição",
        client: clients.novva,
        assignees: [people.eva, people.felipe],
        priority: "low",
        dueLabel: "9 Jul",
        tags: [{ label: "Pesquisa", color: "#7C5CFF" }],
        attachments: 1,
        comments: 0,
      },
    ],
  },
  {
    id: "col-progress",
    name: "In Progress",
    kind: "active",
    color: "#1D66FF",
    cards: [
      {
        id: "t4",
        title: "Marketing Launch Brief — redação do documento mestre",
        client: clients.acme,
        assignees: [people.ana, people.bruno],
        priority: "urgent",
        dueLabel: "Hoje",
        tags: [
          { label: "Doc", color: "#1D66FF" },
          { label: "IA", color: "#7C5CFF" },
        ],
        attachments: 5,
        comments: 12,
        subtasks: { done: 3, total: 6 },
      },
      {
        id: "t5",
        title: "Produzir 6 variações de anúncio para Meta Ads",
        client: clients.lumen,
        assignees: [people.diego, people.carla],
        priority: "high",
        dueLabel: "2 Jul",
        overdue: true,
        tags: [{ label: "Paid", color: "#FFB800" }],
        attachments: 8,
        comments: 3,
      },
    ],
  },
  {
    id: "col-review",
    name: "In Review",
    kind: "review",
    color: "#FFB800",
    cards: [
      {
        id: "t6",
        title: "Landing page — revisão de copy e QA",
        client: clients.novva,
        assignees: [people.felipe],
        priority: "normal",
        dueLabel: "4 Jul",
        tags: [{ label: "Web", color: "#17C86A" }],
        attachments: 3,
        comments: 6,
        subtasks: { done: 5, total: 5 },
      },
      {
        id: "t7",
        title: "Aprovar calendário de conteúdo — Julho",
        client: clients.acme,
        assignees: [people.ana],
        priority: "high",
        dueLabel: "Amanhã",
        tags: [{ label: "Aprovação", color: "#1D66FF" }],
        attachments: 1,
        comments: 2,
      },
    ],
  },
];

// --- Presença ao vivo (mock) ----------------------------------------------
export const presence: PresenceUser[] = [
  { ...people.bruno, color: "#17C86A", x: 34, y: 28, active: true },
  { ...people.carla, color: "#FFB800", x: 68, y: 52, active: true },
  { ...people.diego, color: "#7C5CFF", x: 52, y: 74, active: false },
];

// --- Doc panel + IA --------------------------------------------------------
export const docBrief = {
  title: "Marketing Launch Brief",
  client: clients.acme,
  updatedLabel: "editado há 4 min",
  agent: { name: "Doc Brief Agent", status: "Gerando seções…" },
  collaborators: [people.ana, people.bruno, people.carla],
  sections: [
    {
      heading: "Objetivo",
      body: "Posicionar o lançamento da Acme Co. como a alternativa mais rápida de gerar valor, destacando time-to-value e prova social.",
    },
    {
      heading: "Público-alvo",
      body: "Heads de marketing em agências e times in-house de médio porte no Brasil.",
    },
    {
      heading: "Mensagens-chave",
      body: "1) Do briefing ao entregável aprovado em dias, não semanas. 2) Cliente no centro. 3) IA embutida no fluxo.",
    },
  ],
};

export const executiveSummary = {
  title: "Executive Summary",
  generatedBy: "Wayline Brain",
  updatedLabel: "atualizado agora",
  bullets: [
    "Campanha de lançamento está 62% concluída; 2 tarefas em revisão aguardam aprovação do cliente.",
    "Risco: variações de Meta Ads da Lumen Foods estão atrasadas (venceram em 2 Jul).",
    "Próximo marco: aprovação do calendário de conteúdo de Julho até amanhã.",
  ],
  metrics: [
    { label: "Progresso", value: "62%" },
    { label: "Em revisão", value: "2" },
    { label: "Atrasadas", value: "1" },
  ],
};
