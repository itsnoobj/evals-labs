// Serves evals-lab/ on http://localhost:8000/ (localhost counts as a secure context, which the live model needs).
// Usage: npm start   (or: node scripts/serve.mjs [port])
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = fileURLToPath(new URL("../evals-lab/", import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

// Maps a URL path to a file inside root. Returns null when the path would leave root.
export function resolveSafe(root, urlPath) {
  let path;
  try {
    path = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  } catch {
    return null; // malformed %-escape
  }
  if (path.includes("\0")) return null;
  const file = resolve(join(root, path.endsWith("/") ? `${path}index.html` : path));
  return file.startsWith(resolve(root) + sep) ? file : null;
}

async function handle(req, res) {
  const file = resolveSafe(SITE_ROOT, req.url);
  if (!file) return res.writeHead(403).end("Forbidden");
  try {
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end("Not found");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 8000);
  createServer(handle).listen(port, "127.0.0.1", () => console.log(`Evals Lab: http://localhost:${port}/`));
}
