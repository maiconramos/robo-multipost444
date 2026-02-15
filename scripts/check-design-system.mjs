import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const globalsPath = "src/app/globals.css";

const allowedFiles = new Set([
  "src/lib/platforms/types.ts",
  "src/components/shared/platform-icon.tsx",
  "src/components/compose/post-preview.tsx",
]);

const fileExtensions = new Set([".ts", ".tsx", ".css"]);
const colorUtilityPattern =
  /\b(?:bg|text|border|from|to|via|ring|stroke|fill)-(?:red|blue|green|yellow|amber|orange|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d{1,3})?\b/g;
const hexPattern = /#[0-9A-Fa-f]{3,8}\b/g;

const issues = [];

function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath);
      continue;
    }

    if (!fileExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const relativePath = path.relative(rootDir, fullPath).replaceAll(path.sep, "/");
    validateFile(relativePath, fullPath);
  }
}

function isAllowedHexInGlobals(line) {
  return /^\s*--[a-z0-9-]+:\s*#[0-9A-Fa-f]{3,8};\s*$/.test(line);
}

function pushMatchIssues(relativePath, lineNumber, line, pattern, message) {
  const matches = line.match(pattern) ?? [];
  for (const value of matches) {
    issues.push({
      file: relativePath,
      line: lineNumber,
      value,
      message,
    });
  }
}

function validateFile(relativePath, fullPath) {
  if (allowedFiles.has(relativePath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const utilityPattern = new RegExp(colorUtilityPattern);
    const hexLiteralPattern = new RegExp(hexPattern);

    pushMatchIssues(
      relativePath,
      lineNumber,
      line,
      utilityPattern,
      "Hardcoded Tailwind palette utility detected. Use semantic design tokens instead.",
    );

    const hexMatches = line.match(hexLiteralPattern) ?? [];
    if (hexMatches.length === 0) {
      return;
    }

    if (relativePath === globalsPath && isAllowedHexInGlobals(line)) {
      return;
    }

    for (const value of hexMatches) {
      issues.push({
        file: relativePath,
        line: lineNumber,
        value,
        message:
          relativePath === globalsPath
            ? "Hex literal outside token definition in globals.css."
            : "Hex literal detected. Use semantic design tokens instead.",
      });
    }
  });
}

collectFiles(srcDir);

if (issues.length > 0) {
  console.error("\nDesign system guard failed:\n");
  for (const issue of issues) {
    console.error(
      `- ${issue.file}:${issue.line} (${issue.value}) ${issue.message}`,
    );
  }
  console.error(
    "\nAllowed exceptions: src/lib/platforms/types.ts, src/components/shared/platform-icon.tsx, src/components/compose/post-preview.tsx, token definitions in src/app/globals.css.\n",
  );
  process.exit(1);
}

console.log("Design system guard passed.");
