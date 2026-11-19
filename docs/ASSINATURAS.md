# Assinaturas (Mercado Pago)

| Plano | Mensal (cartão, recorrente) | Anual (Pix ou cartão, até 12×) |
|---|---|---|
| Leveza Grátis | R$ 0 | — |
| Leveza Plus | R$ 19,90 | R$ 149,90 |
| Leveza Plus IA (até 90 análises/mês) | R$ 34,90 | R$ 279,00 |

Preços em `src/lib/plans.ts` (o servidor usa só esses valores). Teste grátis de 7 dias do Plus, uma vez por conta.

## Segurança
- A tabela `subscriptions` é **somente leitura** para o usuário; quem grava é o webhook (service role) ou a função `start_trial()`.
- O webhook valida a assinatura HMAC (`x-signature`) e **busca o pagamento na API do Mercado Pago** antes de liberar o plano; confere o valor pago.
- Limites de IA verificados no servidor (`ai_usage`).
- Triagem, Modo Lactante e avisos de segurança são sempre gratuitos.

## Configurar
1. Mercado Pago → Developers → criar aplicação "Leveza" → **Credenciais de produção** → copiar *Access Token*.
2. Developers → **Webhooks** → URL `https://leveza-one.vercel.app/api/pagamentos/webhook`, eventos **Pagamentos** e **Planos e assinaturas** → salvar e copiar a **assinatura secreta**.
3. Vercel → Settings → Environment Variables: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API Keys → service_role / secret).
4. Redeploy. A tela Assinatura libera os botões automaticamente.
