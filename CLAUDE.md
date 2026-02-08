# CLAUDE.md

## Commands

- **Dev server**: `pnpm dev` (playground) or `pnpm dev:lib` (library only)
- **Build**: `pnpm build` (all) or `pnpm build:lib` (library only)
- **Typecheck**: `pnpm typecheck`
- **Lint**: `pnpm lint`
- **Lint fix**: `pnpm lint:fix`
- **Format markdown**: `pnpm format:md`

## Workflow

After changing code, run `pnpm lint:fix` to auto-fix lint and formatting issues.

## Documentation

When changing the public API (props, types, exports), CSS custom properties, or CSS setup instructions, update `packages/calendar/README.md` to reflect the changes.
