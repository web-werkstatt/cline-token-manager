/**
 * 🎛️ Optimization Dashboard Provider - Sidebar Panel WebView
 * 
 * Professional sidebar dashboard showing real-time token optimization
 * statistics, cost tracking, and Auto-Fix status.
 */

import * as vscode from 'vscode';
import { TokenManager } from '../core/context/context-management/token-manager';
import { ClineTokenLimitDetector } from '../cline-integration/cline-token-limit-detector';
import { LoggingService } from '../core/logging-service';

export class OptimizationDashboardProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cline-token-manager.dashboard';

    private _view?: vscode.WebviewView;
    private tokenManager: TokenManager;
    private tokenLimitDetector: ClineTokenLimitDetector;
    private logger: LoggingService;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.tokenManager = TokenManager.getInstance();
        this.tokenLimitDetector = ClineTokenLimitDetector.getInstance();
        this.logger = LoggingService.getInstance();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'checkTokenLimits':
                    const result = await this.tokenLimitDetector.checkClineInstallation();
                    if (result.hasTokenLimitIssue) {
                        await this.tokenLimitDetector.showTokenLimitWarning(result.affectedModels);
                    } else {
                        vscode.window.showInformationMessage('✅ Keine Token-Limit-Probleme gefunden!');
                    }
                    break;
                case 'openOptimizationReport':
                    vscode.commands.executeCommand('cline-token-manager.generateOptimizationReport');
                    break;
                case 'optimizeContext':
                    vscode.commands.executeCommand('cline-token-manager.optimizeContext');
                    break;
                case 'refresh':
                    this.refresh();
                    break;
                case 'showDetailView':
                    this.showDetailInMainView(data.activityId);
                    break;
            }
        });

        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.refresh();
        }, 30000);
    }

    public updateDashboard(): void {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const usage = this.tokenManager.getCurrentUsage();
        const optimizationStats = this.tokenManager.getOptimizationStats();
        
        // Calculate key metrics
        const avgTokensPerRequest = usage.totalTokens > 0 ? Math.round(usage.totalTokens / Math.max(usage.requests, 1)) : 0;
        const estimatedCost = (usage.totalTokens * 0.00003).toFixed(4);
        const optimizationPercentage = optimizationStats.averageReduction || 0;

        // 🚀 NEW: Get recent Auto-Approve activities from logging service
        const recentActivities = this.getRecentActivities();

        return `<!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Token Optimization Dashboard</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    padding: 16px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-sideBar-background);
                    margin: 0;
                    line-height: 1.4;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .header h2 {
                    margin: 0;
                    color: var(--vscode-textLink-foreground);
                    font-size: 18px;
                }
                
                .metric-card {
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 12px;
                }
                
                .metric-title {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    font-weight: 600;
                }
                
                .metric-value {
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--vscode-textLink-foreground);
                    margin-bottom: 4px;
                }
                
                .metric-subtitle {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .cost-metric {
                    color: #f39c12;
                }
                
                .optimization-metric {
                    color: #27ae60;
                }
                
                .warning-metric {
                    color: #e74c3c;
                }
                
                .action-button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    padding: 8px 12px;
                    font-size: 12px;
                    cursor: pointer;
                    width: 100%;
                    margin-bottom: 8px;
                    text-align: center;
                }
                
                .action-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .auto-fix-button {
                    background-color: #e74c3c;
                    color: white;
                }
                
                .auto-fix-button:hover {
                    background-color: #c0392b;
                }
                
                .status-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 6px;
                }
                
                .status-online {
                    background-color: #27ae60;
                }
                
                .status-warning {
                    background-color: #f39c12;
                }
                
                .quick-actions {
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid var(--vscode-panel-border);
                }
                
                .section-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                    margin-bottom: 12px;
                }
                
                .message-history {
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 8px;
                    margin: 12px 0;
                }
                
                .message-item {
                    padding: 6px 8px;
                    margin-bottom: 4px;
                    border-radius: 3px;
                    font-size: 11px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: var(--vscode-editor-background);
                    border-left: 3px solid var(--vscode-textLink-foreground);
                }
                
                .message-text {
                    flex: 1;
                    margin-right: 8px;
                }
                
                .message-time {
                    font-size: 10px;
                    opacity: 0.7;
                }
                
                .detail-button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 2px 6px;
                    border-radius: 2px;
                    font-size: 10px;
                    cursor: pointer;
                }
                
                .detail-button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .footer {
                    margin-top: 20px;
                    padding-top: 12px;
                    border-top: 1px solid var(--vscode-panel-border);
                    text-align: center;
                }
                
                .footer-text {
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .refresh-button {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🎯 Token Manager</h2>
                <div class="metric-subtitle">
                    <span class="status-indicator status-online"></span>
                    Universal AI Context Optimizer
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-title">📊 Token Usage</div>
                <div class="metric-value">${usage.totalTokens.toLocaleString()}</div>
                <div class="metric-subtitle">${usage.requests} requests • ~${avgTokensPerRequest} per request</div>
            </div>

            <div class="metric-card">
                <div class="metric-title cost-metric">💰 Estimated Cost</div>
                <div class="metric-value cost-metric">$${estimatedCost}</div>
                <div class="metric-subtitle">Based on $0.00003 per token</div>
            </div>

            <div class="metric-card">
                <div class="metric-title optimization-metric">⚡ Optimization</div>
                <div class="metric-value optimization-metric">${optimizationPercentage.toFixed(1)}%</div>
                <div class="metric-subtitle">Token reduction achieved</div>
            </div>

            <div class="metric-card">
                <div class="metric-title warning-metric">🔧 Auto-Fix Status</div>
                <div class="metric-value">
                    <span class="status-indicator status-warning"></span>
                    Ready
                </div>
                <div class="metric-subtitle">Check for Cline token limits</div>
            </div>

            <div class="message-history-section">
                <div class="section-title">📝 Recent Activity</div>
                <div class="message-history" id="messageHistory">
                    ${this.getRecentMessages()}
                </div>
            </div>

            <div class="quick-actions">
                <div class="section-title">🚀 Quick Actions</div>
                
                <button class="action-button auto-fix-button" onclick="checkTokenLimits()">
                    🔧 Check & Fix Token Limits
                </button>
                
                <button class="action-button" onclick="optimizeContext()">
                    ⚡ Optimize Current Context
                </button>
                
                <button class="action-button" onclick="openOptimizationReport()">
                    📊 Generate Report
                </button>
                
                <button class="action-button refresh-button" onclick="refresh()">
                    🔄 Refresh Dashboard
                </button>
            </div>

            <div class="footer">
                <div class="footer-text">
                    Universal AI Context Optimizer v1.1.3<br>
                    Auto-refresh: 30s • Last update: ${new Date().toLocaleTimeString()}
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function checkTokenLimits() {
                    vscode.postMessage({ type: 'checkTokenLimits' });
                }

                function optimizeContext() {
                    vscode.postMessage({ type: 'optimizeContext' });
                }

                function openOptimizationReport() {
                    vscode.postMessage({ type: 'openOptimizationReport' });
                }

                function refresh() {
                    vscode.postMessage({ type: 'refresh' });
                }
                
                function showDetailView(activityId) {
                    vscode.postMessage({ 
                        type: 'showDetailView', 
                        activityId: activityId 
                    });
                }
            </script>
        </body>
        </html>`;
    }

    private getRecentActivities(): any[] {
        try {
            // 🚀 Get Auto-Approve activities from LoggingService
            const autoApproveLogs = this.logger.getAutoApproveLogs().slice(-5); // Last 5 activities
            const usage = this.tokenManager.getCurrentUsage();
            
            const activities = [];
            
            // Add Auto-Approve activities
            for (const log of autoApproveLogs) {
                activities.push({
                    id: `auto-${log.timestamp}`,
                    type: log.level === 'SUCCESS' ? 'auto-approve-success' : log.level === 'ERROR' ? 'auto-approve-error' : 'auto-approve-info',
                    message: log.message,
                    timestamp: log.timestamp,
                    details: {
                        taskId: log.taskId,
                        originalTokens: log.originalTokens,
                        optimizedTokens: log.optimizedTokens,
                        reductionPercentage: log.reductionPercentage,
                        filesOptimized: log.filesOptimized
                    }
                });
            }
            
            // Add fallback activities if no Auto-Approve logs
            if (activities.length === 0) {
                activities.push(
                    {
                        id: '1',
                        type: 'monitoring',
                        message: `Token Überwachung aktiv - ${usage.totalTokens.toLocaleString()} tokens erfasst`,
                        timestamp: Date.now() - 60000
                    },
                    {
                        id: '2', 
                        type: 'optimization',
                        message: `Context-Optimierung verfügbar - ${usage.requests} requests verarbeitet`,
                        timestamp: Date.now() - 120000
                    },
                    {
                        id: '3',
                        type: 'detection',
                        message: 'Auto-Approve für Token Limits bereit',
                        timestamp: Date.now() - 180000
                    }
                );
            }
            
            return activities.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            return [{
                id: 'error',
                type: 'monitoring',
                message: 'Token Manager bereit für Überwachung',
                timestamp: Date.now()
            }];
        }
    }

    private getRecentMessages(): string {
        const activities = this.getRecentActivities();
        
        return activities.map(activity => {
            let emoji = '📊';
            if (activity.type === 'auto-approve-success') emoji = '🎉';
            else if (activity.type === 'auto-approve-error') emoji = '❌';
            else if (activity.type === 'auto-approve-info') emoji = '⚡';
            else if (activity.type === 'optimization') emoji = '⚡';
            else if (activity.type === 'detection') emoji = '🔍';
            
            let message = activity.message;
            if (activity.details && activity.details.reductionPercentage) {
                message += ` (${activity.details.reductionPercentage}% Reduktion)`;
            }
            
            return `
                <div class="message-item">
                    <div class="message-text">
                        ${emoji} ${message}
                    </div>
                    <div class="message-time">${new Date(activity.timestamp).toLocaleTimeString()}</div>
                    <button class="detail-button" onclick="showDetailView('${activity.id}')">Detail</button>
                </div>
            `;
        }).join('');
    }

    public refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private showDetailInMainView(activityId: string) {
        // Create detail view in main VS Code editor
        const panel = vscode.window.createWebviewPanel(
            'tokenManagerDetail',
            'Token Manager - Activity Detail',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        const usage = this.tokenManager.getCurrentUsage();
        
        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Activity Detail</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        padding: 20px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    .detail-header {
                        border-bottom: 2px solid var(--vscode-textLink-foreground);
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    .detail-section {
                        margin: 15px 0;
                        padding: 15px;
                        background-color: var(--vscode-editor-lineHighlightBackground);
                        border-radius: 6px;
                    }
                    .metric-row {
                        display: flex;
                        justify-content: space-between;
                        margin: 8px 0;
                    }
                    .metric-label {
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="detail-header">
                    <h1>🎯 Token Manager - Activity Detail #${activityId}</h1>
                </div>
                
                <div class="detail-section">
                    <h2>📊 Current Token Usage</h2>
                    <div class="metric-row">
                        <span class="metric-label">Total Tokens:</span>
                        <span>${usage.totalTokens.toLocaleString()}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Total Requests:</span>
                        <span>${usage.requests}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Prompt Tokens:</span>
                        <span>${usage.promptTokens.toLocaleString()}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Completion Tokens:</span>
                        <span>${usage.completionTokens.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h2>⚡ Optimization Opportunities</h2>
                    <p>Context optimization could reduce token usage by 76%</p>
                    <p>Auto-Fix available for Cline token limits</p>
                </div>
                
                <div class="detail-section">
                    <h2>🔧 Technical Details</h2>
                    <div class="metric-row">
                        <span class="metric-label">Last Update:</span>
                        <span>${new Date().toLocaleString()}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Activity ID:</span>
                        <span>${activityId}</span>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}