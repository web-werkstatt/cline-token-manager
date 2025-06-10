import * as vscode from 'vscode';
import { TokenManager } from './context/context-management/token-manager';

export class TaskCompletionDetector {
    private static instance: TaskCompletionDetector;
    private lastTokenCount: number = 0;
    private lastActivity: number = Date.now();
    private inactivityTimer: NodeJS.Timeout | null = null;
    private readonly INACTIVITY_THRESHOLD = 10000; // 10 seconds
    
    private constructor(
        private tokenManager: TokenManager,
        private extensionContext: vscode.ExtensionContext
    ) {
        this.setupEventListeners();
    }
    
    public static getInstance(tokenManager: TokenManager, context: vscode.ExtensionContext): TaskCompletionDetector {
        if (!TaskCompletionDetector.instance) {
            TaskCompletionDetector.instance = new TaskCompletionDetector(tokenManager, context);
        }
        return TaskCompletionDetector.instance;
    }
    
    private setupEventListeners(): void {
        // Note: Commands 'cline-enhanced.tokenUsageUpdated' and 'cline-enhanced.taskCompleted'
        // are registered centrally in extension.ts to prevent duplicate registration errors.
        // We listen for token usage changes through the TokenManager instance instead.
        
        this.tokenManager.onUsageChange((usage: any) => {
            this.onTokenUsageUpdate(usage);
        });
    }
    
    private onTokenUsageUpdate(usage: any): void {
        const currentTokens = usage.totalTokens || 0;
        
        // If tokens increased, reset activity timer
        if (currentTokens > this.lastTokenCount) {
            this.lastActivity = Date.now();
            this.lastTokenCount = currentTokens;
            this.resetInactivityTimer();
        }
    }
    
    private resetInactivityTimer(): void {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        // Start new timer
        this.inactivityTimer = setTimeout(() => {
            this.checkForTaskCompletion();
        }, this.INACTIVITY_THRESHOLD);
    }
    
    private checkForTaskCompletion(): void {
        const timeSinceLastActivity = Date.now() - this.lastActivity;
        
        // If no token activity for threshold time, task might be complete
        if (timeSinceLastActivity >= this.INACTIVITY_THRESHOLD) {
            this.onTaskCompleted();
        }
    }
    
    private async onTaskCompleted(): Promise<void> {
        // Get final token usage stats
        const usage = this.tokenManager.getCurrentUsage();
        
        // Show notification with stats
        // Calculate cost from token usage
        const totalCost = this.tokenManager.calculateTotalCost();
        
        const choice = await vscode.window.showInformationMessage(
            `🎉 Task completed! Used ${usage.totalTokens.toLocaleString()} tokens ($${totalCost.toFixed(2)})`,
            'View Details',
            'Export Stats'
        );
        
        if (choice === 'View Details') {
            vscode.commands.executeCommand('cline-token-manager.showDashboard');
        } else if (choice === 'Export Stats') {
            vscode.commands.executeCommand('cline-token-manager.exportUsage');
        }
        
        // Reset for next task
        this.lastTokenCount = 0;
        this.lastActivity = Date.now();
    }
    
    public dispose(): void {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
    }
}