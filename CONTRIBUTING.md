# Contributing to i18nGuard

Thank you for your interest in contributing to i18nGuard! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/i18nguard/i18nguard.git
cd i18nguard
```

2. Install dependencies:
```bash
pnpm install
```

3. Build all packages:
```bash
pnpm build
```

4. Run tests:
```bash
pnpm test
```

## Project Structure

This is a monorepo with the following packages:

- **`packages/core`** - Core engine and rule system
- **`packages/adapters`** - Framework adapters (i18next, FormatJS, Lingui)
- **`packages/cli`** - Command-line interface
- **`packages/reporter`** - Report generators (JSON, SARIF, HTML)
- **`packages/vscode`** - VS Code extension
- **`packages/action`** - GitHub Action
- **`examples/`** - Example projects demonstrating usage

## Development Workflow

### Making Changes

1. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and ensure tests pass:
```bash
pnpm test
pnpm lint
pnpm typecheck
```

3. Add tests for new functionality
4. Update documentation if needed
5. Commit your changes with a clear message
6. Push and create a pull request

### Code Style

- We use ESLint and Prettier for code formatting
- Run `pnpm lint:fix` to auto-fix issues
- Follow TypeScript best practices
- Add JSDoc comments for public APIs

### Testing

- Write unit tests for new functionality
- Use Vitest for testing
- Aim for good test coverage
- Test files should end with `.test.ts` or `.spec.ts`

### Adding New Rules

When adding new i18n detection rules:

1. Add the rule to `packages/core/src/rules/`
2. Follow the existing pattern with rule ID, description, etc.
3. Add comprehensive tests
4. Update documentation

### Adding New Adapters

When adding support for new i18n libraries:

1. Create a new adapter in `packages/adapters/src/`
2. Implement the `Adapter` interface
3. Add detection logic for the library's patterns
4. Add catalog loading functionality
5. Add tests and an example project

## Pull Request Guidelines

- Keep changes focused and atomic
- Include tests for new functionality
- Update relevant documentation
- Add a clear description of changes
- Reference any related issues

## Issue Reporting

When reporting issues:

- Use clear, descriptive titles
- Provide minimal reproduction cases
- Include environment information
- Tag with appropriate labels

## Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions.

## Questions?

- Check existing issues and discussions
- Ask questions in GitHub Discussions
- Reach out to maintainers if needed

Thank you for contributing to i18nGuard!