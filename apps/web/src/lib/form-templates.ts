import type { FormFieldSchema } from "@wayline/db";

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // nome do ícone lucide (resolvido na UI)
  color: string;
  title: string;
  formDescription: string;
  fields: Array<Omit<FormFieldSchema, "id">>;
}

const f = (
  type: FormFieldSchema["type"],
  label: string,
  opts: Partial<Omit<FormFieldSchema, "id" | "type" | "label">> = {},
): Omit<FormFieldSchema, "id"> => ({
  type,
  label,
  placeholder: opts.placeholder ?? "",
  required: opts.required ?? false,
  options: opts.options ?? [],
});

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "feedback",
    name: "Formulário de feedback",
    description: "Faça pesquisas e colete opiniões",
    icon: "MessageSquareHeart",
    color: "#EC4899",
    title: "Formulário de feedback",
    formDescription: "Sua opinião nos ajuda a melhorar. Leva menos de 1 minuto.",
    fields: [
      f("text", "Nome", { required: true }),
      f("email", "E-mail"),
      f("select", "Como você avalia sua experiência?", {
        required: true,
        options: ["Excelente", "Boa", "Regular", "Ruim"],
      }),
      f("textarea", "Comentários", { placeholder: "Conte o que achou…" }),
    ],
  },
  {
    id: "intake",
    name: "Recebimento do projeto",
    description: "Simplifique as solicitações de novos projetos",
    icon: "FolderPlus",
    color: "#EF4444",
    title: "Solicitação de novo projeto",
    formDescription: "Preencha os detalhes para iniciarmos seu projeto.",
    fields: [
      f("text", "Seu nome", { required: true }),
      f("text", "Empresa"),
      f("email", "E-mail", { required: true }),
      f("select", "Tipo de projeto", {
        required: true,
        options: ["Site", "Identidade visual", "Social media", "Tráfego pago", "Outro"],
      }),
      f("textarea", "Descreva o projeto", { required: true, placeholder: "Objetivo, escopo, prazo…" }),
      f("select", "Orçamento estimado", {
        options: ["Até R$ 5 mil", "R$ 5–15 mil", "R$ 15–50 mil", "Acima de R$ 50 mil"],
      }),
    ],
  },
  {
    id: "order",
    name: "Formulário de pedido",
    description: "Colete e processe os pedidos dos clientes",
    icon: "ShoppingCart",
    color: "#8B5CF6",
    title: "Pedido",
    formDescription: "Informe os detalhes do seu pedido.",
    fields: [
      f("text", "Nome", { required: true }),
      f("email", "E-mail", { required: true }),
      f("phone", "Telefone / WhatsApp"),
      f("text", "Produto ou serviço", { required: true }),
      f("number", "Quantidade"),
      f("textarea", "Observações"),
    ],
  },
  {
    id: "job",
    name: "Candidatura de emprego",
    description: "Aceite e analise candidaturas para vagas em aberto",
    icon: "Briefcase",
    color: "#F59E0B",
    title: "Candidatura",
    formDescription: "Envie seus dados para se candidatar.",
    fields: [
      f("text", "Nome completo", { required: true }),
      f("email", "E-mail", { required: true }),
      f("phone", "Telefone"),
      f("text", "Vaga desejada", { required: true }),
      f("text", "LinkedIn / Portfólio"),
      f("textarea", "Por que devemos te contratar?"),
    ],
  },
  {
    id: "it",
    name: "Solicitações de TI",
    description: "Selecione e priorize as solicitações de serviços de TI",
    icon: "Wrench",
    color: "#0EA5E9",
    title: "Solicitação de TI",
    formDescription: "Descreva o problema ou a solicitação.",
    fields: [
      f("text", "Nome", { required: true }),
      f("email", "E-mail", { required: true }),
      f("select", "Categoria", {
        required: true,
        options: ["Hardware", "Software", "Acesso / Senha", "Rede", "Outro"],
      }),
      f("select", "Prioridade", { options: ["Baixa", "Média", "Alta", "Urgente"] }),
      f("textarea", "Descrição", { required: true }),
    ],
  },
];

export const BLANK_TEMPLATE: FormTemplate = {
  id: "blank",
  name: "Começar do zero",
  description: "Monte seu formulário do jeito que quiser",
  icon: "Plus",
  color: "#64748B",
  title: "Novo formulário",
  formDescription: "",
  fields: [f("text", "Nome", { required: true })],
};
