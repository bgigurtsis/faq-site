import { copyFile, cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const publicDir = join(root, "public");

await rm(dist, { force: true, recursive: true });
await mkdir(dist, { recursive: true });

await Promise.all([
  copyFile(join(root, "index.html"), join(dist, "index.html")),
  copyFile(join(root, "styles.css"), join(dist, "styles.css")),
  copyFile(join(root, "script.js"), join(dist, "script.js")),
]);

const publicEntries = await readdir(publicDir);

await Promise.all(
  publicEntries.map((entry) =>
    cp(join(publicDir, entry), join(dist, entry), { recursive: true }),
  ),
);

console.log("Built static site to dist/");
