import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ContextUsageMetrics {
    currentTokens: number;
    maxTokens: number;
    usagePercentage: number;
    filesIncluded: number;
    totalWorkspaceFiles: number;
    lastCheckpoint: Date | null;
}

export interface WorkspaceAnalysis {
    totalFiles: number;
    totalSize: number;
    filesByType: Map<string, number>;
    recentlyModified: string[];
    largeFiles: string[];
    sizeCategory: 'small' | 'medium' | 'large' | 'huge';
}

export interface ContextStrategy {
    checkpointThreshold: number;
    maxFilesPerCheckpoint: number;
    fileSelectionStrategy: 'all' | 'modified' | 'relevant' | 'smart';
    compressionEnabled: boolean;
    exclusionPatterns: string[];
}

export class SmartContextManager {
    private static instance: SmartContextManager;
    private contextMetrics: ContextUsageMetrics = {
        currentTokens: 0,
        maxTokens: 200000,
        usagePercentage: 0,
        filesIncluded: 0,
        totalWorkspaceFiles: 0,
        lastCheckpoint: null
    };
    
    private workspaceAnalysis: WorkspaceAnalysis | null = null;
    private contextStrategy: ContextStrategy;
    private checkpointHistory: Array<{timestamp: Date, tokens: number, trigger: string}> = [];
    
    private constructor() {
        this.contextStrategy = this.getDefaultStrategy();
        this.initialize();
    }
    
    public static getInstance(): SmartContextManager {
        if (!SmartContextManager.instance) {
            SmartContextManager.instance = new SmartContextManager();
        }
        return SmartContextManager.instance;
    }
    
    private async initialize() {
        await this.analyzeWorkspace();
        this.adaptStrategyToWorkspace();
        this.startContextMonitoring();
    }
    
    private getDefaultStrategy(): ContextStrategy {
        return {
            checkpointThreshold: 0.75, // 75% of context window
            maxFilesPerCheckpoint: 50,
            fileSelectionStrategy: 'smart',
            compressionEnabled: true,
            exclusionPatterns: [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.git/**',
                '**/out/**',
                '**/*.log',
                '**/*.tmp',
                '**/coverage/**'
            ]
        };
    }
    
    public async analyzeWorkspace(): Promise<WorkspaceAnalysis> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return this.getEmptyAnalysis();
        }
        
        const analysis: WorkspaceAnalysis = {
            totalFiles: 0,
            totalSize: 0,
            filesByType: new Map(),
            recentlyModified: [],
            largeFiles: [],
            sizeCategory: 'small'
        };
        
        for (const folder of workspaceFolders) {
            await this.analyzeFolder(folder.uri.fsPath, analysis);
        }
        
        analysis.sizeCategory = this.categorizeWorkspaceSize(analysis);
        this.workspaceAnalysis = analysis;
        
        console.log(`🎯 Workspace Analysis Complete: ${analysis.sizeCategory} (${analysis.totalFiles} files)`);
        
        return analysis;
    }
    
    private async analyzeFolder(folderPath: string, analysis: WorkspaceAnalysis) {
        try {
            const files = await this.getFilteredFiles(folderPath);
            
            for (const file of files) {
                const stats = await fs.promises.stat(file);
                const ext = path.extname(file);
                
                analysis.totalFiles++;
                analysis.totalSize += stats.size;
                
                // Track file types
                const count = analysis.filesByType.get(ext) || 0;
                analysis.filesByType.set(ext, count + 1);
                
                // Track recently modified files (last 24 hours)
                const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
                if (stats.mtime.getTime() > dayAgo) {
                    analysis.recentlyModified.push(file);
                }
                
                // Track large files (>100KB)
                if (stats.size > 100 * 1024) {
                    analysis.largeFiles.push(file);
                }
            }
        } catch (error) {
            console.warn('Error analyzing folder:', folderPath, error);
        }
    }
    
    private async getFilteredFiles(folderPath: string): Promise<string[]> {
        const files: string[] = [];
        
        const traverseDirectory = async (dirPath: string) => {
            try {
                const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    
                    if (entry.isDirectory()) {
                        // Skip excluded directories
                        if (!this.isExcluded(fullPath)) {
                            await traverseDirectory(fullPath);
                        }
                    } else if (entry.isFile()) {
                        // Include only text files that aren't excluded
                        if (this.isTextFile(entry.name) && !this.isExcluded(fullPath)) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        };
        
        await traverseDirectory(folderPath);
        return files;
    }
    
    private isTextFile(filename: string): boolean {
        const textExtensions = [
            '.ts', '.js', '.tsx', '.jsx', '.vue', '.py', '.java', '.c', '.cpp', 
            '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt',
            '.html', '.css', '.scss', '.sass', '.less', '.xml', '.json', '.yaml',
            '.yml', '.md', '.txt', '.sql', '.sh', '.bash', '.ps1', '.dockerfile'
        ];
        
        const ext = path.extname(filename).toLowerCase();
        return textExtensions.includes(ext) || filename.startsWith('.');
    }
    
    private isExcluded(filePath: string): boolean {
        const relativePath = vscode.workspace.asRelativePath(filePath);
        
        return this.contextStrategy.exclusionPatterns.some(pattern => {
            const regexPattern = pattern
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '.');
            
            return new RegExp(regexPattern).test(relativePath);
        });
    }
    
    private categorizeWorkspaceSize(analysis: WorkspaceAnalysis): 'small' | 'medium' | 'large' | 'huge' {
        if (analysis.totalFiles < 50) return 'small';
        if (analysis.totalFiles < 200) return 'medium';
        if (analysis.totalFiles < 1000) return 'large';
        return 'huge';
    }
    
    private getEmptyAnalysis(): WorkspaceAnalysis {
        return {
            totalFiles: 0,
            totalSize: 0,
            filesByType: new Map(),
            recentlyModified: [],
            largeFiles: [],
            sizeCategory: 'small'
        };
    }
    
    private adaptStrategyToWorkspace() {
        if (!this.workspaceAnalysis) return;
        
        const { sizeCategory, totalFiles } = this.workspaceAnalysis;
        
        // Adapt strategy based on workspace size
        switch (sizeCategory) {
            case 'small':
                this.contextStrategy.checkpointThreshold = 0.8;
                this.contextStrategy.maxFilesPerCheckpoint = 100;
                this.contextStrategy.fileSelectionStrategy = 'all';
                break;
                
            case 'medium':
                this.contextStrategy.checkpointThreshold = 0.7;
                this.contextStrategy.maxFilesPerCheckpoint = 75;
                this.contextStrategy.fileSelectionStrategy = 'modified';
                break;
                
            case 'large':
                this.contextStrategy.checkpointThreshold = 0.6;
                this.contextStrategy.maxFilesPerCheckpoint = 50;
                this.contextStrategy.fileSelectionStrategy = 'relevant';
                break;
                
            case 'huge':
                this.contextStrategy.checkpointThreshold = 0.5;
                this.contextStrategy.maxFilesPerCheckpoint = 25;
                this.contextStrategy.fileSelectionStrategy = 'smart';
                this.contextStrategy.compressionEnabled = true;
                break;
        }
        
        console.log(`🎯 Context strategy adapted for ${sizeCategory} workspace:`, this.contextStrategy);
    }
    
    public shouldCreateCheckpoint(currentTokens: number, trigger: string): boolean {
        const threshold = this.contextStrategy.checkpointThreshold * this.contextMetrics.maxTokens;
        const usagePercentage = currentTokens / this.contextMetrics.maxTokens;
        
        // Update metrics
        this.contextMetrics.currentTokens = currentTokens;
        this.contextMetrics.usagePercentage = usagePercentage;
        
        // Smart checkpoint decision
        const shouldCheckpoint = this.evaluateCheckpointNeed(currentTokens, trigger);
        
        if (shouldCheckpoint) {
            this.recordCheckpoint(currentTokens, trigger);
            console.log(`🎯 Checkpoint triggered: ${trigger} (${currentTokens}/${this.contextMetrics.maxTokens} tokens)`);
        }
        
        return shouldCheckpoint;
    }
    
    private evaluateCheckpointNeed(currentTokens: number, trigger: string): boolean {
        const threshold = this.contextStrategy.checkpointThreshold * this.contextMetrics.maxTokens;
        
        // Always checkpoint if over threshold
        if (currentTokens >= threshold) {
            return true;
        }
        
        // Smart triggers based on context
        switch (trigger) {
            case 'significant_changes':
                // Only if substantial changes and approaching limit
                return currentTokens > threshold * 0.8;
                
            case 'new_files_created':
                // More lenient for new files
                return currentTokens > threshold * 0.7;
                
            case 'user_request':
                // Always honor user requests
                return true;
                
            case 'task_completion':
                // Checkpoint on major milestones
                return currentTokens > threshold * 0.6;
                
            case 'error_recovery':
                // Checkpoint for error recovery
                return currentTokens > threshold * 0.5;
                
            case 'automatic':
            default:
                // Standard threshold
                return currentTokens >= threshold;
        }
    }
    
    private recordCheckpoint(tokens: number, trigger: string) {
        this.checkpointHistory.push({
            timestamp: new Date(),
            tokens,
            trigger
        });
        
        this.contextMetrics.lastCheckpoint = new Date();
        
        // Keep only last 20 checkpoints
        if (this.checkpointHistory.length > 20) {
            this.checkpointHistory = this.checkpointHistory.slice(-20);
        }
    }
    
    public getOptimalFileSelection(availableFiles: string[]): string[] {
        if (!this.workspaceAnalysis) return availableFiles;
        
        const strategy = this.contextStrategy.fileSelectionStrategy;
        const maxFiles = this.contextStrategy.maxFilesPerCheckpoint;
        
        switch (strategy) {
            case 'all':
                return availableFiles.slice(0, maxFiles);
                
            case 'modified':
                return this.selectRecentlyModified(availableFiles, maxFiles);
                
            case 'relevant':
                return this.selectRelevantFiles(availableFiles, maxFiles);
                
            case 'smart':
                return this.selectSmartFiles(availableFiles, maxFiles);
                
            default:
                return availableFiles.slice(0, maxFiles);
        }
    }
    
    private selectRecentlyModified(files: string[], maxFiles: number): string[] {
        const recentFiles = files.filter(file => 
            this.workspaceAnalysis?.recentlyModified.includes(file)
        );
        
        // Fill remaining with other files
        const remaining = files.filter(file => !recentFiles.includes(file));
        
        return [...recentFiles, ...remaining].slice(0, maxFiles);
    }
    
    private selectRelevantFiles(files: string[], maxFiles: number): string[] {
        // Prioritize by file type relevance and size
        const scored = files.map(file => ({
            file,
            score: this.calculateRelevanceScore(file)
        }));
        
        scored.sort((a, b) => b.score - a.score);
        
        return scored.slice(0, maxFiles).map(item => item.file);
    }
    
    private selectSmartFiles(files: string[], maxFiles: number): string[] {
        // Advanced selection algorithm
        const scores = files.map(file => ({
            file,
            score: this.calculateSmartScore(file)
        }));
        
        scores.sort((a, b) => b.score - a.score);
        
        return scores.slice(0, maxFiles).map(item => item.file);
    }
    
    private calculateRelevanceScore(file: string): number {
        let score = 0;
        
        // Recently modified files get higher score
        if (this.workspaceAnalysis?.recentlyModified.includes(file)) {
            score += 10;
        }
        
        // File type relevance
        const ext = path.extname(file);
        const typeRelevance: { [key: string]: number } = {
            '.ts': 8, '.js': 8, '.tsx': 8, '.jsx': 8,
            '.py': 7, '.java': 7, '.cs': 7,
            '.html': 6, '.css': 6, '.scss': 6,
            '.json': 5, '.md': 4, '.txt': 3
        };
        score += typeRelevance[ext] || 2;
        
        // Avoid large files
        if (this.workspaceAnalysis?.largeFiles.includes(file)) {
            score -= 3;
        }
        
        return score;
    }
    
    private calculateSmartScore(file: string): number {
        let score = this.calculateRelevanceScore(file);
        
        // Additional smart factors
        const filename = path.basename(file);
        
        // Important files get higher scores
        if (['package.json', 'tsconfig.json', 'webpack.config.js'].includes(filename)) {
            score += 5;
        }
        
        // Main entry points
        if (['index.ts', 'main.ts', 'app.ts', 'extension.ts'].includes(filename)) {
            score += 8;
        }
        
        // Tests and specs get lower priority
        if (filename.includes('.test.') || filename.includes('.spec.')) {
            score -= 2;
        }
        
        return score;
    }
    
    public compressFileContent(content: string, targetReduction: number = 0.3): string {
        if (!this.contextStrategy.compressionEnabled) {
            return content;
        }
        
        const lines = content.split('\n');
        const targetLines = Math.floor(lines.length * (1 - targetReduction));
        
        // Simple compression: remove comments and empty lines first
        const compressed = lines.filter((line, index) => {
            const trimmed = line.trim();
            
            // Keep important lines
            if (trimmed.includes('export') || trimmed.includes('import') || 
                trimmed.includes('class') || trimmed.includes('function') ||
                trimmed.includes('interface') || trimmed.includes('type')) {
                return true;
            }
            
            // Remove comments and empty lines
            if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
                return false;
            }
            
            return true;
        });
        
        // If still too long, take first N lines
        const finalLines = compressed.length > targetLines 
            ? compressed.slice(0, targetLines)
            : compressed;
        
        return finalLines.join('\n');
    }
    
    private startContextMonitoring() {
        // Monitor workspace changes
        const watcher = vscode.workspace.createFileSystemWatcher('**/*');
        
        watcher.onDidChange(() => this.onWorkspaceChange());
        watcher.onDidCreate(() => this.onWorkspaceChange());
        watcher.onDidDelete(() => this.onWorkspaceChange());
        
        // Periodic analysis
        setInterval(() => {
            this.analyzeWorkspace();
        }, 5 * 60 * 1000); // Every 5 minutes
    }
    
    private async onWorkspaceChange() {
        // Debounce workspace analysis
        setTimeout(async () => {
            await this.analyzeWorkspace();
            this.adaptStrategyToWorkspace();
        }, 2000);
    }
    
    public getContextMetrics(): ContextUsageMetrics {
        return { ...this.contextMetrics };
    }
    
    public getWorkspaceAnalysis(): WorkspaceAnalysis | null {
        return this.workspaceAnalysis ? { ...this.workspaceAnalysis } : null;
    }
    
    public getContextStrategy(): ContextStrategy {
        return { ...this.contextStrategy };
    }
    
    public updateContextStrategy(updates: Partial<ContextStrategy>) {
        this.contextStrategy = { ...this.contextStrategy, ...updates };
        console.log('🎯 Context strategy updated:', this.contextStrategy);
    }
    
    public getCheckpointHistory(): Array<{timestamp: Date, tokens: number, trigger: string}> {
        return [...this.checkpointHistory];
    }
    
    public generateContextReport(): string {
        const metrics = this.getContextMetrics();
        const analysis = this.getWorkspaceAnalysis();
        const strategy = this.getContextStrategy();
        
        return `
# Context Management Report

## Current Usage
- **Tokens Used:** ${metrics.currentTokens.toLocaleString()} / ${metrics.maxTokens.toLocaleString()}
- **Usage:** ${(metrics.usagePercentage * 100).toFixed(1)}%
- **Files Included:** ${metrics.filesIncluded}
- **Last Checkpoint:** ${metrics.lastCheckpoint?.toLocaleString() || 'Never'}

## Workspace Analysis
- **Total Files:** ${analysis?.totalFiles || 0}
- **Size Category:** ${analysis?.sizeCategory || 'unknown'}
- **Recently Modified:** ${analysis?.recentlyModified.length || 0} files
- **Large Files:** ${analysis?.largeFiles.length || 0} files

## Current Strategy
- **Selection:** ${strategy.fileSelectionStrategy}
- **Checkpoint Threshold:** ${(strategy.checkpointThreshold * 100).toFixed(0)}%
- **Max Files per Checkpoint:** ${strategy.maxFilesPerCheckpoint}
- **Compression:** ${strategy.compressionEnabled ? 'Enabled' : 'Disabled'}

## Recent Checkpoints
${this.checkpointHistory.slice(-5).map(cp => 
    `- ${cp.timestamp.toLocaleString()}: ${cp.tokens.toLocaleString()} tokens (${cp.trigger})`
).join('\n')}
        `;
    }
    
    public dispose() {
        // Cleanup resources
    }
}