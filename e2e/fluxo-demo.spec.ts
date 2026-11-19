import { test, expect, type Page } from "@playwright/test";

/** Fluxo completo no Modo demonstração (sem Supabase): onboarding → registros → regras de segurança. */

async function onboard(page: Page, opts: { breastfeeding?: boolean } = {}) {
  await page.goto("/");
  await page.getByRole("link", { name: "Começar" }).click();
  await page.getByRole("button", { name: "Entrar no modo demonstração" }).click();
  await expect(page.getByRole("heading", { name: "Consentimento" })).toBeVisible();
  await page.getByText("Li e aceito os termos").click();
  await page.getByText("Autorizo o tratamento dos meus dados de saúde").click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Data de nascimento").fill("1990-05-10");
  const answer = async (legend: string, option: string) =>
    page.getByRole("group", { name: legend }).getByText(option, { exact: true }).click();
  await answer("Você está gestante?", "Não");
  await answer("Você está amamentando?", opts.breastfeeding ? "Sim" : "Não");
  await answer("Você tem ou já teve algum transtorno alimentar?", "Não");
  await answer("Você tem diabetes?", "Não");
  await answer("Usa medicamentos que podem causar hipoglicemia?", "Não");
  await page.getByText("Nenhuma destas").click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Como podemos te chamar?").fill("Ana");
  await page.getByLabel("Altura (cm)").fill("165");
  await page.getByLabel("Peso atual (kg)").fill("68,5");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  await page.getByRole("button", { name: "Ir para o início" }).click();
  await expect(page.getByRole("heading", { name: /Ana/ })).toBeVisible();
}

test("onboarding, registros e dashboard real", async ({ page }) => {
  await onboard(page);
  await expect(page.getByText("Modo demonstração — dados salvos só neste aparelho")).toBeVisible();
  await expect(page.getByText("Nenhuma refeição registrada hoje")).toBeVisible();
  await page.screenshot({ path: "test-results/01-dashboard-vazio.png", fullPage: true });

  // Água
  await page.getByRole("link", { name: "Registrar água" }).click();
  await page.getByRole("button", { name: "300 ml" }).click();
  await expect(page.getByRole("img", { name: /Hidratação/ })).toBeVisible();
  await expect(page.getByText("300", { exact: true }).first()).toBeVisible();

  // Refeição manual
  await page.goto("/app/alimentacao/nova");
  await page.getByLabel("Buscar na base nutricional").fill("arroz branco");
  await page.getByRole("button", { name: /Arroz branco cozido/ }).click();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByLabel("Buscar na base nutricional").fill("feijao carioca");
  await page.getByRole("button", { name: /Feijão carioca cozido/ }).click();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.screenshot({ path: "test-results/02-nova-refeicao.png", fullPage: true });
  await page.getByRole("button", { name: "Salvar refeição" }).click();
  await expect(page.getByRole("heading", { name: "Alimentação" })).toBeVisible();
  await expect(page.getByText("Arroz branco cozido")).toBeVisible();
  await page.screenshot({ path: "test-results/03-alimentacao.png", fullPage: true });

  // Dashboard reflete
  await page.getByRole("link", { name: "Início" }).click();
  await expect(page.getByText("kcal consumidas")).toBeVisible();
  await expect(page.getByText("Gasto estimado até agora")).toBeVisible();
  await page.screenshot({ path: "test-results/04-dashboard.png", fullPage: true });

  // Jejum disponível com protocolos e bloqueio de 18 h sem confirmação
  await page.goto("/app/jejum");
  await expect(page.getByRole("button", { name: "Iniciar jejum de 12 h" })).toBeEnabled();
  await page.getByRole("button", { name: /^18 h/ }).click();
  await expect(page.getByRole("button", { name: "Iniciar jejum de 18 h" })).toBeDisabled();
  await page.getByRole("button", { name: /^16 h/ }).click();
  await page.getByRole("button", { name: "Iniciar jejum de 16 h" }).click();
  await expect(page.getByText("Tempo decorrido")).toBeVisible();
  await page.screenshot({ path: "test-results/05-jejum.png", fullPage: true });

  // Atividade
  await page.goto("/app/movimento?novo=1");
  await page.getByRole("button", { name: "Registrar atividade" }).last().click();
  await expect(page.getByText(/Caminhada/).first()).toBeVisible();

  // Navegação inferior acessível
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link"),
  ).toHaveCount(5);
});

test("lactante: jejum bloqueado e modo dedicado", async ({ page }) => {
  await onboard(page, { breastfeeding: true });
  await expect(page.getByText("Modo Lactante ativo")).toBeVisible();
  await page.goto("/app/jejum");
  await expect(page.getByText("Indisponível durante a amamentação")).toBeVisible();
  await expect(page.getByRole("button", { name: /Iniciar jejum/ })).toHaveCount(0);
  await page.goto("/app/lactante");
  await expect(page.getByRole("heading", { name: "Modo Lactante" })).toBeVisible();
  await page.screenshot({ path: "test-results/06-lactante.png", fullPage: true });
});

test("descrever refeição por texto encontra os alimentos", async ({ page }) => {
  await onboard(page);
  await page.getByRole("link", { name: "Falar ou escrever refeição" }).click();
  await page
    .getByLabel("O que você comeu?")
    .fill("2 ovos, 1 pão francês com manteiga e um copo de leite");
  await page.getByRole("button", { name: "Encontrar alimentos" }).click();
  await expect(page.getByText("Pronto! Confira as porções")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nome do alimento" })).toHaveCount(4);
  await page.screenshot({ path: "test-results/07-descrever.png", fullPage: true });
  await page.getByRole("button", { name: "Salvar refeição" }).click();
  await expect(page.getByText("Pão francês")).toBeVisible();
});

test("meu intestino: registro rápido e detalhado", async ({ page }) => {
  await onboard(page);
  await page.getByRole("link", { name: /Meu intestino/ }).click();
  await page.getByRole("button", { name: "Fui ao banheiro agora" }).click();
  await expect(page.getByText("Registrado agora")).toBeVisible();
  await page.getByRole("button", { name: "Registrar com detalhes" }).click();
  await page.getByRole("button", { name: /Alongado, liso e macio/ }).click();
  await expect(page.getByText("Faixa geralmente considerada de referência.")).toBeVisible();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Tipo 4")).toBeVisible();
  await expect(page.getByText("2×")).toBeVisible();
  await page.screenshot({ path: "test-results/08-intestino.png", fullPage: true });
});

test("meia porção e alimentos do dia a dia", async ({ page }) => {
  await onboard(page);
  await page.goto("/app/alimentacao/nova");
  await page.getByLabel("Buscar na base nutricional").fill("pão de forma");
  await page.getByRole("button", { name: /Pão de forma tradicional/ }).click();
  await page.getByRole("button", { name: "½", exact: true }).click();
  await expect(page.getByLabel("Quantidade (g)")).toHaveValue("12.5");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByRole("button", { name: /Dobrar a porção/ }).click();
  await expect(page.getByLabel("Porção (g)")).toHaveValue("25");
  await page.getByRole("button", { name: /Metade da porção/ }).click();
  await expect(page.getByLabel("Porção (g)")).toHaveValue("12.5");
});

async function mealYesterday(page: Page) {
  await page.goto("/app/alimentacao/nova");
  const d = new Date(Date.now() - 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  await page.getByLabel("Data e hora").fill(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00`);
  await page.getByLabel("Buscar na base nutricional").fill("arroz branco");
  await page.getByRole("button", { name: /Arroz branco cozido/ }).click();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByRole("button", { name: "Salvar refeição" }).click();
  await expect(page.getByRole("heading", { name: "Alimentação" })).toBeVisible();
}

test("saldo acumulado e peso estimado (7.700 kcal ≈ 1 kg)", async ({ page }) => {
  await onboard(page);
  await mealYesterday(page);
  await page.getByRole("link", { name: "Evolução" }).click();
  await expect(page.getByText("Peso estimado pelo saldo")).toBeVisible();
  await expect(page.getByText(/Saldo em 1 dia/)).toBeVisible();
  await page.screenshot({ path: "test-results/09-saldo.png", fullPage: true });
});

test("lactante: saldo aparece, estimativa de perda de peso não", async ({ page }) => {
  await onboard(page, { breastfeeding: true });
  await mealYesterday(page);
  await page.getByRole("link", { name: "Evolução" }).click();
  await expect(page.getByText(/Saldo em 1 dia/)).toBeVisible();
  await expect(page.getByText("Peso estimado pelo saldo")).toHaveCount(0);
});

test("editar meta diária de calorias pelo início", async ({ page }) => {
  await onboard(page);
  await page.getByRole("button", { name: "Definir meta diária de calorias" }).click();
  await page.getByLabel("Meta (kcal por dia)").fill("900");
  await page.getByRole("button", { name: "Salvar meta" }).click();
  await expect(page.getByText(/Use um valor entre/)).toBeVisible();
  await page.getByLabel("Meta (kcal por dia)").fill("1800");
  await page.getByRole("button", { name: "Salvar meta" }).click();
  await expect(page.getByText("meta 1.800")).toBeVisible();
  await page.getByRole("button", { name: /Editar meta diária \(1\.800 kcal\)/ }).click();
  await page.getByRole("button", { name: "+100" }).click();
  await page.getByRole("button", { name: "Salvar meta" }).click();
  await expect(page.getByText("meta 1.900")).toBeVisible();
});

test("lactante: meta não pode ficar abaixo do gasto estimado", async ({ page }) => {
  await onboard(page, { breastfeeding: true });
  await page.getByRole("button", { name: "Definir meta diária de calorias" }).click();
  await page.getByLabel("Meta (kcal por dia)").fill("1300");
  await page.getByRole("button", { name: "Salvar meta" }).click();
  await expect(page.getByText(/não pode ficar abaixo do gasto estimado/)).toBeVisible();
});

test("tela de assinatura mostra os três planos", async ({ page }) => {
  await onboard(page);
  await page.goto("/app/planos");
  await expect(page.getByRole("heading", { name: "Assinatura" })).toBeVisible();
  await expect(page.getByText("Leveza Grátis")).toBeVisible();
  await expect(page.getByText("R$ 149,90")).toBeVisible();
  await page.getByRole("radio", { name: "Mensal (cartão)" }).click();
  await expect(page.getByText("R$ 19,90")).toBeVisible();
  await expect(page.getByText("R$ 34,90")).toBeVisible();
  await page.screenshot({ path: "test-results/10-planos.png", fullPage: true });
});

test("desativar o Modo Lactante atualiza a triagem e libera o modo padrão", async ({ page }) => {
  await onboard(page, { breastfeeding: true });
  await page.getByRole("link", { name: /Modo Lactante ativo/ }).click();
  await page.getByRole("button", { name: /desativar Modo Lactante/ }).click();
  await page.getByRole("button", { name: "Desativar", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Ana/ })).toBeVisible();
  await expect(page.getByText("Modo Lactante ativo")).toHaveCount(0);
  await page.goto("/app/jejum");
  await expect(page.getByRole("button", { name: "Iniciar jejum de 12 h" })).toBeEnabled();
});
