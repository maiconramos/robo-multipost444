import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ConnectionMethod = "BYO_OAUTH" | "BYO_SYSTEM_USER" | "LATE";

interface ParsedArgs {
  identifier?: string;
  platform?: string;
  method?: ConnectionMethod;
  activate: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { activate: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--identifier") {
      parsed.identifier = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--platform") {
      parsed.platform = argv[index + 1]?.toLowerCase();
      index += 1;
      continue;
    }

    if (arg === "--method") {
      const nextValue = argv[index + 1]?.toUpperCase();
      if (
        nextValue === "BYO_OAUTH" ||
        nextValue === "BYO_SYSTEM_USER" ||
        nextValue === "LATE"
      ) {
        parsed.method = nextValue;
      }
      index += 1;
      continue;
    }

    if (arg === "--activate") {
      parsed.activate = true;
    }
  }

  return parsed;
}

function toIdentifier(method: ConnectionMethod, platform: string): string {
  return `${method.toLowerCase()}.${platform}`;
}

function parseIdentifier(identifier: string): {
  method: ConnectionMethod;
  platform: string;
} {
  const pieces = identifier.trim().toLowerCase().split(".");
  if (pieces.length !== 2) {
    throw new Error(
      "Invalid identifier. Use format <connection_method>.<platform>, e.g. byo_oauth.instagram",
    );
  }

  const [rawMethod, platform] = pieces;
  const methodLookup: Record<string, ConnectionMethod> = {
    byo_oauth: "BYO_OAUTH",
    byo_system_user: "BYO_SYSTEM_USER",
    late: "LATE",
  };

  const method = methodLookup[rawMethod];
  if (!method) {
    throw new Error(`Unknown connection method '${rawMethod}'.`);
  }

  return {
    method,
    platform,
  };
}

function pascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join("");
}

function ensureFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    return;
  }

  writeFileSync(path, content, "utf8");
}

function injectPlatformInSet(entriesPath: string, setName: string, platform: string): boolean {
  const source = readFileSync(entriesPath, "utf8");
  const marker = `const ${setName} = new Set<Platform>([`;
  const startIndex = source.indexOf(marker);
  if (startIndex === -1) {
    return false;
  }

  const endIndex = source.indexOf("]);", startIndex);
  if (endIndex === -1) {
    return false;
  }

  const currentSlice = source.slice(startIndex, endIndex + 3);
  if (currentSlice.includes(`\"${platform}\"`)) {
    return false;
  }

  const insertion = `  \"${platform}\",\n`;
  const replaced =
    source.slice(0, endIndex) + insertion + source.slice(endIndex);

  writeFileSync(entriesPath, replaced, "utf8");
  return true;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  const repoRoot = resolve(currentDir, "..");

  let identifier = args.identifier;
  let method = args.method;
  let platform = args.platform;

  if (identifier) {
    const parsed = parseIdentifier(identifier);
    method = parsed.method;
    platform = parsed.platform;
  } else if (method && platform) {
    identifier = toIdentifier(method, platform);
  }

  if (!identifier || !method || !platform) {
    throw new Error(
      "Usage: npx tsx scripts/scaffold-provider.ts --identifier byo_oauth.instagram [--activate]",
    );
  }

  const constantName = `${identifier.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}_RUNTIME`;
  const settingsComponentName = `${pascalCase(platform)}Settings`;
  const testFunctionName = `shouldResolve${pascalCase(identifier)}`;

  const runtimeStubPath = resolve(
    repoRoot,
    `src/lib/providers/runtime/scaffolds/${identifier}.ts`,
  );
  const settingsStubPath = resolve(
    repoRoot,
    `src/components/compose/settings/providers/${platform}-settings.tsx`,
  );
  const testStubPath = resolve(
    repoRoot,
    `src/lib/providers/runtime/__tests__/${identifier}.test.ts`,
  );

  ensureFile(
    runtimeStubPath,
    [
      'import type { ProviderRuntimeEntry } from "@/lib/providers/runtime/types";',
      "",
      `export const ${constantName}: ProviderRuntimeEntry = {`,
      `  identifier: "${identifier}",`,
      `  platform: "${platform}" as ProviderRuntimeEntry["platform"],`,
      `  connectionMethod: "${method}",`,
      `  providerType: "${method === "LATE" ? "late" : "byo"}",`,
      "};",
      "",
    ].join("\n"),
  );

  ensureFile(
    settingsStubPath,
    [
      'import type { SettingsProviderProps } from "@/components/compose/settings/registry";',
      'import { NoExtraSettings } from "@/components/compose/settings/providers/no-extra-settings";',
      "",
      `export function ${settingsComponentName}(props: SettingsProviderProps) {`,
      "  return <NoExtraSettings {...props} />;",
      "}",
      "",
    ].join("\n"),
  );

  ensureFile(
    testStubPath,
    [
      'import { getProviderCatalogEntry } from "@/lib/providers/catalog";',
      'import { getProviderRuntimeEntry } from "@/lib/providers/runtime/registry";',
      "",
      `export function ${testFunctionName}() {`,
      `  const catalog = getProviderCatalogEntry("${identifier}");`,
      `  const runtime = getProviderRuntimeEntry("${identifier}");`,
      "",
      "  if (!catalog) {",
      `    throw new Error("Catalog entry missing for ${identifier}");`,
      "  }",
      "",
      "  if (!runtime) {",
      `    throw new Error("Runtime entry missing for ${identifier}");`,
      "  }",
      "}",
      "",
    ].join("\n"),
  );

  if (args.activate) {
    const entriesPath = resolve(repoRoot, "src/lib/providers/catalog/entries.ts");
    const setNameByMethod: Record<ConnectionMethod, string> = {
      BYO_OAUTH: "activeByoOAuthPlatforms",
      BYO_SYSTEM_USER: "activeByoSystemUserPlatforms",
      LATE: "activeLatePlatforms",
    };

    injectPlatformInSet(entriesPath, setNameByMethod[method], platform);
  }

  console.log("Provider scaffold generated:");
  console.log(`- ${runtimeStubPath}`);
  console.log(`- ${settingsStubPath}`);
  console.log(`- ${testStubPath}`);
}

main();
