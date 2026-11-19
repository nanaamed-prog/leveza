import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const metadata = { title: "Política de Privacidade" };

const sections: { h: string; p: string[] }[] = [
  {
    h: "1. Quem somos e o que é o Leveza",
    p: [
      "O Leveza é um diário de bem-estar para registrar alimentação, movimento, sono, água, peso e hábitos. Não é dispositivo médico, não faz diagnóstico e não substitui acompanhamento profissional.",
      "O controlador dos dados é o responsável pela publicação do aplicativo, identificado no rodapé da versão publicada. [Preencher razão social, CNPJ e e-mail do encarregado (DPO) antes do lançamento.]",
    ],
  },
  {
    h: "2. Dados que coletamos (coleta mínima)",
    p: [
      "Conta: e-mail e senha (a senha é guardada de forma criptografada pelo provedor de autenticação).",
      "Perfil: nome de exibição, altura, fuso horário, preferências e objetivos.",
      "Dados de saúde (dados pessoais sensíveis, art. 11 da LGPD): data de nascimento, gestação, amamentação, histórico de transtorno alimentar, diabetes e medicamentos, condições clínicas, peso, refeições, sono, atividades e hidratação.",
      "Fotos de refeições: somente se você autorizar a análise por foto.",
    ],
  },
  {
    h: "3. Para que usamos",
    p: [
      "Mostrar seus registros, calcular estimativas (IMC, macros, gasto energético) e aplicar regras de segurança, como bloquear jejum quando não for adequado.",
      "Base legal: consentimento específico e destacado para dados de saúde e para fotos. Você pode revogar a qualquer momento em Configurações.",
    ],
  },
  {
    h: "4. Fotos e inteligência artificial",
    p: [
      "Quando você usa a análise por foto, a imagem é enviada pelo nosso servidor a um provedor de IA visual somente para identificar alimentos e estimar porções. A chave do provedor nunca fica no seu aparelho.",
      "Por padrão, a foto NÃO é guardada depois da análise. Você pode escolher guardá-la por 30 dias ou até excluir. Fotos guardadas ficam em armazenamento privado, acessível apenas por links temporários.",
      "Suas fotos não são usadas para treinar modelos sem um consentimento separado, desligado por padrão. Consulte também os termos do provedor de IA configurado.",
    ],
  },
  {
    h: "5. Compartilhamento",
    p: [
      "Não vendemos dados. Operadores necessários: hospedagem (ex.: Vercel), banco de dados e autenticação (Supabase) e, se você usar a análise por foto, o provedor de IA configurado. Esses serviços podem processar dados fora do Brasil, com salvaguardas contratuais.",
    ],
  },
  {
    h: "6. Retenção",
    p: [
      "Seus registros ficam guardados enquanto a conta existir. Ao excluir a conta, apagamos seus dados e fotos; cópias de segurança do provedor são eliminadas no ciclo de retenção dele (documentado no README do projeto).",
      "Fotos seguem a opção escolhida: não guardar (padrão), 30 dias ou até você excluir.",
    ],
  },
  {
    h: "7. Seus direitos",
    p: [
      "Confirmar e acessar seus dados, corrigir, exportar (portabilidade), excluir, revogar consentimentos e obter informações sobre compartilhamento. Exportação e exclusão estão em Perfil → Configurações → Privacidade.",
    ],
  },
  {
    h: "8. Segurança",
    p: [
      "Conexões criptografadas (HTTPS), isolamento por usuário no banco de dados (Row Level Security), armazenamento privado de fotos, registros de erro sem dados de saúde e nenhum cache de dados pessoais no aparelho pelo service worker.",
      "No Modo demonstração, os dados ficam apenas no armazenamento local do seu navegador e podem ser apagados a qualquer momento.",
    ],
  },
];

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" aria-label="Início">
        <BrandLogo />
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-muted">
        Versão 2026-11-v1 · rascunho para revisão jurídica antes da publicação
      </p>
      <div className="mt-6 space-y-6">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-lg font-semibold text-forest">{s.h}</h2>
            {s.p.map((t) => (
              <p key={t} className="mt-2 text-[0.95rem] leading-relaxed text-ink">
                {t}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
