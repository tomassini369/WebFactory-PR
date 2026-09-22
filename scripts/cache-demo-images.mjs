import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = await fs.readFile(path.join(root, "src", "demoData.ts"), "utf8");
const ids = [...source.matchAll(/pexels\((\d+)/g)].map((match) => match[1]);
const uniqueIds = [...new Set(ids)];
const outDir = path.join(root, "public", "demo-images");
await fs.mkdir(outDir, { recursive: true });

for (const id of uniqueIds) {
  const out = path.join(outDir, `${id}.jpg`);
  try {
    await fs.access(out);
    continue;
  } catch {}
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
  const response = await fetch(url, { headers: { "User-Agent": "WebFactoryPR/1.0" } });
  if (!response.ok) throw new Error(`Failed to cache demo image ${id}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(out, bytes);
  console.log(`cached demo image ${id}`);
}
