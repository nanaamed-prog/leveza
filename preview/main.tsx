import "@fontsource/montserrat/latin-600.css";
import "@fontsource/montserrat/latin-700.css";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-600.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@/app/globals.css";
import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { AppDataProvider } from "@/lib/data/provider";
import { AppShell } from "@/components/layout/AppShell";
import { useRoute } from "./router";

import Welcome from "@/app/page";
import Login from "@/app/login/page";
import Onboarding from "@/app/onboarding/page";
import Privacy from "@/app/privacidade/page";
import Dashboard from "@/app/app/page";
import Food from "@/app/app/alimentacao/page";
import NewMeal from "@/app/app/alimentacao/nova/page";
import Movement from "@/app/app/movimento/page";
import Sleep from "@/app/app/sono/page";
import Water from "@/app/app/agua/page";
import Fasting from "@/app/app/jejum/page";
import Evolution from "@/app/app/evolucao/page";
import Plan from "@/app/app/plano/page";
import Habits from "@/app/app/habitos/page";
import Lactation from "@/app/app/lactante/page";
import Recipes from "@/app/app/receitas/page";
import Reports from "@/app/app/relatorios/page";
import Profile from "@/app/app/perfil/page";
import Screening from "@/app/app/perfil/triagem/page";
import Settings from "@/app/app/configuracoes/page";

const publicRoutes: Record<string, ComponentType> = { "/": Welcome, "/login": Login, "/onboarding": Onboarding, "/privacidade": Privacy };
const appRoutes: Record<string, ComponentType> = {
  "/app": Dashboard,
  "/app/alimentacao": Food,
  "/app/alimentacao/nova": NewMeal,
  "/app/movimento": Movement,
  "/app/sono": Sleep,
  "/app/agua": Water,
  "/app/jejum": Fasting,
  "/app/evolucao": Evolution,
  "/app/plano": Plan,
  "/app/habitos": Habits,
  "/app/lactante": Lactation,
  "/app/receitas": Recipes,
  "/app/relatorios": Reports,
  "/app/perfil": Profile,
  "/app/perfil/triagem": Screening,
  "/app/configuracoes": Settings,
};

function Router() {
  const { path, search } = useRoute();
  const key = path + "?" + search;
  const Pub = publicRoutes[path];
  if (Pub) return <Pub key={key} />;
  const Page = appRoutes[path] ?? Dashboard;
  return (
    <AppShell>
      <Page key={key} />
    </AppShell>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppDataProvider>
      <Router />
    </AppDataProvider>
  </StrictMode>,
);
