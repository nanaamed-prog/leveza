# Integrações externas e custos — relação honesta

Preços e limites mudam com frequência; confira sempre as páginas oficiais antes de lançar.

| Serviço | Para quê | Obrigatório? | Custo |
|---|---|---|---|
| **Supabase** | contas, banco, storage de fotos | Sim, para contas reais | Plano gratuito com limites de banco, storage, usuários ativos e **pausa de projetos inativos**; planos pagos para produção. supabase.com/pricing |
| **Vercel** | hospedagem do app e cron diário | Sim (ou outro host Node) | Plano Hobby gratuito é para uso pessoal/não comercial; uso comercial exige plano pago. vercel.com/pricing |
| **Provedor de IA visual** (Anthropic ou OpenAI) | análise de foto do prato | Não — sem ele, o registro manual funciona | **Pago por uso** (por imagem/tokens). Não é gratuito nem ilimitado. Defina limites de gasto no painel do provedor. |
| **USDA FoodData Central** | base nutricional complementar | Não | Gratuito com chave; dados em domínio público |
| **TACO / TBCA** | base nutricional brasileira | Recomendado | Verificar licença/permissão de uso em aplicativo |
| **Upstash/Redis** (opcional) | limite de requisições compartilhado | Não | Plano gratuito com limites |
| **Domínio próprio** | endereço do app | Não | Pago anualmente |

## O que funciona sem nenhuma conta
Modo demonstração completo (dados só no aparelho), cálculos, gráficos, jejum com triagem, Modo Lactante, Plano 5+2, receitas, relatórios e exportação.

## O que depende de configuração
- Contas, sincronização entre aparelhos, exclusão de conta no servidor → Supabase + `SUPABASE_SERVICE_ROLE_KEY`.
- Análise por foto → `AI_VISION_API_KEY` (custo por uso).
- Limpeza automática de fotos de 30 dias → Vercel Cron + `CRON_SECRET`.
- E-mails de confirmação em volume → configurar SMTP próprio no Supabase (o padrão tem limite baixo de envios).
