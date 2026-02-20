# Contributing to Ordo

Thank you for your interest in contributing to Ordo! This document provides guidelines and instructions for contributing.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 20+
- Rust 1.75+
- Solana CLI 1.18.22+
- Anchor 0.30.1
- Git

### Setup Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ORDO.git
   cd ordo
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. Build the project:
   ```bash
   anchor build
   npm run build
   ```

6. Run tests:
   ```bash
   npm test
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Write or update tests for your changes

4. Run tests and linting:
   ```bash
   npm test
   npm run lint
   npm run format
   ```

5. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

6. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

7. Open a Pull Request

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or updates
- `chore:` - Build process or auxiliary tool changes

Examples:
```
feat: add agent replication mechanism
fix: resolve memory leak in lifecycle manager
docs: update installation instructions
test: add property tests for evolution system
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Follow existing code style
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Prefer functional programming patterns
- Use async/await over promises

### Rust (Anchor Programs)

- Follow Rust naming conventions
- Use `cargo fmt` for formatting
- Use `cargo clippy` for linting
- Add documentation comments
- Handle errors explicitly
- Write unit tests for all functions

### Testing

- Write tests for all new features
- Maintain or improve code coverage
- Use property-based testing where appropriate
- Test edge cases and error conditions

## Pull Request Process

1. **Update Documentation**: Update README.md and relevant docs if needed

2. **Add Tests**: Ensure your changes are covered by tests

3. **Run Full Test Suite**: 
   ```bash
   npm test
   npm run lint
   anchor test
   ```

4. **Update Changelog**: Add your changes to CHANGELOG.md (if exists)

5. **Create PR**: 
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changed and why
   - Include screenshots for UI changes

6. **Code Review**: Address reviewer feedback promptly

7. **Merge**: Once approved, a maintainer will merge your PR

## Areas for Contribution

### High Priority

- 🐛 Bug fixes
- 📝 Documentation improvements
- ✅ Test coverage improvements
- 🔒 Security enhancements

### Feature Areas

- **Agent Intelligence**: Improve reasoning and decision-making
- **Evolution System**: Enhance genetic algorithms and fitness functions
- **Economic Models**: Develop new survival mechanisms
- **Safety Systems**: Strengthen alignment and monitoring
- **DeFi Integration**: Add new financial capabilities
- **UI/UX**: Improve web and mobile interfaces

### Good First Issues

Look for issues labeled `good-first-issue` in the GitHub repository.

## Reporting Bugs

### Before Submitting

1. Check existing issues to avoid duplicates
2. Verify the bug exists in the latest version
3. Collect relevant information

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Step one
2. Step two
3. ...

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Windows 11, Ubuntu 22.04]
- Node.js version: [e.g., 20.10.0]
- Solana CLI version: [e.g., 1.18.22]
- Anchor version: [e.g., 0.30.1]

**Additional Context**
Logs, screenshots, etc.
```

## Feature Requests

We welcome feature requests! Please:

1. Check if the feature already exists or is planned
2. Clearly describe the feature and its benefits
3. Provide use cases and examples
4. Consider implementation complexity

## Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email security@ordo.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours.

## Documentation

Good documentation is crucial. You can contribute by:

- Fixing typos and grammar
- Improving clarity and examples
- Adding missing documentation
- Translating documentation
- Creating tutorials and guides

## Community

- **Discord**: Join our community server (link in README)
- **GitHub Discussions**: Ask questions and share ideas
- **Twitter**: Follow [@OrdoPlatform](https://twitter.com/OrdoPlatform)

## Development Tips

### Running Local Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/agents/lifecycle.test.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Debugging

```bash
# Run with debug logging
DEBUG=* npm run dev

# Debug Anchor programs
anchor test --skip-build -- --nocapture
```

### Building for Production

```bash
# Clean build
npm run clean
anchor build
npm run build

# Verify build
npm test
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing, feel free to:
- Open a GitHub Discussion
- Ask in our Discord server
- Email contributors@ordo.com

Thank you for contributing to Ordo! 🚀
