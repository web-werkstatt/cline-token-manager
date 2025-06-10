import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🚀 CURSOR-INSPIRED: Smart File Selection System
 * 
 * Übertrifft Cursor's File Selection durch:
 * 1. Intelligent Relevance Scoring (like Cursor)
 * 2. Real-time Cost-Impact Analysis (BETTER than Cursor)
 * 3. Universal AI-Tool Support (NOT Editor-locked)
 * 4. Proactive Optimization Suggestions (ENHANCED)
 * 
 * Cursor's Approach + Universal + Cost Transparency = Cursor-Killer
 */

interface FileContext {
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified: Date;
  relevanceScore: number;
  tokenCount: number;
  costImpact: number;
  dependencies: string[];
  contextType: 'primary' | 'secondary' | 'supporting' | 'noise';
}

interface SmartSelection {
  selectedFiles: FileContext[];
  rejectedFiles: FileContext[];
  totalTokens: number;
  estimatedCost: number;
  optimizationSuggestions: string[];
  confidenceScore: number;
}

interface ContextStrategy {
  maxTokens: number;
  maxFiles: number;
  relevanceThreshold: number;
  includeTests: boolean;
  includeDocs: boolean;
  prioritizeRecent: boolean;
  focusOnModified: boolean;
}

export class SmartFileSelector {
  private static instance: SmartFileSelector;
  private strategy: ContextStrategy;
  private workspaceFiles: FileContext[] = [];
  private lastAnalysis: Date | null = null;
  
  private constructor() {
    this.strategy = {
      maxTokens: 45000, // Conservative limit (Cursor uses ~50k)
      maxFiles: 20,     // Cursor typically selects 15-25 files
      relevanceThreshold: 0.3,
      includeTests: false,
      includeDocs: false,
      prioritizeRecent: true,
      focusOnModified: true
    };
  }

  public static getInstance(): SmartFileSelector {
    if (!SmartFileSelector.instance) {
      SmartFileSelector.instance = new SmartFileSelector();
    }
    return SmartFileSelector.instance;
  }

  /**
   * CORE FUNCTION: Cursor-style intelligent file selection
   */
  public async selectOptimalFiles(userQuery?: string): Promise<SmartSelection> {
    console.log('🚀 SmartFileSelector: Starting Cursor-style file selection...');
    
    // 1. Analyze workspace (like Cursor does)
    await this.analyzeWorkspace();
    
    // 2. Score relevance for each file (Cursor's core algorithm)
    const scoredFiles = await this.scoreFileRelevance(userQuery);
    
    // 3. Apply smart selection algorithm (enhanced beyond Cursor)
    const selection = await this.applySelectionAlgorithm(scoredFiles);
    
    // 4. Generate optimization suggestions (OUR enhancement)
    const suggestions = await this.generateOptimizationSuggestions(selection);
    
    console.log(`✅ SmartFileSelector: Selected ${selection.selectedFiles.length} files, ${selection.totalTokens} tokens, $${selection.estimatedCost.toFixed(4)} cost`);
    
    return {
      ...selection,
      optimizationSuggestions: suggestions,
      confidenceScore: this.calculateConfidenceScore(selection)
    };
  }

  /**
   * Analyze workspace files (Cursor-inspired discovery)
   */
  private async analyzeWorkspace(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.workspaceFiles = [];
      return;
    }

    this.workspaceFiles = [];
    const startTime = Date.now();

    try {
      // Find relevant files (exclude noise like Cursor does)
      const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx,py,java,cpp,c,h,go,rs,php,rb,swift,kt,dart}',
        '**/node_modules/**,**/dist/**,**/build/**,**/.git/**,**/target/**',
        1000 // Limit to prevent performance issues
      );

      console.log(`🔍 SmartFileSelector: Found ${files.length} potential files`);

      // Analyze each file (parallel processing like Cursor)
      const analysisPromises = files.slice(0, 200).map(file => this.analyzeFile(file));
      const fileContexts = await Promise.all(analysisPromises);
      
      this.workspaceFiles = fileContexts.filter(ctx => ctx !== null) as FileContext[];
      
      const analysisTime = Date.now() - startTime;
      console.log(`✅ SmartFileSelector: Analyzed ${this.workspaceFiles.length} files in ${analysisTime}ms`);
      
      this.lastAnalysis = new Date();

    } catch (error) {
      console.error('🚨 SmartFileSelector: Workspace analysis failed:', error);
      this.workspaceFiles = [];
    }
  }

  /**
   * Analyze individual file (extract metadata like Cursor)
   */
  private async analyzeFile(fileUri: vscode.Uri): Promise<FileContext | null> {
    try {
      const document = await vscode.workspace.openTextDocument(fileUri);
      const content = document.getText();
      const stats = await vscode.workspace.fs.stat(fileUri);
      
      // Skip very large files (performance optimization)
      if (content.length > 100000) {
        return null;
      }

      // Extract file metadata
      const language = this.detectLanguage(fileUri.fsPath);
      const tokenCount = Math.ceil(content.length / 4); // Rough estimation
      const costImpact = tokenCount * 0.000003; // Claude Sonnet pricing
      const dependencies = this.extractDependencies(content, language);
      
      return {
        path: fileUri.fsPath,
        content: content.substring(0, 5000), // Store preview only
        language,
        size: content.length,
        lastModified: new Date(stats.mtime),
        relevanceScore: 0, // Will be calculated later
        tokenCount,
        costImpact,
        dependencies,
        contextType: 'noise' // Will be determined by relevance scoring
      };

    } catch (error) {
      console.warn(`🚨 SmartFileSelector: Failed to analyze ${fileUri.fsPath}:`, error);
      return null;
    }
  }

  /**
   * CURSOR'S CORE: Relevance scoring algorithm
   */
  private async scoreFileRelevance(userQuery?: string): Promise<FileContext[]> {
    console.log('🧠 SmartFileSelector: Computing relevance scores (Cursor-style)...');
    
    const scoredFiles = this.workspaceFiles.map(file => {
      let relevanceScore = 0;
      
      // 1. Recency Score (Cursor prioritizes recently modified)
      const daysSinceModified = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - (daysSinceModified / 30)); // Decay over 30 days
      relevanceScore += recencyScore * 0.3;
      
      // 2. File Type Score (Cursor knows which files are important)
      const typeScore = this.calculateFileTypeScore(file);
      relevanceScore += typeScore * 0.2;
      
      // 3. Size Score (moderate size = more relevant)
      const sizeScore = this.calculateSizeScore(file.size);
      relevanceScore += sizeScore * 0.1;
      
      // 4. Dependency Score (files with many connections are important)
      const dependencyScore = Math.min(1, file.dependencies.length / 10);
      relevanceScore += dependencyScore * 0.2;
      
      // 5. Query Relevance (if user provides context)
      if (userQuery) {
        const queryScore = this.calculateQueryRelevance(file, userQuery);
        relevanceScore += queryScore * 0.2;
      }
      
      // Update file with calculated score
      file.relevanceScore = Math.min(1, relevanceScore);
      file.contextType = this.determineContextType(file.relevanceScore);
      
      return file;
    });

    // Sort by relevance (highest first, like Cursor)
    return scoredFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * ENHANCED: Smart selection algorithm (better than Cursor)
   */
  private async applySelectionAlgorithm(scoredFiles: FileContext[]): Promise<SmartSelection> {
    const selectedFiles: FileContext[] = [];
    const rejectedFiles: FileContext[] = [];
    let totalTokens = 0;
    let estimatedCost = 0;

    // Apply selection strategy (enhanced beyond Cursor)
    for (const file of scoredFiles) {
      const wouldExceedLimit = totalTokens + file.tokenCount > this.strategy.maxTokens;
      const wouldExceedFileLimit = selectedFiles.length >= this.strategy.maxFiles;
      const belowThreshold = file.relevanceScore < this.strategy.relevanceThreshold;
      
      // Smart decision making (considers cost impact unlike Cursor)
      if (wouldExceedLimit || wouldExceedFileLimit || belowThreshold) {
        rejectedFiles.push(file);
        continue;
      }
      
      // Apply file type filters
      if (!this.strategy.includeTests && this.isTestFile(file.path)) {
        rejectedFiles.push(file);
        continue;
      }
      
      if (!this.strategy.includeDocs && this.isDocumentationFile(file.path)) {
        rejectedFiles.push(file);
        continue;
      }
      
      // Select file
      selectedFiles.push(file);
      totalTokens += file.tokenCount;
      estimatedCost += file.costImpact;
    }

    console.log(`🎯 SmartFileSelector: Selected ${selectedFiles.length}/${scoredFiles.length} files`);
    console.log(`📊 Total tokens: ${totalTokens}, Cost: $${estimatedCost.toFixed(4)}`);

    return {
      selectedFiles,
      rejectedFiles,
      totalTokens,
      estimatedCost,
      optimizationSuggestions: [],
      confidenceScore: 0
    };
  }

  /**
   * OUR ENHANCEMENT: Proactive optimization suggestions
   */
  private async generateOptimizationSuggestions(selection: SmartSelection): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Cost optimization suggestions
    if (selection.estimatedCost > 0.50) {
      suggestions.push(`💰 High cost detected ($${selection.estimatedCost.toFixed(4)}). Consider reducing file selection.`);
    }
    
    // Token optimization suggestions  
    if (selection.totalTokens > 40000) {
      suggestions.push(`⚠️ High token count (${selection.totalTokens}). Risk of context window overflow.`);
    }
    
    // File selection suggestions
    const highRelevanceFiles = selection.selectedFiles.filter(f => f.relevanceScore > 0.8);
    if (highRelevanceFiles.length < 3) {
      suggestions.push(`🎯 Few high-relevance files found. Consider refining search criteria.`);
    }
    
    // Performance suggestions
    const largeFiles = selection.selectedFiles.filter(f => f.size > 10000);
    if (largeFiles.length > 5) {
      suggestions.push(`📄 Many large files selected. Consider file condensation for better performance.`);
    }
    
    // Proactive cache warning
    if (selection.totalTokens > 35000) {
      suggestions.push(`🚨 Cache explosion risk! This selection may cause exponential token growth.`);
    }
    
    return suggestions;
  }

  /**
   * Utility functions (Cursor-inspired implementations)
   */
  private detectLanguage(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    const languageMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.js': 'javascript',
      '.jsx': 'javascriptreact',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.dart': 'dart'
    };
    return languageMap[extension] || 'plaintext';
  }

  private extractDependencies(content: string, language: string): string[] {
    const dependencies: string[] = [];
    
    // Extract imports/requires based on language
    const patterns: { [key: string]: RegExp } = {
      typescript: /import.*from ['"]([^'"]+)['"]/g,
      javascript: /(?:import.*from ['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g,
      python: /(?:from\s+(\S+)\s+import|import\s+(\S+))/g,
      java: /import\s+([^;]+);/g
    };
    
    const pattern = patterns[language];
    if (pattern) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const dep = match[1] || match[2];
        if (dep && !dep.startsWith('.')) {
          dependencies.push(dep);
        }
      }
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  private calculateFileTypeScore(file: FileContext): number {
    // Prioritize certain file types (like Cursor does)
    const highValueTypes = ['typescript', 'javascript', 'python', 'java'];
    const mediumValueTypes = ['cpp', 'c', 'go', 'rust'];
    
    if (highValueTypes.includes(file.language)) return 1.0;
    if (mediumValueTypes.includes(file.language)) return 0.7;
    return 0.3;
  }

  private calculateSizeScore(size: number): number {
    // Optimal size range (not too small, not too large)
    if (size < 500) return 0.3;        // Too small
    if (size < 5000) return 1.0;       // Perfect size
    if (size < 15000) return 0.7;      // Large but manageable
    return 0.3;                        // Too large
  }

  private calculateQueryRelevance(file: FileContext, query: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const fileContent = file.content.toLowerCase();
    const fileName = path.basename(file.path).toLowerCase();
    
    let relevance = 0;
    
    for (const word of queryWords) {
      if (fileName.includes(word)) relevance += 0.5;
      if (fileContent.includes(word)) relevance += 0.2;
    }
    
    return Math.min(1, relevance);
  }

  private determineContextType(relevanceScore: number): 'primary' | 'secondary' | 'supporting' | 'noise' {
    if (relevanceScore >= 0.8) return 'primary';
    if (relevanceScore >= 0.6) return 'secondary';
    if (relevanceScore >= 0.3) return 'supporting';
    return 'noise';
  }

  private isTestFile(filePath: string): boolean {
    return /\.(test|spec)\.|\/tests?\/|\/spec\//.test(filePath);
  }

  private isDocumentationFile(filePath: string): boolean {
    return /\.(md|txt|rst|doc)$/i.test(filePath) || /\/docs?\//.test(filePath);
  }

  private calculateConfidenceScore(selection: SmartSelection): number {
    const avgRelevance = selection.selectedFiles.reduce((sum, f) => sum + f.relevanceScore, 0) / selection.selectedFiles.length;
    const tokenUtilization = selection.totalTokens / this.strategy.maxTokens;
    const fileUtilization = selection.selectedFiles.length / this.strategy.maxFiles;
    
    // High confidence if good relevance and reasonable utilization
    return (avgRelevance * 0.5) + ((1 - Math.abs(0.7 - tokenUtilization)) * 0.3) + ((1 - Math.abs(0.7 - fileUtilization)) * 0.2);
  }

  /**
   * Configuration methods
   */
  public updateStrategy(updates: Partial<ContextStrategy>): void {
    this.strategy = { ...this.strategy, ...updates };
    console.log('🔧 SmartFileSelector: Strategy updated:', updates);
  }

  public getStrategy(): ContextStrategy {
    return { ...this.strategy };
  }

  /**
   * CURSOR-KILLER: Enhanced context optimization
   */
  public async optimizeForCostEfficiency(): Promise<void> {
    // Reduce token limit for cost optimization
    this.strategy.maxTokens = Math.min(this.strategy.maxTokens, 30000);
    this.strategy.relevanceThreshold = Math.max(this.strategy.relevanceThreshold, 0.5);
    this.strategy.includeTests = false;
    this.strategy.includeDocs = false;
    
    console.log('💰 SmartFileSelector: Optimized for cost efficiency');
  }

  public async optimizeForPerformance(): Promise<void> {
    // Reduce file count for performance
    this.strategy.maxFiles = Math.min(this.strategy.maxFiles, 15);
    this.strategy.maxTokens = Math.min(this.strategy.maxTokens, 35000);
    this.strategy.prioritizeRecent = true;
    
    console.log('⚡ SmartFileSelector: Optimized for performance');
  }
}