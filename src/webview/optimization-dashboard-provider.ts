/**
 * 🎛️ Optimization Dashboard Provider - Sidebar Panel WebView
 * 
 * Professional sidebar dashboard showing real-time token optimization
 * statistics, cost tracking, and Auto-Fix status.
 */

import * as vscode from 'vscode';
import { TokenManager } from '../core/context/context-management/token-manager';
import { ClineTokenLimitDetector } from '../cline-integration/cline-token-limit-detector';

export class OptimizationDashboardProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cline-token-manager.dashboard';

    private _view?: vscode.WebviewView;
    private tokenManager: TokenManager;
    private tokenLimitDetector: ClineTokenLimitDetector;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.tokenManager = TokenManager.getInstance();
        this.tokenLimitDetector = ClineTokenLimitDetector.getInstance();
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
            }
        });

        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.refresh();
        }, 30000);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const usage = this.tokenManager.getCurrentUsage();
        const optimizationStats = this.tokenManager.getOptimizationStats();
        
        // Calculate key metrics
        const avgTokensPerRequest = usage.totalTokens > 0 ? Math.round(usage.totalTokens / Math.max(usage.requestCount, 1)) : 0;
        const estimatedCost = (usage.totalTokens * 0.00003).toFixed(4);
        const optimizationPercentage = optimizationStats.reductionPercentage || 0;

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
                <div class="metric-subtitle">${usage.requestCount} requests • ~${avgTokensPerRequest} per request</div>
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
            </script>
        </body>
        </html>`;
    }

    public refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }
}