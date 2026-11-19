# Privacidade e segurança

## Triagem e bloqueios (cliente **e** banco)
Regras em `src/lib/calc/eligibility.ts` (cliente) e `supabase/migrations/…_safety.sql` (banco). Princípio: **ausência de resposta não é autorização**.

| Situação | Jejum | Déficit automático | Meta de perda de peso |
|---|---|---|---|
| Triagem incompleta / sem consentimento | bloqueado | bloqueado | bloqueada |
| Menor de 18 anos | bloqueado | bloqueado | bloqueada |
| Gestante | bloqueado | bloqueado | bloqueada |
| Lactante (Modo Lactante) | bloqueado | bloqueado | bloqueada |
| Transtorno alimentar atual/prévio/"prefiro não dizer" | bloqueado | bloqueado | bloqueada |
| Diabetes, "não sei" ou remédio com risco de hipoglicemia | bloqueado | bloqueado | permitida |
| Condição clínica relevante | bloqueado | bloqueado | permitida |
| IMC < 18,5 | bloqueado | bloqueado | bloqueada |
| Adulto elegível | 12/14/16 h; 18/20 h com confirmação profissional; 24 h com confirmação específica | até 15%, com piso | permitida |

No banco: gatilho bloqueia início de jejum inelegível, impede alterar protocolo de sessão existente, garante um único jejum ativo, bloqueia meta "perder" inelegível e **encerra jejum ativo** quando uma nova triagem deixa de permitir.

## Isolamento de dados (RLS)
- RLS **ativado e forçado** em todas as 16 tabelas; políticas `user_id = auth.uid()`.
- Itens filhos (`food_items`, `recipe_items`) exigem que o registro-pai seja do mesmo usuário.
- Triagem e consentimentos são **somente inclusão** (histórico auditável).
- Papel `anon` sem acesso a nenhuma tabela.
- Testado em `tests/unit/rls.test.ts` (leitura, inserção, atualização, exclusão e transferência cruzadas).

## Fotos
- Compressão no aparelho (máx. 1280 px, JPEG) — remove metadados EXIF, como localização.
- Servidor confere tamanho (≤ 5 MB) e **tipo real pelos bytes**; nome de arquivo fixo `<user_id>/<entry_id>.jpg`.
- Padrão: **não guardar**. Opções: 30 dias (limpeza diária via Vercel Cron) ou até excluir.
- Bucket privado; exibição por **URL assinada de 5 minutos**.
- Uso para treinamento de modelos exige consentimento separado, desligado por padrão.

## Chaves e servidor
- Chave de IA e `service_role` existem **apenas no servidor**.
- Rotas de API validam o token do usuário; limite de 10 análises/minuto por usuário.
- Logs sem imagens, sem conteúdo de respostas e sem dados de saúde.
- Cabeçalhos: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.

## PWA
O service worker só armazena arquivos públicos (`/_next/static`, ícones, marca). Nunca intercepta Supabase, `/api` ou outras origens; navegação usa rede primeiro, com página offline genérica.

## LGPD — direitos implementados
Consentimento específico e versionado (termos, saúde, fotos, treinamento) · revisão da triagem · exportação JSON · exclusão da conta e fotos · política de privacidade (rascunho a revisar) · coleta mínima.

## Retenção
Registros: enquanto a conta existir. Exclusão de conta: apaga fotos do Storage e o usuário (cascata nas tabelas). Backups do Supabase seguem o ciclo do plano contratado — documentar na política final.
