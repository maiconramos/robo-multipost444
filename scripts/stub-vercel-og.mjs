/**
 * Stubs out @vercel/og files that Next.js bundles into the middleware runtime.
 *
 * This app does NOT use @vercel/og (no opengraph-image routes, no ImageResponse),
 * but Next.js still includes these files (~1.85 MiB) in the compiled output.
 * Replacing them with empty stubs before Wrangler upload saves significant
 * bundle size for Cloudflare Workers deployments.
 */

import { writeFileSync, existsSync, statSync } from "fs";
import { join } from "path";

const ogDir = join(
  process.cwd(),
  "node_modules/next/dist/compiled/@vercel/og"
);

const filesToStub = [
  { name: "resvg.wasm", content: "" },
  { name: "yoga.wasm", content: "" },
  { name: "index.edge.js", content: "module.exports = {};" },
];

let totalSaved = 0;

for (const file of filesToStub) {
  const filePath = join(ogDir, file.name);
  if (existsSync(filePath)) {
    const originalSize = statSync(filePath).size;
    writeFileSync(filePath, file.content);
    const saved = originalSize - file.content.length;
    totalSaved += saved;
    console.log(
      `Stubbed ${file.name}: ${(originalSize / 1024).toFixed(1)} KiB → ${file.content.length} bytes`
    );
  }
}

console.log(`Total saved: ${(totalSaved / 1024).toFixed(1)} KiB`);
