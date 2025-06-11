# Contributing to Cline Token Manager 🚀

Thank you for your interest in contributing to Cline Token Manager! We're excited to work with you to make AI coding more efficient and cost-effective for everyone.

## 🎯 Quick Start

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `npm install`
3. **Start development**: `npm run compile`
4. **Test your changes**: F5 in VS Code (Extension Development Host)
5. **Submit a pull request** with a clear description

## 📋 Ways to Contribute

### 🐛 Bug Reports
- Use our [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- Include detailed reproduction steps
- Provide console output and logs
- Test with the latest version

### ✨ Feature Requests
- Use our [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml)
- Explain the problem you're solving
- Provide use cases and examples
- Consider implementation complexity

### 💬 Community Support
- Answer questions in [GitHub Discussions](https://github.com/web-werkstatt/ai-context-optimizer/discussions)
- Help other users with setup and configuration
- Share your optimization strategies
- Provide feedback on new features

### 🛠️ Code Contributions
- Look for [`good first issue`](https://github.com/web-werkstatt/ai-context-optimizer/labels/good%20first%20issue) labels
- Check our [project roadmap](https://github.com/web-werkstatt/ai-context-optimizer/projects)
- Follow our coding standards and patterns
- Add tests for new features

## 🏗️ Development Setup

### Prerequisites
- **Node.js** 18+ 
- **VS Code** with Cline extension installed
- **Git** for version control

### Local Development
```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/cline-token-manager.git
cd cline-token-manager

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Package extension
npm run package
```

### Testing
```bash
# Open VS Code in project directory
code .

# Press F5 to launch Extension Development Host
# Install the extension in the new VS Code window
# Test with actual Cline workflows
```

## 📐 Code Standards

### TypeScript Guidelines
- Use **strict mode** and fix all TypeScript errors
- Follow **existing naming conventions**
- Add **JSDoc comments** for public methods
- Use **async/await** instead of Promises where possible

### Architecture Patterns
- **Event-driven design** (no polling loops)
- **Singleton pattern** for managers and services
- **Adapter pattern** for different Cline versions
- **Error boundaries** with graceful fallbacks

### Example Code Style
```typescript
/**
 * Analyzes token usage for the current Cline session
 * @param taskId - Optional task ID to analyze specific task
 * @returns Promise with token usage statistics
 */
public async analyzeTokenUsage(taskId?: string): Promise<TokenUsage> {
    try {
        const usage = await this.tokenManager.getCurrentUsage();
        
        if (usage.totalTokens === 0) {
            console.log('🔧 TokenAnalyzer: No token usage detected');
            return this.getEmptyUsage();
        }
        
        return this.calculateOptimizedUsage(usage);
    } catch (error) {
        console.error('🔧 TokenAnalyzer: Analysis failed:', error);
        throw new Error(`Token analysis failed: ${error}`);
    }
}
```

### File Organization
```
src/
├── core/                    # Core business logic
│   ├── context/            # Context management
│   └── task-completion/    # Task detection
├── dashboard/              # Analytics and reporting
├── cline-integration/      # Cline-specific adapters
├── config/                 # Configuration management
└── shared/                 # Shared types and utilities
```

## 🚀 Feature Development Process

### 1. Planning Phase
- **Create an issue** using our Feature Request template
- **Discuss with maintainers** in GitHub Discussions
- **Get approval** before starting significant work
- **Check roadmap** to avoid conflicts

### 2. Implementation Phase
- **Create feature branch**: `feature/your-feature-name`
- **Follow existing patterns** and code organization
- **Add comprehensive tests** for new functionality
- **Update documentation** as needed

### 3. Review Phase
- **Self-review** your code before submitting
- **Test thoroughly** with different Cline configurations
- **Update CHANGELOG.md** with your changes
- **Submit pull request** with detailed description

### 4. Integration Phase
- **Address review feedback** promptly
- **Ensure CI passes** (compilation, tests, linting)
- **Rebase if requested** to maintain clean history
- **Celebrate** when merged! 🎉

## 🔧 Technical Guidelines

### Performance Requirements
- **<1% CPU usage** during normal operation
- **<50MB memory** footprint
- **Sub-500ms response** for UI operations
- **Event-driven architecture** (no polling)

### Compatibility
- **VS Code**: 1.74.0+
- **Node.js**: 18+
- **Cline**: v3.15.0+ (both legacy and current)
- **Operating Systems**: Windows, macOS, Linux

### Security Considerations
- **No API keys** in source code
- **Secure file operations** with proper permissions
- **Input validation** for all user inputs
- **Error messages** that don't leak sensitive information

## 📊 Testing Strategy

### Manual Testing
- **Extension installation** from VSIX
- **Integration with Cline** across different models
- **Token tracking accuracy** with real sessions
- **Dashboard functionality** with various data sets
- **Performance monitoring** during extended use

### Automated Testing
- **Unit tests** for core logic
- **Integration tests** for Cline compatibility
- **Performance benchmarks** for optimization features
- **Regression tests** for critical functionality

## 🎨 UI/UX Guidelines

### Design Principles
- **Minimal and clean** interface
- **Consistent with VS Code** styling
- **Accessible** to users with disabilities
- **Professional appearance** suitable for enterprise

### Dashboard Design
- **Clear data visualization** with appropriate charts
- **Actionable insights** not just raw numbers
- **Responsive layout** for different screen sizes
- **Export capabilities** for external analysis

## 📝 Documentation

### Code Documentation
- **JSDoc comments** for all public APIs
- **Inline comments** for complex logic
- **Type definitions** with clear descriptions
- **Usage examples** in code comments

### User Documentation
- **README updates** for new features
- **Setup guides** for complex configurations
- **Troubleshooting guides** for common issues
- **Best practices** documentation

## 🚨 Issue Triage

### Priority Levels
- **Critical**: Extension crashes, data loss, security issues
- **High**: Core features broken, significant performance issues
- **Medium**: Feature enhancements, minor bugs
- **Low**: Documentation, nice-to-have features

### Response Times
- **Critical**: Same day response
- **High**: 1-2 business days
- **Medium**: 3-5 business days
- **Low**: 1-2 weeks

## 🏆 Recognition

### Contributors
All contributors are recognized in:
- **README.md** contributors section
- **CHANGELOG.md** for specific contributions
- **GitHub releases** with contributor highlights
- **Social media** shoutouts for significant contributions

### Community Champions
Regular contributors may be invited to:
- **Beta testing** new features
- **Feature planning** discussions
- **Maintainer status** for exceptional contributors
- **Conference speaking** opportunities

## 📞 Getting Help

### Quick Questions
- **GitHub Discussions** for general questions
- **Issue comments** for specific issues
- **Email** support@web-werkstatt.at for sensitive topics

### Development Help
- **Code review** requests in pull requests
- **Architecture discussions** in GitHub Discussions
- **Pair programming** sessions (contact maintainers)

## 📄 License

By contributing to Cline Token Manager, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Ready to contribute? We can't wait to see what you build!** 🚀

*This contributing guide is a living document. Please suggest improvements!*