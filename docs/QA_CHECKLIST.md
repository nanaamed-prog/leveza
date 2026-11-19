# Checklist de QA

Legenda: ✅ verificado automaticamente nesta entrega · 👤 conferir manualmente após publicar

## Critérios de aceitação do documento mestre
1. ✅ Cadastro/login com Supabase; isolamento entre usuários (19 testes de banco/RLS) · 👤 testar com duas contas reais
2. ✅ Dashboard mostra só registros reais ou estados vazios (e2e)
3. ✅ Foto analisada somente com API configurada; revisão antes de salvar · 👤 testar com chave real
4. ✅ Registro manual funciona sem IA (e2e)
5. ✅ IMC e percentuais de macros com casos de borda (unit)
6. ✅ Gasto sem duplicar sono/exercício/repouso; testes com sobreposição de horários e horário de verão
7. ✅ Atividade, sono, peso e água com edição e exclusão
8. ✅ Jejum 12/14/16/18/20/24 h com triagem e bloqueios (unit + banco + e2e)
9. ✅ Modo Lactante sem jejum nem déficit (unit + banco + e2e)
10. ✅ Gráficos com filtros 7/30/90 dias refletindo registros
11. ✅ Build, tipos, lint e testes sem erros · 👤 instalar como app no Android e iPhone
12. ✅ Política de privacidade (rascunho), consentimento, exportação/exclusão e limitações presentes

## Acessibilidade
- ✅ Áreas de toque ≥ 44 px; foco visível laranja; labels associados; erros com `role="alert"` e `aria-describedby`
- ✅ Gráficos e anéis com descrição textual (`aria-label`/`figcaption`)
- ✅ `prefers-reduced-motion` respeitado; zoom permitido
- ✅ Estados nunca só por cor (ícones ✓/– no 5+2, textos nos badges)
- 👤 Teste com TalkBack/VoiceOver e zoom de 200%

## Segurança
- ✅ RLS forçado em todas as tabelas · ✅ Storage privado com caminho validado · ✅ tipo real do upload
- ✅ Chaves só no servidor · ✅ CSP/HSTS · ✅ service worker sem cache de dados
- 👤 Ativar "Leaked password protection" e MFA opcional no Supabase Auth
- 👤 Definir limite de gasto no provedor de IA

## Conteúdo
- ✅ Sem "dia do lixo", "compensar", promessas de emagrecimento ou "peso ideal"
- 👤 Revisão por nutricionista dos textos educativos e da base nutricional
- 👤 Revisão jurídica da política de privacidade
