// Bundles the app into one self-contained HTML file (JS, CSS and fonts inlined).
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const r = (p) => path.join(root, p);

const result = await build({
  entryPoints: [r("preview/main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  outdir: r("preview/dist"),
  format: "iife",
  target: ["es2020", "safari15"],
  jsx: "automatic",
  tsconfig: r("tsconfig.json"),
  alias: {
    "next/link": r("preview/shims/link.tsx"),
    "next/navigation": r("preview/shims/navigation.ts"),
  },
  loader: { ".woff2": "dataurl", ".woff": "dataurl", ".module.css": "local-css", ".css": "css" },
  define: {
    "process.env.NODE_ENV": '"production"',
    // Images load from AniList in the browser. Pass IMAGES=off to build a fully offline file.
    "process.env.NEXT_PUBLIC_IMAGES": JSON.stringify(process.env.IMAGES === "off" ? "off" : "on"),
    // Baked images are copied next to index.html (preview/dist/img/).
    "process.env.NEXT_PUBLIC_ASSET_BASE": '"."',
  },
  logLevel: "warning",
});

const js = result.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = result.outputFiles.find((f) => f.path.endsWith(".css")).text;
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0e0c0b">
<title>AnimeDraft</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>`;
mkdirSync(r("preview/dist"), { recursive: true });
writeFileSync(r("preview/dist/index.html"), html);
if (existsSync(r("public/img"))) cpSync(r("public/img"), r("preview/dist/img"), { recursive: true });
console.log(`preview/dist/index.html  ${(html.length / 1024).toFixed(0)} KB`);
