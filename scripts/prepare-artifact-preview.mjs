// Ajusta a prévia estática (out/) para hosts que não aceitam caminhos começando com "_":
// move _next → nx, reescreve referências e remove arquivos de segmento opcionais.
import { readdirSync, statSync, readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

const root = "out";
renameSync(path.join(root, "_next"), path.join(root, "nx"));
rmSync(path.join(root, "_not-found"), { recursive: true, force: true });
const walk = (d) =>
  readdirSync(d).flatMap((f) =>
    statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)],
  );
for (const f of walk(root)) {
  const base = path.basename(f);
  if (base.startsWith("__next.")) {
    rmSync(f);
    continue;
  }
  if (/\.(html|js|css|txt|json|webmanifest)$/.test(f)) {
    const s = readFileSync(f, "utf8");
    const t = s.replaceAll("/_next/", "/nx/");
    if (t !== s) writeFileSync(f, t);
  }
}
console.log("prévia ajustada");
