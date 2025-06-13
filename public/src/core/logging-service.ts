import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
    timestamp: number;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    component: string;
    message: string;
    data?: any;
}

interface AutoApproveLogEntry extends LogEntry {
    taskId?: string;
    originalTokens?: number;
    optimizedTokens?: number;
    reductionPercentage?: number;
    filesOptimized?: number;
    trigger?: string;
}

export class LoggingService {
    private static instance: LoggingService;
    private logs: LogEntry[] = [];
    private maxLogs = 1000;
    private logOutputChannel: vscode.OutputChannel;
    private logFilePath: string;

    private constructor() {
        this.logOutputChannel = vscode.window.createOutputChannel('Cline Token Manager - Auto-Approve');
        
        // Create simple log.txt in easily accessible location
        const os = require('os');
        const homeDir = os.homedir();
        
        // Try multiple locations for maximum compatibility
        const possiblePaths = [
            path.join(homeDir, 'Desktop'),
            path.join(homeDir, 'Documents'), 
            homeDir,
            '/tmp'
        ];
        
        let logDir = homeDir; // Default fallback
        for (const testPath of possiblePaths) {
            if (fs.existsSync(testPath)) {
                logDir = testPath;
                break;
            }
        }
        
        this.logFilePath = path.join(logDir, 'cline-token-manager-log.txt');
        
        // Clear log file on startup for fresh session
        try {
            fs.writeFileSync(this.logFilePath, '');
            console.log(`✅ Log file created at: ${this.logFilePath}`);
        } catch (error) {
            console.error('❌ Failed to initialize log file:', error);
            // Try fallback location
            this.logFilePath = path.join('/tmp', 'cline-token-manager-log.txt');
            try {
                fs.writeFileSync(this.logFilePath, '');
                console.log(`✅ Fallback log file created at: ${this.logFilePath}`);
            } catch (fallbackError) {
                console.error('❌ Failed to create fallback log file:', fallbackError);
            }
        }
        
        this.log('INFO', 'LoggingService', 'Development Logging initialized', { 
            logFile: this.logFilePath,
            location: 'Desktop or Home directory for easy access'
        });
    }

    public static getInstance(): LoggingService {
        if (!LoggingService.instance) {
            LoggingService.instance = new LoggingService();
        }
        return LoggingService.instance;
    }

    public log(level: LogEntry['level'], component: string, message: string, data?: any): void {
        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            component,
            message,
            data
        };

        // Add to memory
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Format for display
        const timestamp = new Date(entry.timestamp).toISOString();
        const emoji = this.getLevelEmoji(level);
        const formattedMessage = `${timestamp} ${emoji} [${component}] ${message}`;
        
        // Log to VS Code output channel
        this.logOutputChannel.appendLine(formattedMessage);
        if (data) {
            this.logOutputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
        }

        // Log to console
        console.log(formattedMessage, data ? data : '');

        // Log to file (async)
        this.writeToFile(entry);
    }

    public logAutoApprove(
        level: LogEntry['level'],
        message: string,
        details: {
            taskId?: string;
            originalTokens?: number;
            optimizedTokens?: number;
            reductionPercentage?: number;
            filesOptimized?: number;
            trigger?: string;
            error?: string;
            conversationPath?: string;
        } = {}
    ): void {
        const entry: AutoApproveLogEntry = {
            timestamp: Date.now(),
            level,
            component: 'AutoApprove',
            message,
            ...details
        };

        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Enhanced formatting for Auto-Approve logs
        const timestamp = new Date(entry.timestamp).toISOString();
        const emoji = this.getLevelEmoji(level);
        
        let formattedMessage = `${timestamp} ${emoji} [AutoApprove] ${message}`;
        
        if (details.taskId) formattedMessage += ` | Task: ${details.taskId}`;
        if (details.originalTokens && details.optimizedTokens) {
            formattedMessage += ` | Tokens: ${details.originalTokens.toLocaleString()} → ${details.optimizedTokens.toLocaleString()}`;
        }
        if (details.reductionPercentage) formattedMessage += ` | Saved: ${details.reductionPercentage}%`;
        if (details.filesOptimized) formattedMessage += ` | Files: ${details.filesOptimized}`;

        this.logOutputChannel.appendLine(formattedMessage);
        console.log(formattedMessage);

        this.writeToFile(entry);
    }

    private getLevelEmoji(level: LogEntry['level']): string {
        switch (level) {
            case 'INFO': return 'ℹ️';
            case 'SUCCESS': return '✅';
            case 'WARNING': return '⚠️';
            case 'ERROR': return '❌';
            default: return '📝';
        }
    }

    private writeToFile(entry: LogEntry): void {
        try {
            const timestamp = new Date(entry.timestamp).toISOString();
            const logLine = `${timestamp} [${entry.level}] [${entry.component}] ${entry.message}`;
            
            let detailsLine = '';
            if (entry.data) {
                // Format data more readable for development
                detailsLine = `\n  >> ${JSON.stringify(entry.data, null, 2).split('\n').join('\n  >> ')}`;
            }
            
            const fullEntry = `\n${'='.repeat(80)}\n${logLine}${detailsLine}\n${'='.repeat(80)}\n`;
            
            fs.appendFileSync(this.logFilePath, fullEntry);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    public getLogs(component?: string, level?: LogEntry['level']): LogEntry[] {
        return this.logs.filter(log => {
            if (component && log.component !== component) return false;
            if (level && log.level !== level) return false;
            return true;
        });
    }

    public getAutoApproveLogs(): AutoApproveLogEntry[] {
        return this.logs.filter(log => log.component === 'AutoApprove') as AutoApproveLogEntry[];
    }

    public showLogs(): void {
        this.logOutputChannel.show();
    }

    public exportLogs(): string {
        const autoApproveLogs = this.getAutoApproveLogs();
        
        const report = {
            exportTime: new Date().toISOString(),
            totalLogs: this.logs.length,
            autoApproveLogs: autoApproveLogs.length,
            logs: autoApproveLogs.map(log => ({
                time: new Date(log.timestamp).toISOString(),
                level: log.level,
                message: log.message,
                taskId: log.taskId,
                tokens: log.originalTokens && log.optimizedTokens ? 
                    `${log.originalTokens} → ${log.optimizedTokens}` : undefined,
                reduction: log.reductionPercentage ? `${log.reductionPercentage}%` : undefined,
                files: log.filesOptimized,
                trigger: log.trigger
            }))
        };

        return JSON.stringify(report, null, 2);
    }

    public getLogFilePath(): string {
        return this.logFilePath;
    }

    public clearLogs(): void {
        this.logs = [];
        this.logOutputChannel.clear();
        
        try {
            if (fs.existsSync(this.logFilePath)) {
                fs.writeFileSync(this.logFilePath, '');
            }
        } catch (error) {
            console.error('Failed to clear log file:', error);
        }
        
        this.log('INFO', 'LoggingService', 'Logs cleared');
    }

    /**
     * Development logging for detailed debugging - logs everything to simple txt file
     */
    public logDevelopment(component: string, action: string, details: any): void {
        const timestamp = new Date().toISOString();
        const devLogEntry = `
${'#'.repeat(100)}
[DEVELOPMENT LOG] ${timestamp}
Component: ${component}
Action: ${action}
Details:
${JSON.stringify(details, null, 2)}
${'#'.repeat(100)}
`;
        
        try {
            fs.appendFileSync(this.logFilePath, devLogEntry);
        } catch (error) {
            console.error('Failed to write development log:', error);
        }
        
        // Also log to regular system
        this.log('INFO', component, `DEV: ${action}`, details);
    }

    /**
     * Safe content extraction that handles both string and array formats
     */
    private safeExtractContent(content: any): string {
        if (!content) return '';
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            return content.map(c => c.text || c.content || String(c)).join(' ');
        }
        return String(content);
    }

    /**
     * Log conversation inputs and processing for debugging Auto-Approve
     */
    public logConversationProcessing(taskId: string, conversationData: any[], estimatedTokens: number, triggerDecision: any): void {
        this.logDevelopment('ConversationProcessor', 'Processing Cline Conversation', {
            taskId,
            conversationLength: conversationData.length,
            estimatedTokens,
            triggerDecision,
            lastUserMessage: this.safeExtractContent(conversationData.filter(msg => msg.role === 'user').slice(-1)[0]?.content).substring(0, 500) + '...',
            settings: {
                tokenThreshold: 10000,
                fileCountThreshold: 15,
                reductionThreshold: 20,
                aggressiveMode: false
            },
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log file changes and watcher activity
     */
    public logFileWatcher(eventType: string, filePath: string, details: any): void {
        this.logDevelopment('FileWatcher', `File ${eventType}`, {
            eventType,
            filePath,
            details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log token estimation details
     */
    public logTokenEstimation(content: string, estimation: any): void {
        this.logDevelopment('TokenEstimation', 'Estimating tokens for content', {
            contentLength: content.length,
            contentPreview: content.substring(0, 200) + '...',
            estimation,
            timestamp: new Date().toISOString()
        });
    }

    public getStats(): {
        totalLogs: number;
        autoApproveActions: number;
        successfulOptimizations: number;
        totalTokensSaved: number;
        averageReduction: number;
        errors: number;
    } {
        const autoApproveLogs = this.getAutoApproveLogs();
        const successfulOptimizations = autoApproveLogs.filter(log => 
            log.level === 'SUCCESS' && log.reductionPercentage && log.reductionPercentage > 0
        );
        
        const totalTokensSaved = successfulOptimizations.reduce((sum, log) => {
            if (log.originalTokens && log.optimizedTokens) {
                return sum + (log.originalTokens - log.optimizedTokens);
            }
            return sum;
        }, 0);

        const averageReduction = successfulOptimizations.length > 0 
            ? successfulOptimizations.reduce((sum, log) => sum + (log.reductionPercentage || 0), 0) / successfulOptimizations.length
            : 0;

        return {
            totalLogs: this.logs.length,
            autoApproveActions: autoApproveLogs.length,
            successfulOptimizations: successfulOptimizations.length,
            totalTokensSaved,
            averageReduction: Math.round(averageReduction),
            errors: this.logs.filter(log => log.level === 'ERROR').length
        };
    }
}