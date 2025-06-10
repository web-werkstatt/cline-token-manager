import * as vscode from 'vscode';
import { SmartContextManager, ContextUsageMetrics, WorkspaceAnalysis } from './smart-context-manager';

export interface OptimizationSuggestion {
    type: 'warning' | 'suggestion' | 'critical';
    title: string;
    description: string;
    action?: string;
    impact: 'low' | 'medium' | 'high';
    tokensToSave?: number;
}

export interface ContextOptimizationResult {
    originalTokens: number;
    optimizedTokens: number;
    tokensSaved: number;
    optimizations: string[];
    suggestions: OptimizationSuggestion[];
}

export class ContextOptimizer {
    private contextManager: SmartContextManager;
    private lastOptimizationTime: Date | null = null;
    
    constructor() {
        this.contextManager = SmartContextManager.getInstance();
    }
    
    public async analyzeAndOptimize(): Promise<ContextOptimizationResult> {
        const metrics = this.contextManager.getContextMetrics();
        const workspace = this.contextManager.getWorkspaceAnalysis();
        
        const suggestions = this.generateOptimizationSuggestions(metrics, workspace);
        const optimizations = await this.applyAutomaticOptimizations(metrics, workspace);
        
        this.lastOptimizationTime = new Date();
        
        return {
            originalTokens: metrics.currentTokens,
            optimizedTokens: metrics.currentTokens - this.calculatePotentialSavings(suggestions),
            tokensSaved: this.calculatePotentialSavings(suggestions),
            optimizations,
            suggestions
        };
    }
    
    private generateOptimizationSuggestions(
        metrics: ContextUsageMetrics, 
        workspace: WorkspaceAnalysis | null
    ): OptimizationSuggestion[] {
        const suggestions: OptimizationSuggestion[] = [];
        
        // Critical warnings
        if (metrics.usagePercentage > 0.9) {
            suggestions.push({
                type: 'critical',
                title: 'Context Nearly Full',
                description: `Context usage at ${(metrics.usagePercentage * 100).toFixed(1)}%. Immediate action required.`,
                action: 'Reduce included files or enable aggressive compression',
                impact: 'high',
                tokensToSave: Math.floor(metrics.currentTokens * 0.3)
            });
        }
        
        // High usage warnings
        if (metrics.usagePercentage > 0.75) {
            suggestions.push({
                type: 'warning',
                title: 'High Context Usage',
                description: 'Consider optimizing file selection to prevent context overflow.',
                action: 'Enable smart file selection strategy',
                impact: 'medium',
                tokensToSave: Math.floor(metrics.currentTokens * 0.2)
            });
        }
        
        // Workspace-specific suggestions
        if (workspace) {
            if (workspace.sizeCategory === 'huge' && workspace.totalFiles > 1000) {
                suggestions.push({
                    type: 'suggestion',
                    title: 'Large Workspace Detected',
                    description: `Workspace contains ${workspace.totalFiles} files. Consider using selective inclusion.`,
                    action: 'Switch to "smart" file selection strategy',
                    impact: 'high',
                    tokensToSave: Math.floor(metrics.currentTokens * 0.4)
                });
            }
            
            if (workspace.largeFiles.length > 10) {
                suggestions.push({
                    type: 'suggestion',
                    title: 'Many Large Files',
                    description: `Found ${workspace.largeFiles.length} large files that may consume excessive context.`,
                    action: 'Enable compression or exclude large files',
                    impact: 'medium',
                    tokensToSave: workspace.largeFiles.length * 1000 // Estimate
                });
            }
            
            // File type analysis
            const totalTextFiles = Array.from(workspace.filesByType.values()).reduce((a, b) => a + b, 0);
            const jsFiles = (workspace.filesByType.get('.js') || 0) + (workspace.filesByType.get('.ts') || 0);
            
            if (jsFiles / totalTextFiles > 0.7) {
                suggestions.push({
                    type: 'suggestion',
                    title: 'JavaScript-Heavy Project',
                    description: 'Consider focusing on modified files only to reduce context size.',
                    action: 'Use "modified" file selection strategy',
                    impact: 'medium',
                    tokensToSave: Math.floor(metrics.currentTokens * 0.25)
                });
            }
        }
        
        // Checkpoint frequency analysis
        const checkpointHistory = this.contextManager.getCheckpointHistory();
        if (checkpointHistory.length > 5) {
            const recentCheckpoints = checkpointHistory.slice(-5);
            const avgTimeBetween = this.calculateAverageTimeBetweenCheckpoints(recentCheckpoints);
            
            if (avgTimeBetween < 5 * 60 * 1000) { // Less than 5 minutes
                suggestions.push({
                    type: 'warning',
                    title: 'Frequent Checkpoints',
                    description: 'Context checkpoints are being created too frequently.',
                    action: 'Increase checkpoint threshold or improve file selection',
                    impact: 'medium',
                    tokensToSave: Math.floor(metrics.currentTokens * 0.15)
                });
            }
        }
        
        // Strategy suggestions based on current usage
        const strategy = this.contextManager.getContextStrategy();
        
        if (strategy.fileSelectionStrategy === 'all' && workspace?.totalFiles && workspace.totalFiles > 100) {
            suggestions.push({
                type: 'suggestion',
                title: 'Optimize File Selection',
                description: 'Using "all files" strategy with large workspace is inefficient.',
                action: 'Switch to "smart" or "relevant" strategy',
                impact: 'high',
                tokensToSave: Math.floor(metrics.currentTokens * 0.35)
            });
        }
        
        if (!strategy.compressionEnabled && metrics.usagePercentage > 0.6) {
            suggestions.push({
                type: 'suggestion',
                title: 'Enable Compression',
                description: 'File compression can significantly reduce context usage.',
                action: 'Enable compression in context settings',
                impact: 'medium',
                tokensToSave: Math.floor(metrics.currentTokens * 0.3)
            });
        }
        
        return suggestions;
    }
    
    private async applyAutomaticOptimizations(
        metrics: ContextUsageMetrics, 
        workspace: WorkspaceAnalysis | null
    ): Promise<string[]> {
        const optimizations: string[] = [];
        const strategy = this.contextManager.getContextStrategy();
        
        // Automatic emergency optimizations
        if (metrics.usagePercentage > 0.95) {
            // Emergency mode: aggressive optimization
            this.contextManager.updateContextStrategy({
                checkpointThreshold: 0.4,
                maxFilesPerCheckpoint: 15,
                fileSelectionStrategy: 'smart',
                compressionEnabled: true
            });
            optimizations.push('Emergency mode activated: Aggressive context reduction');
        } else if (metrics.usagePercentage > 0.85) {
            // High usage: moderate optimization
            this.contextManager.updateContextStrategy({
                checkpointThreshold: Math.max(0.5, strategy.checkpointThreshold - 0.1),
                maxFilesPerCheckpoint: Math.max(20, strategy.maxFilesPerCheckpoint - 10),
                compressionEnabled: true
            });
            optimizations.push('High usage detected: Reduced checkpoint threshold and enabled compression');
        }
        
        // Workspace-based optimizations
        if (workspace) {
            if (workspace.sizeCategory === 'huge' && strategy.fileSelectionStrategy === 'all') {
                this.contextManager.updateContextStrategy({
                    fileSelectionStrategy: 'smart',
                    maxFilesPerCheckpoint: 25
                });
                optimizations.push('Large workspace detected: Switched to smart file selection');
            }
            
            if (workspace.largeFiles.length > 20 && !strategy.compressionEnabled) {
                this.contextManager.updateContextStrategy({
                    compressionEnabled: true
                });
                optimizations.push('Many large files detected: Enabled compression');
            }
        }
        
        return optimizations;
    }
    
    private calculateAverageTimeBetweenCheckpoints(checkpoints: Array<{timestamp: Date}>): number {
        if (checkpoints.length < 2) return 0;
        
        let totalTime = 0;
        for (let i = 1; i < checkpoints.length; i++) {
            totalTime += checkpoints[i].timestamp.getTime() - checkpoints[i-1].timestamp.getTime();
        }
        
        return totalTime / (checkpoints.length - 1);
    }
    
    private calculatePotentialSavings(suggestions: OptimizationSuggestion[]): number {
        return suggestions.reduce((total, suggestion) => {
            return total + (suggestion.tokensToSave || 0);
        }, 0);
    }
    
    public async createOptimizationReport(): Promise<string> {
        const result = await this.analyzeAndOptimize();
        const metrics = this.contextManager.getContextMetrics();
        const workspace = this.contextManager.getWorkspaceAnalysis();
        
        let report = `# Context Optimization Report\n\n`;
        report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
        
        // Current Status
        report += `## Current Status\n`;
        report += `- **Context Usage:** ${(metrics.usagePercentage * 100).toFixed(1)}% (${metrics.currentTokens.toLocaleString()}/${metrics.maxTokens.toLocaleString()} tokens)\n`;
        report += `- **Files Included:** ${metrics.filesIncluded}\n`;
        report += `- **Workspace Size:** ${workspace?.sizeCategory || 'unknown'} (${workspace?.totalFiles || 0} files)\n\n`;
        
        // Optimization Potential
        if (result.tokensSaved > 0) {
            report += `## Optimization Potential\n`;
            report += `- **Potential Savings:** ${result.tokensSaved.toLocaleString()} tokens (${((result.tokensSaved / metrics.currentTokens) * 100).toFixed(1)}%)\n`;
            report += `- **Optimized Usage:** ${((result.optimizedTokens / metrics.maxTokens) * 100).toFixed(1)}%\n\n`;
        }
        
        // Suggestions
        if (result.suggestions.length > 0) {
            report += `## Recommendations\n\n`;
            
            const critical = result.suggestions.filter(s => s.type === 'critical');
            const warnings = result.suggestions.filter(s => s.type === 'warning');
            const suggestions = result.suggestions.filter(s => s.type === 'suggestion');
            
            if (critical.length > 0) {
                report += `### 🚨 Critical Issues\n`;
                critical.forEach(s => {
                    report += `- **${s.title}:** ${s.description}\n`;
                    if (s.action) report += `  - *Action:* ${s.action}\n`;
                    if (s.tokensToSave) report += `  - *Potential Savings:* ${s.tokensToSave.toLocaleString()} tokens\n`;
                });
                report += `\n`;
            }
            
            if (warnings.length > 0) {
                report += `### ⚠️ Warnings\n`;
                warnings.forEach(s => {
                    report += `- **${s.title}:** ${s.description}\n`;
                    if (s.action) report += `  - *Action:* ${s.action}\n`;
                    if (s.tokensToSave) report += `  - *Potential Savings:* ${s.tokensToSave.toLocaleString()} tokens\n`;
                });
                report += `\n`;
            }
            
            if (suggestions.length > 0) {
                report += `### 💡 Suggestions\n`;
                suggestions.forEach(s => {
                    report += `- **${s.title}:** ${s.description}\n`;
                    if (s.action) report += `  - *Action:* ${s.action}\n`;
                    if (s.tokensToSave) report += `  - *Potential Savings:* ${s.tokensToSave.toLocaleString()} tokens\n`;
                });
                report += `\n`;
            }
        }
        
        // Applied Optimizations
        if (result.optimizations.length > 0) {
            report += `## Automatic Optimizations Applied\n`;
            result.optimizations.forEach(opt => {
                report += `- ${opt}\n`;
            });
            report += `\n`;
        }
        
        // Workspace Analysis
        if (workspace) {
            report += `## Workspace Analysis\n`;
            report += `- **Total Files:** ${workspace.totalFiles}\n`;
            report += `- **Total Size:** ${this.formatBytes(workspace.totalSize)}\n`;
            report += `- **Recently Modified:** ${workspace.recentlyModified.length} files\n`;
            report += `- **Large Files:** ${workspace.largeFiles.length} files\n\n`;
            
            if (workspace.filesByType.size > 0) {
                report += `### File Types\n`;
                const sortedTypes = Array.from(workspace.filesByType.entries())
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10);
                
                sortedTypes.forEach(([ext, count]) => {
                    const percentage = ((count / workspace.totalFiles) * 100).toFixed(1);
                    report += `- ${ext || 'no extension'}: ${count} files (${percentage}%)\n`;
                });
                report += `\n`;
            }
        }
        
        // Tips
        report += `## General Tips\n`;
        report += `- Use "smart" file selection for large workspaces\n`;
        report += `- Enable compression when context usage > 60%\n`;
        report += `- Exclude build outputs and dependencies\n`;
        report += `- Focus on recently modified files\n`;
        report += `- Consider breaking large files into smaller modules\n`;
        
        return report;
    }
    
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    public async showOptimizationPanel(): Promise<void> {
        const report = await this.createOptimizationReport();
        
        const panel = vscode.window.createWebviewPanel(
            'contextOptimization',
            'Context Optimization',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        panel.webview.html = this.getOptimizationWebviewContent(report);
    }
    
    private getOptimizationWebviewContent(report: string): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                }
                
                h1, h2, h3 {
                    color: var(--vscode-editor-foreground);
                }
                
                .critical {
                    background-color: var(--vscode-errorBackground);
                    border-left: 4px solid var(--vscode-errorForeground);
                    padding: 10px;
                    margin: 10px 0;
                }
                
                .warning {
                    background-color: var(--vscode-warningBackground);
                    border-left: 4px solid var(--vscode-warningForeground);
                    padding: 10px;
                    margin: 10px 0;
                }
                
                .suggestion {
                    background-color: var(--vscode-infoBackground);
                    border-left: 4px solid var(--vscode-infoForeground);
                    padding: 10px;
                    margin: 10px 0;
                }
                
                .metric {
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 4px;
                }
                
                code {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 2px 4px;
                    border-radius: 2px;
                }
                
                pre {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                }
            </style>
        </head>
        <body>
            <div class="metric">
                <pre>${report}</pre>
            </div>
        </body>
        </html>
        `;
    }
}