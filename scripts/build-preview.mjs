// Gera uma prévia ESTÁTICA (Modo demonstração, sem rotas de API) na pasta out/.
// Útil para ver o app no celular sem configurar servidor. Uso: npm run build:preview
import { execSync } from "node:child_process";
import { existsSync, renameSync, mkdirSync } from "node:fs";

const api = "src/app/api";
const stash = ".preview-stash/api";
mkdirSync(".preview-stash", { recursive: true });
const moved = existsSync(api);
if (moved) renameSync(api, stash);
try {
  execSync("npx next build", {
    stdio: "inherit",
    env: {
      ...process.env,
      LEVEZA_STATIC_EXPORT: "1",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  });
} finally {
  if (moved) renameSync(stash, api);
}
