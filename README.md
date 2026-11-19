# Leveza — Seu equilíbrio, todos os dias

PWA mobile-first para acompanhar **alimentação, movimento, sono, água, peso e hábitos** com linguagem clara e gentil, triagem de segurança e privacidade (LGPD).

> O Leveza é um diário de bem-estar. **Não é dispositivo médico** e não substitui acompanhamento profissional. Calorias, macros, gasto e porções por foto são estimativas.

## O que já funciona

| Área | Status |
|---|---|
| Identidade visual (logos SVG originais, ícones, splash, tokens) | ✅ |
| PWA (manifest, ícones maskable, service worker que só guarda arquivos públicos) | ✅ |
| Login/cadastro com Supabase · Modo demonstração sem servidor | ✅ |
| Onboarding: consentimentos → triagem → perfil → objetivo | ✅ |
| Dashboard com dados reais (balanço energético, macros, água, sono, movimento, peso, hábitos) | ✅ |
| Alimentação: busca manual, alimento personalizado, editar/duplicar/excluir, histórico por refeição | ✅ |
| Foto do prato com IA (rota no servidor) + revisão obrigatória dos itens | ✅ código pronto · requer chave de IA |
| Movimento (16 modalidades, MET, edição/exclusão, totais e gráfico) | ✅ |
| Sono (duração efetiva, médias 7/30 dias, regularidade, padrão exploratório) | ✅ |
| Água (copos, meta ajustável, aviso de excesso) | ✅ |
| Jejum 12/14/16/18/20/24 h com bloqueios por triagem, cronômetro, educação e quebra de jejum | ✅ |
| Modo Lactante (sem jejum, sem déficit) | ✅ |
| Plano 5+2, receitas, relatórios com gráficos e exportação CSV | ✅ |
| Privacidade: exportação JSON, exclusão da conta, retenção de fotos, consentimentos versionados | ✅ |
| Banco: migrações SQL, RLS em todas as tabelas, regras de jejum/meta no banco, Storage privado | ✅ testado |
| Exportação em PDF, leitura de código de barras, notificações push em segundo plano | 🔜 próximas fases |

## Verificações executadas

```
npm run typecheck   # TypeScript estrito — sem erros
npm run lint        # ESLint — sem erros
npm test            # 92 testes (cálculos, componentes, relatórios, base nutricional e 19 testes de banco/RLS)
npm run build       # build de produção — 25 rotas (páginas, API e manifest)
npm run test:e2e    # Playwright: fluxo completo em 360 px e 430 px (requer Chromium)
```

Os testes de banco rodam as **migrações reais** em um Postgres embutido (PGlite) e comprovam que uma pessoa não lê, altera, apaga nem "rouba" dados de outra.

## Como rodar no computador

```bash
npm install
cp .env.example .env.local   # deixe vazio para o Modo demonstração
npm run dev                  # http://localhost:3000
```

## Publicar de verdade (dá para fazer pelo celular)

Siga **[docs/DEPLOY.md](docs/DEPLOY.md)**: GitHub → Supabase (colar as migrações no SQL Editor) → Vercel (variáveis de ambiente). Tudo pelo navegador.

## Documentação

- [docs/ARQUITETURA.md](docs/ARQUITETURA.md) — pastas, camadas, componentes, rotas
- [docs/FORMULAS_E_FONTES.md](docs/FORMULAS_E_FONTES.md) — IMC, macros, Mifflin–St Jeor, gasto sem dupla contagem, fontes nutricionais
- [docs/PRIVACIDADE_E_SEGURANCA.md](docs/PRIVACIDADE_E_SEGURANCA.md) — LGPD, RLS, fotos, retenção, triagem
- [docs/INTEGRACOES_E_CUSTOS.md](docs/INTEGRACOES_E_CUSTOS.md) — o que depende de contas ou custos externos
- [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) — checklist de qualidade e o que foi verificado

## Pendências honestas

1. **Base nutricional**: a tabela inicial (48 alimentos) tem valores aproximados de referência e precisa ser conferida/importada da TACO/TBCA ou USDA antes do lançamento.
2. **Política de privacidade**: rascunho; falta preencher controlador, CNPJ e encarregado (DPO) e passar por revisão jurídica.
3. **Análise por foto**: só funciona com `AI_VISION_API_KEY` configurada (tem custo por uso).
4. **Limite de requisições** da IA é por instância; em produção com muito tráfego, use um limitador compartilhado (ex.: Upstash).
5. Lembretes funcionam com o app aberto; push em segundo plano ficou para uma fase seguinte.
