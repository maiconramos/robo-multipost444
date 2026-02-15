## Tooling & Productivity Guide

This guide equips developers with the essential tools, scripts, and workflows to contribute efficiently to Robo-Multipost, a Next.js application for multi-platform social media posting. It covers setup for linting, formatting, type-checking, and building, along with automation to maintain code quality. Use these to onboard quickly and stay productive during development, testing, and deployment.

Refer to [development-workflow.md](./development-workflow.md) for end-to-end workflows integrating these tools.

## Required Tooling

- **Node.js (v20.0.0 or higher)**  
  Powers the Next.js runtime, TypeScript compilation, and build processes.  
  *Installation:* Use [nvm](https://github.com/nvm-sh/nvm): `nvm install 20 && nvm use 20`. Verify with `node -v`.

- **pnpm (v9.0.0 or higher)**  
  Fast, disk-efficient package manager used for all dependencies.  
  *Installation:* `npm install -g pnpm@latest`. Verify with `pnpm -v`. Install deps with `pnpm install`.

- **TypeScript (v5.4.0+)**  
  Strict typing for hooks (`use-queue.ts`, `use-posts.ts`), utils (`lib/utils.ts`), and API types (`lib/late-api/types.ts`).  
  Included in `devDependencies`; run `pnpm type-check` to validate.

- **ESLint (v9.0.0+ with Next.js plugin)**  
  Enforces code style, catches errors in React components (`src/components/*`), hooks, and routes (`src/app/api/*`).  
  Included; run `pnpm lint`.

- **Prettier (v3.0.0+)**  
  Auto-formats code for consistency across `src/` files.  
  Included; run `pnpm format`.

- **Tailwind CSS (v3.4.0+ with shadcn/ui)**  
  Utility-first styling via `cn` utility in `src/lib/utils.ts`.  
  Included; no separate install needed.

## Recommended Automation

Streamline commits and builds with these scripts from `package.json`:

- **Linting & Formatting (pre-commit):**  
  Husky + lint-staged automatically runs `eslint --fix` and `prettier --write` on staged `.ts/.tsx` files. Install hooks: `pnpm dlx husky-init && pnpm exec lint-staged --install`.  
  Manual: `pnpm lint` (checks all) or `pnpm lint:fix` (auto-fixes).

- **Type-Checking:** `pnpm type-check`  
  Validates types in hooks like `useAccounts`, `QueueSlot`, and `PlatformSpecificData` without emitting files (`tsc --noEmit`).

- **Formatting:** `pnpm format`  
  `prettier --write "src/**/*.{ts,tsx,mdx}" --ignore-unknown`.

- **Build & Preview:** `pnpm build` (full production build) then `pnpm start`.  
  Watch mode: `pnpm dev` for HMR during development.

- **Code Generation (shadcn/ui):**  
  Add new UI components: `pnpm dlx shadcn-ui@latest add button`. Regenerates `src/components/ui/*` with Tailwind classes.

Run `pnpm run` to list all scripts. Integrate into CI via GitHub Actions for pull requests.

## IDE / Editor Setup

Configure VS Code (recommended) for instant feedback:

- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss): Autocomplete classes in `cn(...)` calls.
- **Prettier - Code formatter** (esbenp.prettier-vscode): Format on save; set `"editor.formatOnSave": true` in `.vscode/settings.json`.
- **ESLint** (dbaeumer.vscode-eslint): Highlights issues in hooks and components; enable `"eslint.validate": ["typescript", "typescriptreact"]`.
- **TypeScript Importer** (pmneo.tsimporter): Quick imports for exports like `usePosts` or `PlatformIcon`.
- **GitLens** (eamodio.gitlens): Blame, history for `src/app/dashboard/*` pages.
- **Thunder Client** (rangav.vscode-thunder-client): Test API routes like `/api/validate-key`.

Sample `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.format.enable": true
}
```

## Productivity Tips

- **Terminal Aliases** (add to `~/.zshrc` or `~/.bashrc`):  
  ```
  alias dev="pnpm dev"
  alias type="pnpm type-check"
  alias lintfix="pnpm lint:fix && pnpm format"
  alias build="pnpm build && pnpm start"
  ```

- **VS Code Tasks:** Run `lintfix` or `type-check` via Ctrl+Shift+P > Tasks: Run Task.

- **Local Development Server:** `pnpm dev` starts at `http://localhost:3000`. Use `src/app/dashboard/*` pages for testing posts, queues, and accounts.

- **Debug Hooks:** Log states from `useAccounts`, `usePosts` in React DevTools. Profile builds with `next build --profile`.

Share dotfiles in a team repo for consistency.

## Related Resources

- [development-workflow.md](./development-workflow.md)
