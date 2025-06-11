# 📁 Repository Structure Guide

> **AI Context Optimizer - Clean Public Repository Setup**

## 🎯 Purpose

This document explains the new clean repository structure for the **ai-context-optimizer** public GitHub repository, separating internal documents from user-facing content.

## 📋 Public Repository Contents

### ✅ **Files INCLUDED in public GitHub:**

```
# Core Documentation
README.md                     # Main project documentation  
README_DE.md                 # German version
INSTALLATION-GUIDE.md        # User installation guide
LICENSE                      # MIT License

# Technical Documentation
CACHE-EXPLOSION-SOLUTION.md  # Technical solution explanation
PERFORMANCE-VALIDATION.md    # Performance metrics and benchmarks
TEST-REPORT.md              # Testing documentation and results
TOKEN-ESTIMATION-FIX.md     # Token estimation improvements
TOKEN-REDUCTION-MEASUREMENTS.md # Optimization measurements

# Release Information  
RELEASE-NOTES-v*.md          # Version release notes
CHANGELOG.md                 # Version history (if exists)

# GitHub Configuration
.github/                     # GitHub templates and workflows
  ├── CONTRIBUTING.md        # Contribution guidelines
  ├── ISSUE_TEMPLATE/        # Issue templates
  └── workflows/             # GitHub Actions

# Source Code
src/                         # TypeScript source code
package.json                 # Node.js dependencies
tsconfig.json               # TypeScript configuration
webpack.config.js           # Build configuration
```

### 🚫 **Files EXCLUDED from public GitHub:**

All moved to `internal-docs/` directory:

```
# Business Strategy (internal-docs/business/)
BUSINESS-MODEL-EVOLUTION.md
BUSINESS-STRATEGY-UNICORN.md
INVESTMENT-PITCH-DECK.md
MARKET-ANALYSIS-400M.md
PAPERLESS-NGX-BUSINESS-MODEL.md

# Marketing Materials (internal-docs/marketing/)
COMMUNITY-ANNOUNCEMENT.md
COMMUNITY-LAUNCH-POSTS.md
COMMUNITY-POSTS.md
REDDIT-POSTS-READY.md
GITHUB-LAUNCH-SUCCESS.md
COMMUNITY-SETUP-EINFACH.md

# Development Notes (internal-docs/development/)
CLAUDE.md                    # AI Assistant memory
BETA-LAUNCH-README.md       # Internal beta notes
SPRINT-ROADMAP.md           # Internal planning
CORE-ENGINE-DEMO.md         # Internal demos
PYTHON-GATEWAY-SUCCESS.md   # Development logs
FEEDBACK-COLLECTION.md      # Internal feedback
GITHUB-DISCUSSIONS-SETUP.md # Setup notes

# Experimental Features (internal-docs/experimental/)
PYTHON-UNIVERSAL-GATEWAY-VISION.md
CURSOR-EXPERIENCE-INSIGHTS.md
MVP-CORE-ENGINE.md
PRODUCT-ROADMAP-UNIVERSAL.md
```

## 🔧 .gitignore Configuration

The `.gitignore` file has been updated to:
- ✅ **Include** user-relevant technical documentation
- ❌ **Exclude** all business, marketing, and internal development documents  
- ❌ **Exclude** the entire `internal-docs/` directory
- ❌ **Exclude** website development directories

## 📊 Benefits of New Structure

### 🌍 **Public Repository:**
- **Professional appearance** - Only user-relevant content
- **Focused documentation** - Clear user guides and technical docs
- **Open source compliance** - No business strategy exposure
- **Community friendly** - Easy to contribute and understand

### 🔒 **Internal Documentation:**
- **Business strategy protection** - Competitive information secured
- **Development context preserved** - All internal notes maintained
- **Marketing materials organized** - Campaign content properly stored
- **Easy maintenance** - Clear separation of concerns

## 🚀 Next Steps

1. **Commit current changes** to apply the new structure
2. **Push to GitHub** with clean public repository
3. **Create release v1.1.1-beta** from clean codebase
4. **Update website links** to point to new clean repository

## 📝 Maintenance Guidelines

When adding new files:

### ✅ **Add to public repository:**
- User-facing documentation
- Technical guides and solutions
- Performance reports and benchmarks
- Installation and troubleshooting guides

### 🔒 **Add to internal-docs:**
- Business strategy documents
- Marketing campaign materials
- Internal development notes
- Experimental features not ready for public

## 🔄 Repository Sync

The public repository will contain only essential files for users and contributors, while maintaining all internal documentation in the local `internal-docs/` directory for team use.

---

**Repository:** https://github.com/web-werkstatt/ai-context-optimizer  
**Last Updated:** June 2025  
**Status:** Ready for public release