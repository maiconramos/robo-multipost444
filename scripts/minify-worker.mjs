
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(__dirname, "..");
const handlerPath = path.join(workspaceRoot, "apps/web/.open-next/server-functions/default/apps/web/handler.mjs");

async function minify() {
    console.log("Minifying Cloudflare Worker bundle...");
    console.log(`Target: ${handlerPath}`);

    if (!fs.existsSync(handlerPath)) {
        console.error("Handler file not found!");
        process.exit(1);
    }

    const initialSize = fs.statSync(handlerPath).size;
    console.log(`Initial size: ${(initialSize / 1024 / 1024).toFixed(2)} MB`);

    try {
        await build({
            entryPoints: [handlerPath],
            outfile: handlerPath,
            allowOverwrite: true,
            minify: true,
            format: "esm",
            target: "esnext",
            platform: "browser", // Cloudflare Workers are more browser-like than node
            sourcemap: false,
            legalComments: "none",
            // Drop console and debugger to save space
            drop: ["console", "debugger"],
        });

        const finalSize = fs.statSync(handlerPath).size;
        console.log(`Final size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Reduction: ${((initialSize - finalSize) / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
        console.error("Minification failed:", error);
        process.exit(1);
    }
}

minify();
