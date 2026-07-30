/**
 * Templates de projeto (galeria). Cada um vira uma Lista com colunas e tarefas
 * de exemplo. `kind` casa com os status do board (open|active|done).
 */
export interface TemplateColumn {
  name: string;
  kind: "open" | "active" | "done";
  color: string;
}
export interface TemplateTask {
  title: string;
  col: number; // índice da coluna
  description?: string;
}
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // nome de ícone lucide (resolvido na UI)
  color: string;
  listName: string;
  columns: TemplateColumn[];
  tasks: TemplateTask[];
}

const OPEN = "#94A3B8", DOING = "#1D66FF", DONE = "#17C86A", REVIEW = "#FFB800";

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "social",
    name: "Social Media",
    description: "Calendário de conteúdo: da ideia ao publicado.",
    icon: "Instagram",
    color: "#EC4899",
    listName: "Social Media",
    columns: [
      { name: "Ideias", kind: "open", color: OPEN },
      { name: "Produção", kind: "active", color: DOING },
      { name: "Aprovação", kind: "active", color: REVIEW },
      { name: "Publicado", kind: "done", color: DONE },
    ],
    tasks: [
      { title: "Planejar pauta do mês", col: 0 },
      { title: "Carrossel — 5 dicas", col: 1, description: "Copy + design + revisão." },
      { title: "Reels da semana", col: 1 },
      { title: "Enviar para aprovação do cliente", col: 2 },
    ],
  },
  {
    id: "ads",
    name: "Tráfego Pago",
    description: "Gestão de campanhas: briefing, criativos e otimização.",
    icon: "TrendingUp",
    color: "#1D66FF",
    listName: "Tráfego Pago",
    columns: [
      { name: "Briefing", kind: "open", color: OPEN },
      { name: "Criativos", kind: "active", color: DOING },
      { name: "No ar", kind: "active", color: REVIEW },
      { name: "Otimização", kind: "done", color: DONE },
    ],
    tasks: [
      { title: "Definir objetivo e público", col: 0 },
      { title: "Produzir criativos (3 variações)", col: 1 },
      { title: "Subir campanha", col: 2 },
      { title: "Analisar métricas e escalar", col: 3 },
    ],
  },
  {
    id: "video",
    name: "Produção de Vídeo",
    description: "Do roteiro à entrega final.",
    icon: "Clapperboard",
    color: "#7C5CFF",
    listName: "Produção de Vídeo",
    columns: [
      { name: "Roteiro", kind: "open", color: OPEN },
      { name: "Gravação", kind: "active", color: DOING },
      { name: "Edição", kind: "active", color: DOING },
      { name: "Aprovação", kind: "active", color: REVIEW },
      { name: "Entregue", kind: "done", color: DONE },
    ],
    tasks: [
      { title: "Escrever roteiro", col: 0 },
      { title: "Agendar gravação", col: 1 },
      { title: "Primeiro corte", col: 2 },
      { title: "Enviar para aprovação", col: 3 },
    ],
  },
  {
    id: "web",
    name: "Site / Web",
    description: "Projeto de site: design, dev e go-live.",
    icon: "Globe",
    color: "#0EA5E9",
    listName: "Projeto Web",
    columns: [
      { name: "Backlog", kind: "open", color: OPEN },
      { name: "Design", kind: "active", color: DOING },
      { name: "Desenvolvimento", kind: "active", color: DOING },
      { name: "QA", kind: "active", color: REVIEW },
      { name: "No ar", kind: "done", color: DONE },
    ],
    tasks: [
      { title: "Mapa do site e requisitos", col: 0 },
      { title: "Wireframe + UI", col: 1 },
      { title: "Implementar páginas", col: 2 },
      { title: "Testes e revisão final", col: 3 },
    ],
  },
  {
    id: "onboarding",
    name: "Onboarding de Cliente",
    description: "Checklist para receber um cliente novo.",
    icon: "UserPlus",
    color: "#17C86A",
    listName: "Onboarding — Novo Cliente",
    columns: [
      { name: "A fazer", kind: "open", color: OPEN },
      { name: "Fazendo", kind: "active", color: DOING },
      { name: "Feito", kind: "done", color: DONE },
    ],
    tasks: [
      { title: "Reunião de kickoff", col: 0 },
      { title: "Coletar acessos e materiais", col: 0 },
      { title: "Definir metas e cronograma", col: 0 },
      { title: "Configurar relatórios", col: 0 },
    ],
  },
  {
    id: "content",
    name: "Conteúdo / Blog",
    description: "Pipeline editorial da pauta ao publicado.",
    icon: "PenLine",
    color: "#F59E0B",
    listName: "Conteúdo",
    columns: [
      { name: "Pauta", kind: "open", color: OPEN },
      { name: "Escrevendo", kind: "active", color: DOING },
      { name: "Revisão", kind: "active", color: REVIEW },
      { name: "Publicado", kind: "done", color: DONE },
    ],
    tasks: [
      { title: "Levantar pautas do mês", col: 0 },
      { title: "Escrever artigo pilar", col: 1 },
      { title: "Revisar e otimizar SEO", col: 2 },
    ],
  },
];
