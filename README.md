# @savvycal/calendar

A fully-featured resource grid calendar component built with React, Tailwind CSS v4, and the Temporal API.

## Packages

| Package                                   | Description                                    |
| ----------------------------------------- | ---------------------------------------------- |
| [`@savvycal/calendar`](packages/calendar) | The calendar component library.                |
| [`playground`](playground)                | Development playground for testing components. |

## Development

```bash
# Install dependencies
pnpm install

# Start the playground dev server
pnpm dev

# Build the library
pnpm build:lib

# Typecheck
pnpm typecheck

# Lint
pnpm lint:fix

# Format markdown files
pnpm format:md
```

## Release

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

```bash
pnpm changeset       # Create a new changeset
pnpm version         # Apply changesets and bump versions
pnpm release         # Build and publish to npm
```

## License

MIT
