import { getBrandName } from "@wayline/db";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const brand = await getBrandName();
  return { title: `Política de Privacidade — ${brand}` };
}

export default async function PrivacyPage() {
  const brand = await getBrandName();
  const contact = process.env.LEGAL_CONTACT_EMAIL || "privacidade@exemplo.com.br";

  return (
    <LegalShell brandName={brand} title="Política de Privacidade" updatedAt="26/07/2026">
      <p>
        Esta Política de Privacidade descreve como o <strong>{brand}</strong> coleta, usa,
        armazena e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de
        Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <LegalSection id="controlador" title="1. Controlador dos dados">
        <p>
          O controlador dos dados pessoais tratados nesta plataforma é a empresa operadora do{" "}
          {brand}. Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato
          pelo e-mail <a className="text-brand hover:underline" href={`mailto:${contact}`}>{contact}</a>.
        </p>
      </LegalSection>

      <LegalSection id="dados" title="2. Dados que coletamos">
        <p>Coletamos os seguintes dados, sempre limitados ao necessário para a prestação do serviço:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Cadastro:</strong> nome, e-mail e senha (armazenada de forma criptografada).</li>
          <li><strong>Perfil:</strong> foto (avatar) e workspaces dos quais você participa.</li>
          <li><strong>Conteúdo:</strong> tarefas, comentários, documentos, propostas, contratos, formulários e demais dados que você cria na plataforma.</li>
          <li><strong>Uso:</strong> registros técnicos (logs), data/hora de acesso e endereço IP, para segurança e funcionamento.</li>
          <li><strong>Cookies essenciais:</strong> sessão de login e preferências (ex.: tema claro/escuro).</li>
        </ul>
      </LegalSection>

      <LegalSection id="finalidade" title="3. Para que usamos">
        <ul className="list-disc space-y-1 pl-6">
          <li>Autenticar seu acesso e operar as funcionalidades do serviço.</li>
          <li>Enviar notificações e comunicações relacionadas à sua conta e aos seus workspaces.</li>
          <li>Processar pagamentos de planos, quando aplicável.</li>
          <li>Garantir segurança, prevenir fraudes e cumprir obrigações legais.</li>
        </ul>
        <p>
          As bases legais para o tratamento incluem a execução do contrato, o cumprimento de
          obrigação legal, o legítimo interesse e, quando exigido, o seu consentimento.
        </p>
      </LegalSection>

      <LegalSection id="compartilhamento" title="4. Compartilhamento">
        <p>
          Não vendemos seus dados. Podemos compartilhá-los apenas com operadores necessários à
          prestação do serviço (ex.: infraestrutura de hospedagem, provedor de e-mail e gateway de
          pagamento), sempre sob obrigações de confidencialidade e segurança, ou quando exigido por
          lei ou autoridade competente.
        </p>
      </LegalSection>

      <LegalSection id="armazenamento" title="5. Armazenamento e segurança">
        <p>
          Os dados são armazenados em servidores localizados no Brasil e protegidos por medidas
          técnicas e organizacionais razoáveis (criptografia de senhas, isolamento por workspace e
          controle de acesso). Nenhum sistema é 100% infalível, mas trabalhamos para reduzir riscos.
        </p>
      </LegalSection>

      <LegalSection id="direitos" title="6. Seus direitos (LGPD)">
        <p>Você pode, a qualquer momento:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Confirmar a existência de tratamento e acessar seus dados.</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li><strong>Exportar seus dados</strong> (portabilidade) — disponível em Configurações → Conta.</li>
          <li><strong>Excluir sua conta</strong> e os dados pessoais associados — disponível em Configurações → Conta.</li>
          <li>Revogar consentimento e se opor a tratamentos, quando aplicável.</li>
        </ul>
        <p>
          Também é possível exercer esses direitos pelo e-mail{" "}
          <a className="text-brand hover:underline" href={`mailto:${contact}`}>{contact}</a>.
        </p>
      </LegalSection>

      <LegalSection id="retencao" title="7. Retenção e exclusão">
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa. Ao excluir a conta, removemos ou
          anonimizamos os dados pessoais, exceto aqueles que precisamos reter para cumprir
          obrigações legais (ex.: registros fiscais e de segurança).
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="8. Cookies">
        <p>
          Utilizamos apenas cookies essenciais ao funcionamento (sessão e preferências). Não
          usamos cookies de publicidade de terceiros. Ao continuar navegando, você concorda com o
          uso desses cookies essenciais.
        </p>
      </LegalSection>

      <LegalSection id="alteracoes" title="9. Alterações">
        <p>
          Esta política pode ser atualizada. Alterações relevantes serão comunicadas na plataforma.
          A data no topo indica a versão vigente.
        </p>
      </LegalSection>

      <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-dense">
        <strong>Aviso:</strong> este documento é um modelo inicial e deve ser revisado por um
        advogado, incluindo os dados da empresa (razão social, CNPJ e endereço) e do Encarregado
        (DPO), antes do uso comercial.
      </p>
    </LegalShell>
  );
}
