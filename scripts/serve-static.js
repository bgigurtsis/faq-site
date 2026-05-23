import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const serveRoot = join(root, process.argv[2] || ".");
const publicRoot = join(root, "public");
const port = Number.parseInt(process.argv[3] || "5173", 10);
const host = "127.0.0.1";

function resolveSafePath(baseDir, pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = join(baseDir, relativePath);
  const pathFromBase = relative(baseDir, filePath);

  if (
    pathFromBase === ".." ||
    pathFromBase.startsWith(`..${sep}`) ||
    isAbsolute(pathFromBase)
  ) {
    return null;
  }

  return filePath;
}

async function findFile(pathname) {
  const candidates = [resolveSafePath(serveRoot, pathname)];

  if (serveRoot !== publicRoot) {
    candidates.push(resolveSafePath(publicRoot, pathname));
  }

  for (const candidate of candidates.filter(Boolean)) {
    try {
      const fileStat = await stat(candidate);

      if (fileStat.isFile()) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`);
    const filePath = await findFile(decodeURIComponent(requestUrl.pathname));

    if (!filePath) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes.get(extname(filePath)) || "application/octet-stream",
    });

    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
  }
});

server.listen(port, host, () => {
  console.log(`Serving ${relative(root, serveRoot) || "."} at http://${host}:${port}`);
});
