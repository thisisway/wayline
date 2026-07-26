import { getBrandName } from "@wayline/db";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const brand = await getBrandName();
  return { title: `Termos de Uso — ${brand}` };
}

export default async function TermsPage() {
  const brand = await getBrandName();
  const contact = process.env.LEGAL_CONTACT_EMAIL || "contato@exemplo.com.br";

  return (
    <LegalShell brandName={brand} title="Termos de Uso" updatedAt="26/07/2026">
      <p>
        Estes Termos de Uso regem o acesso e a utilização da plataforma <strong>{brand}</strong>.
        Ao criar uma conta ou usar o serviço, você concorda com estes termos.
      </p>

      <LegalSection id="servico" title="1. O serviço">
        <p>
          O {brand} é uma plataforma de organização e gestão de trabalho (tarefas, documentos,
          propostas, formulários e afins) oferecida no modelo SaaS. Podemos evoluir, alterar ou
          descontinuar funcionalidades a qualquer momento, buscando avisar com antecedência quando
          a mudança for relevante.
        </p>
      </LegalSection>

      <LegalSection id="conta" title="2. Sua conta">
        <ul className="list-disc space-y-1 pl-6">
          <li>Você é responsável por manter a confidencialidade das suas credenciais.</li>
          <li>É necessário fornecer informações verdadeiras e mantê-las atualizadas.</li>
          <li>Você responde pelas atividades realizadas na sua conta e nos seus workspaces.</li>
        </ul>
      </LegalSection>

      <LegalSection id="uso" title="3. Uso aceitável">
        <p>Você concorda em não:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Violar leis, direitos de terceiros ou estes termos.</li>
          <li>Enviar conteúdo ilícito, ofensivo, malicioso ou que infrinja propriedade intelectual.</li>
          <li>Tentar comprometer a segurança, integridade ou disponibilidade do serviço.</li>
          <li>Usar a plataforma para spam ou coleta indevida de dados de terceiros.</li>
        </ul>
      </LegalSection>

      <LegalSection id="conteudo" title="4. Seu conteúdo">
        <p>
          Você mantém a titularidade do conteúdo que insere na plataforma. Você nos concede apenas
          a licença necessária para hospedar, processar e exibir esse conteúdo com o objetivo de
          operar o serviço. Você é o responsável pelo conteúdo do seu workspace.
        </p>
      </LegalSection>

      <LegalSection id="planos" title="5. Planos e pagamento">
        <p>
          Alguns recursos exigem um plano pago. Valores, ciclos de cobrança e limites são
          apresentados no momento da contratação. A falta de pagamento pode resultar em suspensão do
          acesso a recursos pagos. Salvo disposição legal, valores já pagos não são reembolsáveis
          proporcionalmente ao período não utilizado.
        </p>
      </LegalSection>

      <LegalSection id="cancelamento" title="6. Cancelamento e encerramento">
        <p>
          Você pode encerrar sua conta a qualquer momento em Configurações → Conta. Podemos suspender
          ou encerrar contas que violem estes termos. Após o encerramento, seus dados são tratados
          conforme a Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection id="garantias" title="7. Isenção de garantias e limitação de responsabilidade">
        <p>
          O serviço é fornecido “no estado em que se encontra”. Na máxima extensão permitida em lei,
          não nos responsabilizamos por danos indiretos, lucros cessantes ou perda de dados
          decorrentes do uso ou da indisponibilidade do serviço. Recomendamos manter backups do seu
          conteúdo crítico.
        </p>
      </LegalSection>

      <LegalSection id="lei" title="8. Lei aplicável e foro">
        <p>
          Estes termos são regidos pelas leis do Brasil. Fica eleito o foro do domicílio do usuário
          consumidor, quando aplicável, para dirimir controvérsias.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="9. Contato">
        <p>
          Dúvidas sobre estes termos:{" "}
          <a className="text-brand hover:underline" href={`mailto:${contact}`}>{contact}</a>.
        </p>
      </LegalSection>

      <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-dense">
        <strong>Aviso:</strong> este documento é um modelo inicial e deve ser revisado por um
        advogado, incluindo dados da empresa e condições comerciais específicas, antes do uso.
      </p>
    </LegalShell>
  );
}
