# Publicação passo a passo (Supabase + Vercel) — pode ser feita só pelo celular

Tempo estimado: 30–45 minutos. Você vai precisar de contas gratuitas no GitHub, Supabase e Vercel (os planos gratuitos têm limites; veja `INTEGRACOES_E_CUSTOS.md`).

## 1. Colocar o código no GitHub

1. No navegador do celular, entre em github.com → **New repository** → nome `leveza` → **Private** → Create.
2. Toque em **uploading an existing file** e envie o conteúdo do .zip descompactado (no celular, apps como "Arquivos"/"Files" descompactam).
   - Alternativa: peça ao Claude para enviar direto ao seu repositório (ele pode fazer o *push* se o GitHub estiver conectado).

## 2. Criar o banco no Supabase

1. supabase.com → **New project** → região **South America (São Paulo)** → defina uma senha forte.
2. Menu **SQL Editor** → **New query**. Cole e execute, **nesta ordem**, o conteúdo de cada arquivo da pasta `supabase/migrations/`:
   1. `20261119000001_schema.sql`
   2. `20261119000002_rls.sql`
   3. `20261119000003_safety.sql`
   4. `20261119000004_storage.sql`
   > Não execute `tests/db/supabase-shim.sql` — ele só simula o Supabase nos testes.
3. **Authentication → Providers → Email**: deixe ativo e com **Confirm email** ligado.
4. **Authentication → URL Configuration**: em *Site URL* coloque o endereço da Vercel (passo 3) e adicione `https://SEU-APP.vercel.app/app` em *Redirect URLs*.
5. **Project Settings → API**: copie `Project URL`, `anon public` e `service_role` (esta última é secreta: nunca coloque no app nem compartilhe).

## 3. Publicar na Vercel

1. vercel.com → **Add New → Project** → importe o repositório `leveza`.
2. Em **Environment Variables**, adicione:

| Variável | Valor | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public | pública (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role | **secreta** — só servidor (exclusão de conta e limpeza de fotos) |
| `CRON_SECRET` | texto aleatório longo | protege a limpeza diária de fotos |
| `AI_VISION_PROVIDER` | `anthropic` ou `openai` | opcional |
| `AI_VISION_API_KEY` | sua chave | opcional, **tem custo por uso** |
| `AI_VISION_MODEL` | ex.: `claude-sonnet-5-5` | opcional |

3. **Deploy**. Ao terminar, abra o endereço, crie sua conta e confirme pelo e-mail.

## 4. Instalar no celular

- **Android (Chrome)**: menu ⋮ → **Instalar app**.
- **iPhone (Safari)**: Compartilhar → **Adicionar à Tela de Início**.

## 5. Conferências após publicar

- [ ] Criar duas contas de teste e confirmar que uma não vê os registros da outra.
- [ ] Na conta de teste, marcar "amamentando" na triagem e verificar que o jejum some e o Modo Lactante aparece.
- [ ] Sem chave de IA, a tela de foto informa que a análise não está configurada e o registro manual funciona.
- [ ] Exportar dados e excluir a conta de teste.

## Prévia sem servidor

`npm run build:preview` gera uma versão estática em `out/` que roda só em Modo demonstração (sem contas, sem IA). `npm run preview:artifact` adapta essa pasta para hosts que não aceitam caminhos iniciados por "_".
