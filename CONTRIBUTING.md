# Contribution Guidelines

## Development Environment Setup

1. Clone the repository:

```bash
git clone <repository URL>
cd mcp-prompt-server
```

2. Install dependencies:

```bash
pnpm install
```

3. Git user setup:

```bash
# Apply .gitconfig settings (optional)
git config --local include.path ../.gitconfig
```

## Commit Message Guidelines

This project follows this commit message format:

```
[type]: Title (max 50 characters)

Body (optional, each line max 72 characters)
Explain why and what you changed

Footer (optional)
Related issues: #123, #456
Closed issues: Close #789
```

**Commit Types:**

- `feat`: Add new feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting, missing semicolons, no code changes
- `refactor`: Code refactoring
- `test`: Add or modify test code
- `chore`: Changes to build process or documentation tools
- `perf`: Performance improvements

## Branch Strategy

- `main`: Main development branch
- `feature/<feature-name>`: New feature development
- `bugfix/<issue-number>`: Bug fix
- `release/<version>`: Release preparation

## Code Review

All PRs require approval from at least one reviewer.

## CI/CD Pipeline

The following tasks are automatically performed through GitHub Actions:

- Code linting
- Build
- Testing

## Troubleshooting

If you encounter any issues, create an issue or contact the maintainer.
