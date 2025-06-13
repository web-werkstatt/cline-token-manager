import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface PromptSizeLog {
    timestamp: Date;
    promptSize: number;
    promptTokens: number;
    cacheTokens?: number;
    requestId: string;
    source: 'cline' | 'other';
    status: 'success' | 'failed' | 'too_large';
    errorMessage?: string;
    breakdown?: {
        systemPrompt?: number;
        userMessage?: number;
        fileContents?: number;
        conversationHistory?: number;
        toolResults?: number;
    };
}

export interface PromptAnalysis {
    averageSize: number;
    maxSize: number;
    totalRequests: number;
    failedRequests: number;
    recentTrend: 'increasing' | 'decreasing' | 'stable';
    problemRequests: PromptSizeLog[];
    recommendations: string[];
}

export class PromptSizeMonitor {
    private static instance: PromptSizeMonitor;
    private logs: PromptSizeLog[] = [];
    private maxLogSize = 1000;
    private clineStoragePath: string | null = null;
    private logFilePath: string;
    private isWatching = false;
    
    private constructor(private context: vscode.ExtensionContext) {
        this.logFilePath = path.join(context.globalStorageUri.fsPath, 'prompt-size-logs.json');
        this.initializeStorage();
        this.loadExistingLogs();
        this.startMonitoring();
    }
    
    public static getInstance(context?: vscode.ExtensionContext): PromptSizeMonitor {
        if (!PromptSizeMonitor.instance && context) {
            PromptSizeMonitor.instance = new PromptSizeMonitor(context);
        }
        return PromptSizeMonitor.instance;
    }
    
    private async initializeStorage(): Promise<void> {
        try {
            await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);
        } catch (error) {
            // Directory might already exist
        }
        
        // Find Cline storage path
        const os = require('os');
        let clineStorageBase = '';
        
        if (process.platform === 'win32') {
            clineStorageBase = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
        } else if (process.platform === 'darwin') {
            clineStorageBase = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
        } else {
            clineStorageBase = path.join(os.homedir(), '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
        }
        
        if (fs.existsSync(clineStorageBase)) {
            this.clineStoragePath = clineStorageBase;
            console.log('🔍 PromptSizeMonitor: Found Cline storage at:', this.clineStoragePath);
        }
    }
    
    private loadExistingLogs(): void {
        try {
            if (fs.existsSync(this.logFilePath)) {
                const data = fs.readFileSync(this.logFilePath, 'utf8');
                const parsed = JSON.parse(data);
                this.logs = parsed.map((log: any) => ({
                    ...log,
                    timestamp: new Date(log.timestamp)
                }));
                console.log(`🔍 PromptSizeMonitor: Loaded ${this.logs.length} existing logs`);
            }
        } catch (error) {
            console.error('🔍 PromptSizeMonitor: Failed to load existing logs:', error);
            this.logs = [];
        }
    }
    
    private saveLogsToFile(): void {
        try {
            const data = JSON.stringify(this.logs, null, 2);
            fs.writeFileSync(this.logFilePath, data);
        } catch (error) {
            console.error('🔍 PromptSizeMonitor: Failed to save logs:', error);
        }
    }
    
    private startMonitoring(): void {
        if (this.isWatching || !this.clineStoragePath) return;
        
        try {
            const tasksPath = path.join(this.clineStoragePath, 'tasks');
            
            if (fs.existsSync(tasksPath)) {
                // Watch for changes in Cline's API conversation history
                const watcher = vscode.workspace.createFileSystemWatcher(
                    new vscode.RelativePattern(tasksPath, '**/api_conversation_history.json')
                );
                
                watcher.onDidChange((uri) => this.analyzeAPIHistory(uri.fsPath));
                watcher.onDidCreate((uri) => this.analyzeAPIHistory(uri.fsPath));
                
                this.isWatching = true;
                console.log('🔍 PromptSizeMonitor: Started monitoring Cline API calls');
                
                // Initial analysis of existing files
                this.scanExistingAPIHistory(tasksPath);
            }
        } catch (error) {
            console.error('🔍 PromptSizeMonitor: Failed to start monitoring:', error);
        }
    }
    
    private async scanExistingAPIHistory(tasksPath: string): Promise<void> {
        try {
            const taskDirs = fs.readdirSync(tasksPath)
                .filter((dir: string) => fs.statSync(path.join(tasksPath, dir)).isDirectory())
                .sort()
                .reverse(); // Most recent first
            
            for (const taskDir of taskDirs.slice(0, 5)) { // Last 5 tasks
                const apiHistoryPath = path.join(tasksPath, taskDir, 'api_conversation_history.json');
                if (fs.existsSync(apiHistoryPath)) {
                    await this.analyzeAPIHistory(apiHistoryPath);
                }
            }
        } catch (error) {
            console.error('🔍 PromptSizeMonitor: Failed to scan existing API history:', error);
        }
    }
    
    private async analyzeAPIHistory(filePath: string): Promise<void> {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const apiHistory = JSON.parse(data);
            
            for (const entry of apiHistory) {
                if (entry.ts && entry.request) {
                    await this.analyzeAPIRequest(entry, path.basename(path.dirname(filePath)));
                }
            }
        } catch (error) {
            console.error('🔍 PromptSizeMonitor: Failed to analyze API history:', filePath, error);
        }
    }
    
    private async analyzeAPIRequest(entry: any, taskId: string): Promise<void> {
        try {
            const request = entry.request;
            const response = entry.response;
            const timestamp = new Date(entry.ts);
            
            // Skip if we already logged this request (based on timestamp and task)
            const existingLog = this.logs.find(log => 
                Math.abs(log.timestamp.getTime() - timestamp.getTime()) < 1000 && 
                log.requestId.includes(taskId)
            );
            if (existingLog) return;
            
            // Calculate prompt size
            const promptAnalysis = this.calculatePromptSize(request);
            
            // Determine status
            let status: 'success' | 'failed' | 'too_large' = 'success';
            let errorMessage: string | undefined;
            
            if (response && response.error) {
                status = 'failed';
                errorMessage = response.error.message || 'Unknown error';
                
                if (errorMessage && (errorMessage.includes('prompt is too long') || errorMessage.includes('too_large'))) {
                    status = 'too_large';
                }
            }
            
            // Extract cache information if available
            let cacheTokens: number | undefined;
            if (request.messages) {
                for (const message of request.messages) {
                    if (message.cache_control) {
                        // This is a simplified extraction - actual cache calculation is complex
                        cacheTokens = this.estimateTokens(JSON.stringify(message));
                        break;
                    }
                }
            }
            
            const log: PromptSizeLog = {
                timestamp,
                promptSize: promptAnalysis.totalSize,
                promptTokens: promptAnalysis.totalTokens,
                cacheTokens,
                requestId: `${taskId}-${timestamp.getTime()}`,
                source: 'cline',
                status,
                errorMessage,
                breakdown: promptAnalysis.breakdown
            };
            
            this.addLog(log);
            
            // Log critical issues immediately
            if (status === 'too_large') {
                console.error('🚨 PROMPT TOO LARGE:', {
                    tokens: promptAnalysis.totalTokens,
                    size: promptAnalysis.totalSize,
                    breakdown: promptAnalysis.breakdown,
                    taskId
                });
                
                this.showCriticalAlert(log);
            }
            
        } catch (error) {
            console.error('🔍 PromptSizeMonitor: Failed to analyze API request:', error);
        }
    }
    
    private calculatePromptSize(request: any): {
        totalSize: number;
        totalTokens: number;
        breakdown: {
            systemPrompt?: number;
            userMessage?: number;
            fileContents?: number;
            conversationHistory?: number;
            toolResults?: number;
        };
    } {
        const breakdown: any = {};
        let totalSize = 0;
        let totalTokens = 0;
        
        if (request.messages) {
            for (const message of request.messages) {
                const messageSize = JSON.stringify(message).length;
                const messageTokens = this.estimateTokens(JSON.stringify(message));
                
                totalSize += messageSize;
                totalTokens += messageTokens;
                
                // Categorize message types
                if (message.role === 'system') {
                    breakdown.systemPrompt = (breakdown.systemPrompt || 0) + messageTokens;
                } else if (message.role === 'user') {
                    // Try to detect if this contains file contents
                    const content = JSON.stringify(message.content || '');
                    if (content.includes('<file_content>') || content.includes('```')) {
                        breakdown.fileContents = (breakdown.fileContents || 0) + messageTokens;
                    } else {
                        breakdown.userMessage = (breakdown.userMessage || 0) + messageTokens;
                    }
                } else if (message.role === 'assistant') {
                    breakdown.conversationHistory = (breakdown.conversationHistory || 0) + messageTokens;
                } else if (message.role === 'tool') {
                    breakdown.toolResults = (breakdown.toolResults || 0) + messageTokens;
                }
            }
        }
        
        // Add other request parts
        if (request.model) {
            const modelSize = JSON.stringify(request.model).length;
            totalSize += modelSize;
            totalTokens += this.estimateTokens(request.model);
        }
        
        if (request.max_tokens) {
            totalSize += 20; // Small overhead
        }
        
        return { totalSize, totalTokens, breakdown };
    }
    
    private estimateTokens(text: string): number {
        // Rough token estimation: ~4 characters per token
        // This is approximate - real tokenization would require tiktoken
        return Math.ceil(text.length / 4);
    }
    
    private addLog(log: PromptSizeLog): void {
        this.logs.push(log);
        
        // Keep only recent logs
        if (this.logs.length > this.maxLogSize) {
            this.logs = this.logs.slice(-this.maxLogSize);
        }
        
        // Save to file periodically
        if (this.logs.length % 10 === 0) {
            this.saveLogsToFile();
        }
        
        console.log('🔍 PromptSizeMonitor: Logged request:', {
            tokens: log.promptTokens,
            status: log.status,
            breakdown: log.breakdown
        });
    }
    
    private showCriticalAlert(log: PromptSizeLog): void {
        const message = `🚨 Prompt too large: ${log.promptTokens.toLocaleString()} tokens (${log.promptSize.toLocaleString()} chars)`;
        
        vscode.window.showErrorMessage(
            message,
            'View Analysis',
            'Show Breakdown',
            'Optimize Context'
        ).then(selection => {
            if (selection === 'View Analysis') {
                this.showDetailedAnalysis();
            } else if (selection === 'Show Breakdown') {
                this.showPromptBreakdown(log);
            } else if (selection === 'Optimize Context') {
                vscode.commands.executeCommand('cline-token-manager.optimizeContext');
            }
        });
    }
    
    public getRecentLogs(hours: number = 24): PromptSizeLog[] {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.logs.filter(log => log.timestamp.getTime() > cutoff);
    }
    
    public getProblemRequests(): PromptSizeLog[] {
        return this.logs.filter(log => 
            log.status === 'too_large' || log.status === 'failed'
        );
    }
    
    public analyzeCurrentState(): PromptAnalysis {
        const recentLogs = this.getRecentLogs();
        const problemRequests = this.getProblemRequests();
        
        if (recentLogs.length === 0) {
            return {
                averageSize: 0,
                maxSize: 0,
                totalRequests: 0,
                failedRequests: 0,
                recentTrend: 'stable',
                problemRequests: [],
                recommendations: ['No recent API requests found']
            };
        }
        
        const sizes = recentLogs.map(log => log.promptTokens);
        const averageSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        const maxSize = Math.max(...sizes);
        const failedRequests = recentLogs.filter(log => log.status !== 'success').length;
        
        // Analyze trend
        const recent5 = recentLogs.slice(-5);
        const earlier5 = recentLogs.slice(-10, -5);
        let recentTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        
        if (recent5.length > 0 && earlier5.length > 0) {
            const recentAvg = recent5.reduce((sum, log) => sum + log.promptTokens, 0) / recent5.length;
            const earlierAvg = earlier5.reduce((sum, log) => sum + log.promptTokens, 0) / earlier5.length;
            
            if (recentAvg > earlierAvg * 1.1) {
                recentTrend = 'increasing';
            } else if (recentAvg < earlierAvg * 0.9) {
                recentTrend = 'decreasing';
            }
        }
        
        // Generate recommendations
        const recommendations = this.generateRecommendations(recentLogs, problemRequests);
        
        return {
            averageSize,
            maxSize,
            totalRequests: recentLogs.length,
            failedRequests,
            recentTrend,
            problemRequests,
            recommendations
        };
    }
    
    private generateRecommendations(recentLogs: PromptSizeLog[], problemRequests: PromptSizeLog[]): string[] {
        const recommendations: string[] = [];
        
        if (problemRequests.length > 0) {
            recommendations.push(`🚨 ${problemRequests.length} failed requests due to size limits`);
        }
        
        // Analyze breakdown patterns
        const avgBreakdown = this.calculateAverageBreakdown(recentLogs);
        
        if (avgBreakdown.fileContents && avgBreakdown.fileContents > 100000) {
            recommendations.push('📁 File contents are consuming excessive tokens - enable compression');
        }
        
        if (avgBreakdown.conversationHistory && avgBreakdown.conversationHistory > 50000) {
            recommendations.push('💬 Conversation history is too large - reduce context window');
        }
        
        if (avgBreakdown.systemPrompt && avgBreakdown.systemPrompt > 10000) {
            recommendations.push('⚙️ System prompt is very large - consider optimization');
        }
        
        const recentAvg = recentLogs.reduce((sum, log) => sum + log.promptTokens, 0) / recentLogs.length;
        if (recentAvg > 150000) {
            recommendations.push('🎯 Switch to "smart" file selection strategy');
            recommendations.push('⚡ Enable aggressive compression');
            recommendations.push('📊 Reduce checkpoint threshold to 50%');
        } else if (recentAvg > 100000) {
            recommendations.push('🎯 Use "relevant" file selection strategy');
            recommendations.push('📊 Reduce checkpoint threshold to 60%');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('✅ Prompt sizes look healthy');
        }
        
        return recommendations;
    }
    
    private calculateAverageBreakdown(logs: PromptSizeLog[]): any {
        const totals: any = {};
        let count = 0;
        
        for (const log of logs) {
            if (log.breakdown) {
                count++;
                for (const [key, value] of Object.entries(log.breakdown)) {
                    totals[key] = (totals[key] || 0) + (value as number);
                }
            }
        }
        
        if (count === 0) return {};
        
        const averages: any = {};
        for (const [key, total] of Object.entries(totals)) {
            averages[key] = (total as number) / count;
        }
        
        return averages;
    }
    
    public async showDetailedAnalysis(): Promise<void> {
        const analysis = this.analyzeCurrentState();
        const report = this.generateDetailedReport(analysis);
        
        const panel = vscode.window.createWebviewPanel(
            'promptSizeAnalysis',
            'Prompt Size Analysis',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        panel.webview.html = this.getAnalysisWebviewContent(report);
    }
    
    private showPromptBreakdown(log: PromptSizeLog): void {
        if (!log.breakdown) {
            vscode.window.showInformationMessage('No breakdown data available for this request');
            return;
        }
        
        const breakdown = Object.entries(log.breakdown)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .map(([key, value]) => `${key}: ${(value as number).toLocaleString()} tokens`)
            .join('\n');
        
        const message = `Prompt Breakdown (${log.promptTokens.toLocaleString()} total tokens):\n\n${breakdown}`;
        
        vscode.window.showInformationMessage(message, { modal: true });
    }
    
    private generateDetailedReport(analysis: PromptAnalysis): string {
        let report = `# Prompt Size Analysis Report\n\n`;
        report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
        
        report += `## Summary\n`;
        report += `- **Total Requests:** ${analysis.totalRequests}\n`;
        report += `- **Failed Requests:** ${analysis.failedRequests}\n`;
        report += `- **Average Size:** ${analysis.averageSize.toLocaleString()} tokens\n`;
        report += `- **Maximum Size:** ${analysis.maxSize.toLocaleString()} tokens\n`;
        report += `- **Recent Trend:** ${analysis.recentTrend}\n\n`;
        
        if (analysis.problemRequests.length > 0) {
            report += `## Problem Requests\n`;
            analysis.problemRequests.forEach((req, i) => {
                report += `${i + 1}. **${req.timestamp.toLocaleString()}** - ${req.promptTokens.toLocaleString()} tokens\n`;
                if (req.errorMessage) {
                    report += `   Error: ${req.errorMessage}\n`;
                }
                if (req.breakdown) {
                    const top3 = Object.entries(req.breakdown)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, 3);
                    report += `   Top contributors: ${top3.map(([k,v]) => `${k}: ${(v as number).toLocaleString()}`).join(', ')}\n`;
                }
                report += `\n`;
            });
        }
        
        report += `## Recommendations\n`;
        analysis.recommendations.forEach(rec => {
            report += `- ${rec}\n`;
        });
        
        return report;
    }
    
    private getAnalysisWebviewContent(report: string): string {
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
                h1, h2, h3 { color: var(--vscode-editor-foreground); }
                .critical { color: var(--vscode-errorForeground); font-weight: bold; }
                .warning { color: var(--vscode-warningForeground); }
                .info { color: var(--vscode-infoForeground); }
                pre {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                }
            </style>
        </head>
        <body>
            <pre>${report}</pre>
        </body>
        </html>
        `;
    }
    
    public getAllLogs(): PromptSizeLog[] {
        return [...this.logs];
    }
    
    public clearLogs(): void {
        this.logs = [];
        this.saveLogsToFile();
    }
    
    public dispose(): void {
        this.saveLogsToFile();
    }
}