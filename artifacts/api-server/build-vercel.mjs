// Empacota a API Express em <raiz>/api/_server/app.mjs.
// A função serverless convencional da Vercel é <raiz>/api/index.mjs (versionado),
// que apenas reexporta este bundle. Pastas/arquivos iniciados por "_" em /api
// não viram funções. Uso: pnpm run build:vercel (executado via vercel.json).
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(artifactDir, "../..");
const outDir = path.resolve(rootDir, "api/_server");

await rm(outDir, { recursive: true, force: true });

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/vercel.ts")],
  platform: "node",
  target: "node22",
  bundle: true,
  format: "esm",
  outfile: path.resolve(outDir, "app.mjs"),
  logLevel: "info",
  external: ["pg-native"],
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
  },
});

console.log("API empacotada em", outDir);
