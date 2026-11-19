# Arquitetura

```
src/
  app/                      rotas (Next.js App Router)
    page.tsx                boas-vindas
    login/  onboarding/  privacidade/
    app/                    área logada (AppShell + barra inferior)
      page.tsx              Início (dashboard)
      alimentacao/ (nova/)  movimento/  sono/  agua/  jejum/  evolucao/
      plano/  habitos/  lactante/  receitas/  relatorios/
      perfil/ (triagem/)  configuracoes/
    api/
      analisar-prato/       IA visual (server-side)
      conta/excluir/        exclusão de conta (service role)
      manutencao/fotos/     retenção de fotos (Vercel Cron)
  components/
    ui/                     Button, Card, Field/Input/Select/ChoiceGroup/Checkbox, Badge, Sheet/ConfirmationDialog
    brand/BrandLogo.tsx     símbolo e logos
    layout/                 AppShell, BottomNavigation, PageHeader, Reminders, ServiceWorkerRegister
    leveza/                 EnergyBalanceCard, MacroRing, MacroProgress, StatCard, ProgressRing,
                            FoodPhotoCapture, FoodItemsEditor (FoodAnalysisReview), ActivityPicker,
                            SleepEditor, FastingTimer, EligibilityNotice, WeightForm, ScreeningForm,
                            PrivacyControls, SignedPhoto, EmptyState, LoadingSkeleton, DayNav, charts
  lib/
    calc/                   regras puras e testadas (IMC, macros, TMB, energia, elegibilidade, sono, peso, jejum)
    data/                   tipos, DataStore (LocalStore | SupabaseStore), provider e hooks
    nutrition/              base nutricional e rascunho de itens
    server/                 auth do servidor, adaptador de IA visual
supabase/migrations/        esquema, RLS, regras de segurança, storage
tests/unit/                 Vitest + Testing Library + PGlite (banco)
e2e/                        Playwright (fluxos em 360 e 430 px)
public/                     ícones, logos, manifest, sw.js, offline.html
```

## Decisões
- **Uma interface de dados** (`DataStore`) com duas implementações: `LocalStore` (Modo demonstração, só no aparelho) e `SupabaseStore` (RLS no servidor). As telas não sabem qual está ativa.
- **Cálculos isolados** em funções puras; a interface só exibe.
- **Segurança em duas camadas**: o cliente explica e esconde; o banco impede.
- **Datas**: UTC no banco, exibição no fuso do perfil; semana começa na segunda (configurável).
- **shadcn/ui**: componentes escritos no mesmo padrão (Radix + CVA + Tailwind), sem depender do CLI.
- **Recharts** para gráficos com paleta da marca (sem verde/vermelho como julgamento).

## Design tokens
Definidos em `src/app/globals.css` (CSS variables + `@theme` do Tailwind 4): `forest #0F5132`, `mineral #2E7D6B`, `sage #A3C9A8`, `orange #F2994A`, `canvas #F6F3EC`, `card #FFFFFF`, `ink #17352A`, `muted #5C6B62`, `line #E3E9E1`, `error #B42318`, `success #28724F`. Para texto laranja com contraste AA usamos `orange-ink #9A4D0C`. Tipografia: Montserrat (títulos) e Nunito Sans (corpo), servidas localmente (@fontsource).
