import * as vscode from 'vscode';
import * as path from 'path';
import { UniversalAIProxy } from '../api-interception/universal-ai-proxy';
import { CostEnforcementSystem } from '../api-interception/cost-enforcement';
import { CursorKiller } from '../providers/cursor-killer';
import { CopilotBypass } from '../providers/copilot-bypass';
import { LocalModelsAdapter } from '../api-interception/provider-adapters/local-adapter';

export interface DashboardData {
    universalProxy: {
        isActive: boolean;
        totalRequests: number;
        totalOptimized: number;
        totalSaved: number;
        uptime: string;
    };
    costEnforcement: {
        dailyUsage: number;
        dailyLimit: number;
        monthlyUsage: number;
        monthlyLimit: number;
        teamUsage?: number;
        teamBudget?: number;
    };
    cursorKiller: {
        isActive: boolean;
        interceptedCalls: number;
        costSaved: number;
        tokensOptimized: number;
    };
    copilotBypass: {
        isActive: boolean;
        interceptedCalls: number;
        costSaved: number;
        tokensOptimized: number;
    };
    localModels: {
        discoveredProviders: number;
        onlineProviders: number;
        providers: Array<{
            name: string;
            url: string;
            online: boolean;
            format: string;
        }>;
    };
}

/**
 * 🎛️ INTERACTIVE DASHBOARD UI - PROFESSIONAL CONTROL CENTER
 * 
 * Real WebView mit interactive controls für das Universal AI Platform:
 * - LIVE STATUS all components (Universal Proxy, Cursor Killer, etc.)
 * - INTERACTIVE CONTROLS (Start/Stop, Settings, Real-time config)
 * - PROFESSIONAL ANALYTICS (Charts, cost tracking, savings reports)
 * - REAL-TIME UPDATES (WebSocket-like communication with backend)
 * 
 * MESSAGE: "Professional control center - manage your AI monopoly killer!"
 */
export class InteractiveDashboard {
    private static instance: InteractiveDashboard;
    private panel?: vscode.WebviewPanel;
    private universalProxy: UniversalAIProxy;
    private costEnforcement: CostEnforcementSystem;
    private cursorKiller: CursorKiller;
    private copilotBypass: CopilotBypass;
    private localModelsAdapter: LocalModelsAdapter;
    private updateInterval?: NodeJS.Timeout;

    private constructor(private context: vscode.ExtensionContext) {
        this.universalProxy = UniversalAIProxy.getInstance();
        this.costEnforcement = CostEnforcementSystem.getInstance();
        this.cursorKiller = CursorKiller.getInstance();
        this.copilotBypass = CopilotBypass.getInstance();
        this.localModelsAdapter = new LocalModelsAdapter();
        console.log('🎛️ INTERACTIVE DASHBOARD INITIALIZED - PROFESSIONAL UI READY!');
    }

    public static getInstance(context?: vscode.ExtensionContext): InteractiveDashboard {
        if (!InteractiveDashboard.instance && context) {
            InteractiveDashboard.instance = new InteractiveDashboard(context);
        }
        return InteractiveDashboard.instance;
    }

    /**
     * 🚀 SHOW DASHBOARD - Create and display the interactive WebView
     */
    public async showDashboard(): Promise<void> {
        try {
            console.log('🚀 Opening Universal AI Platform Dashboard...');

            // Create or reveal the dashboard panel
            if (this.panel) {
                this.panel.reveal(vscode.ViewColumn.One);
                return;
            }

            this.panel = vscode.window.createWebviewPanel(
                'universalAIDashboard',
                '🎯 Universal AI Platform - Control Center',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'assets')),
                        vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'dashboard'))
                    ]
                }
            );

            // Set the HTML content
            this.panel.webview.html = await this.getWebviewContent();

            // Handle messages from webview
            this.panel.webview.onDidReceiveMessage(
                message => this.handleWebviewMessage(message),
                undefined,
                this.context.subscriptions
            );

            // Handle panel disposal
            this.panel.onDidDispose(
                () => {
                    this.panel = undefined;
                    if (this.updateInterval) {
                        clearInterval(this.updateInterval);
                        this.updateInterval = undefined;
                    }
                },
                null,
                this.context.subscriptions
            );

            // Start real-time updates
            this.startRealTimeUpdates();

            console.log('✅ Dashboard opened successfully');

        } catch (error) {
            console.error('❌ Error opening dashboard:', error);
            vscode.window.showErrorMessage(`Failed to open dashboard: ${error}`);
        }
    }

    /**
     * 🔄 START REAL-TIME UPDATES
     */
    private startRealTimeUpdates(): void {
        // Initial data load
        this.updateDashboardData();

        // Update every 2 seconds for real-time feel
        this.updateInterval = setInterval(() => {
            this.updateDashboardData();
        }, 2000);

        console.log('🔄 Real-time dashboard updates started');
    }

    /**
     * 📊 UPDATE DASHBOARD DATA
     */
    private async updateDashboardData(): Promise<void> {
        if (!this.panel) return;

        try {
            const data = await this.collectDashboardData();
            
            this.panel.webview.postMessage({
                command: 'updateData',
                data: data
            });

        } catch (error) {
            console.error('❌ Error updating dashboard data:', error);
        }
    }

    /**
     * 📈 COLLECT DASHBOARD DATA
     */
    private async collectDashboardData(): Promise<DashboardData> {
        // Universal Proxy stats
        const proxyStats = this.universalProxy.getStats();
        
        // Cost enforcement stats
        const costAnalytics = this.costEnforcement.getCostAnalytics();
        
        // Cursor Killer stats
        const cursorStats = this.cursorKiller.getStats();
        
        // Copilot Bypass stats
        const copilotStats = this.copilotBypass.getStats();
        
        // Local models stats
        const localStats = this.localModelsAdapter.getProviderStats();

        return {
            universalProxy: {
                isActive: this.universalProxy.isProxyActive(),
                totalRequests: proxyStats.totalRequests,
                totalOptimized: proxyStats.totalOptimized,
                totalSaved: proxyStats.totalSaved,
                uptime: this.formatUptime(proxyStats.startTime)
            },
            costEnforcement: {
                dailyUsage: costAnalytics.daily.current,
                dailyLimit: costAnalytics.daily.limit,
                monthlyUsage: costAnalytics.monthly.current,
                monthlyLimit: costAnalytics.monthly.limit,
                teamUsage: costAnalytics.teamUsage,
                teamBudget: costAnalytics.teamBudget
            },
            cursorKiller: {
                isActive: this.cursorKiller.isInterceptionActive(),
                interceptedCalls: cursorStats.interceptedCalls,
                costSaved: cursorStats.costSaved,
                tokensOptimized: cursorStats.tokensOptimized
            },
            copilotBypass: {
                isActive: this.copilotBypass.isInterceptionActive(),
                interceptedCalls: copilotStats.interceptedCalls,
                costSaved: copilotStats.costSaved,
                tokensOptimized: copilotStats.tokensOptimized
            },
            localModels: {
                discoveredProviders: localStats.totalProviders,
                onlineProviders: localStats.onlineProviders,
                providers: localStats.providers
            }
        };
    }

    /**
     * 💬 HANDLE WEBVIEW MESSAGES
     */
    private async handleWebviewMessage(message: any): Promise<void> {
        try {
            console.log('📨 Dashboard message received:', message.command);

            switch (message.command) {
                case 'startUniversalProxy':
                    await this.universalProxy.startProxy(8080);
                    vscode.window.showInformationMessage('🚀 Universal AI Proxy started!');
                    break;

                case 'stopUniversalProxy':
                    await this.universalProxy.stopProxy();
                    vscode.window.showInformationMessage('🛑 Universal AI Proxy stopped');
                    break;

                case 'startCursorKiller':
                    await this.cursorKiller.startCursorInterception();
                    vscode.window.showInformationMessage('🎯 Cursor Killer activated!');
                    break;

                case 'stopCursorKiller':
                    this.cursorKiller.stopCursorInterception();
                    vscode.window.showInformationMessage('🛑 Cursor Killer deactivated');
                    break;

                case 'startCopilotBypass':
                    await this.copilotBypass.startCopilotInterception();
                    vscode.window.showInformationMessage('🎯 Copilot Bypass activated!');
                    break;

                case 'stopCopilotBypass':
                    this.copilotBypass.stopCopilotInterception();
                    vscode.window.showInformationMessage('🛑 Copilot Bypass deactivated');
                    break;

                case 'refreshLocalModels':
                    await this.localModelsAdapter.refreshProviders();
                    vscode.window.showInformationMessage('🔄 Local models refreshed');
                    break;

                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'universalAIProxy');
                    break;

                case 'showCostDashboard':
                    vscode.commands.executeCommand('universalAIProxy.showCostDashboard');
                    break;

                case 'setCostLimit':
                    await this.handleSetCostLimit(message.data);
                    break;

                case 'exportReport':
                    await this.exportAnalyticsReport();
                    break;

                case 'resetStats':
                    await this.resetAllStats();
                    break;

                default:
                    console.log('⚠️ Unknown dashboard command:', message.command);
            }

        } catch (error) {
            console.error('❌ Error handling dashboard message:', error);
            vscode.window.showErrorMessage(`Dashboard action failed: ${error}`);
        }
    }

    /**
     * 💰 HANDLE SET COST LIMIT
     */
    private async handleSetCostLimit(data: { type: string; amount: number; enabled: boolean }): Promise<void> {
        this.costEnforcement.setCostLimit(data.type, data.amount, data.enabled);
        vscode.window.showInformationMessage(`💰 Cost limit updated: ${data.type} = €${data.amount}`);
    }

    /**
     * 📊 EXPORT ANALYTICS REPORT
     */
    private async exportAnalyticsReport(): Promise<void> {
        const data = await this.collectDashboardData();
        const costTrend = this.costEnforcement.getCostTrend(30);
        const topProviders = this.costEnforcement.getTopExpensiveProviders();

        const report = {
            generatedAt: new Date().toISOString(),
            platform: 'Universal AI Platform',
            version: '1.2.0',
            summary: data,
            costTrend: costTrend,
            topProviders: topProviders,
            totalSavings: data.cursorKiller.costSaved + data.copilotBypass.costSaved + data.universalProxy.totalSaved
        };

        const reportJson = JSON.stringify(report, null, 2);
        
        // Ask user where to save
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`universal-ai-platform-report-${new Date().toISOString().split('T')[0]}.json`),
            filters: {
                'JSON': ['json'],
                'All Files': ['*']
            }
        });

        if (saveUri) {
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(reportJson, 'utf8'));
            vscode.window.showInformationMessage('📊 Analytics report exported successfully!');
        }
    }

    /**
     * 🔄 RESET ALL STATS
     */
    private async resetAllStats(): Promise<void> {
        const choice = await vscode.window.showWarningMessage(
            'Are you sure you want to reset all statistics?',
            { modal: true },
            'Yes, Reset All',
            'Cancel'
        );

        if (choice === 'Yes, Reset All') {
            this.cursorKiller.resetStats();
            this.copilotBypass.resetStats();
            // Note: We don't reset cost enforcement as that tracks real money
            vscode.window.showInformationMessage('🔄 All statistics reset');
        }
    }

    /**
     * 🎨 GET WEBVIEW CONTENT - Professional HTML/CSS/JS interface
     */
    private async getWebviewContent(): Promise<string> {
        const data = await this.collectDashboardData();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universal AI Platform - Control Center</title>
    <style>
        :root {
            --primary-color: #007acc;
            --success-color: #28a745;
            --danger-color: #dc3545;
            --warning-color: #ffc107;
            --dark-color: #343a40;
            --light-color: #f8f9fa;
            --border-color: #dee2e6;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
        }

        .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            color: white;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }

        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: 1px solid var(--border-color);
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--light-color);
        }

        .card-title {
            font-size: 1.4rem;
            font-weight: 600;
            color: var(--dark-color);
        }

        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-active {
            background: var(--success-color);
            color: white;
        }

        .status-inactive {
            background: var(--danger-color);
            color: white;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 10px 0;
        }

        .metric-label {
            font-weight: 500;
            color: #666;
        }

        .metric-value {
            font-weight: 700;
            font-size: 1.1rem;
            color: var(--primary-color);
        }

        .metric-value.savings {
            color: var(--success-color);
        }

        .metric-value.cost {
            color: var(--warning-color);
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--light-color);
            border-radius: 4px;
            overflow: hidden;
            margin: 5px 0;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--success-color), var(--primary-color));
            border-radius: 4px;
            transition: width 0.5s ease;
        }

        .button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            margin: 5px;
            min-width: 120px;
        }

        .button-primary {
            background: var(--primary-color);
            color: white;
        }

        .button-success {
            background: var(--success-color);
            color: white;
        }

        .button-danger {
            background: var(--danger-color);
            color: white;
        }

        .button-secondary {
            background: var(--light-color);
            color: var(--dark-color);
            border: 1px solid var(--border-color);
        }

        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .controls-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            margin-top: 20px;
        }

        .provider-list {
            max-height: 200px;
            overflow-y: auto;
        }

        .provider-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--light-color);
        }

        .provider-status {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }

        .provider-online {
            background: var(--success-color);
        }

        .provider-offline {
            background: var(--danger-color);
        }

        .real-time-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            color: white;
            opacity: 0.8;
        }

        .cost-chart {
            height: 200px;
            background: var(--light-color);
            border-radius: 8px;
            margin: 15px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="real-time-indicator">🔄 Live Updates</div>
    
    <div class="dashboard-container">
        <div class="header">
            <h1>🎯 Universal AI Platform</h1>
            <p>Professional Control Center - Fuck AI Monopolies!</p>
        </div>

        <div class="cards-grid">
            <!-- Universal AI Proxy Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">🚀 Universal AI Proxy</div>
                    <div class="status-badge" id="proxy-status">
                        ${data.universalProxy.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}
                    </div>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Requests:</span>
                    <span class="metric-value" id="proxy-requests">${data.universalProxy.totalRequests}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Optimized:</span>
                    <span class="metric-value" id="proxy-optimized">${data.universalProxy.totalOptimized}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Saved:</span>
                    <span class="metric-value savings" id="proxy-saved">€${data.universalProxy.totalSaved.toFixed(4)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime:</span>
                    <span class="metric-value" id="proxy-uptime">${data.universalProxy.uptime}</span>
                </div>
                <div class="controls-grid">
                    <button class="button button-success" onclick="sendCommand('startUniversalProxy')">Start</button>
                    <button class="button button-danger" onclick="sendCommand('stopUniversalProxy')">Stop</button>
                    <button class="button button-secondary" onclick="sendCommand('openSettings')">Settings</button>
                </div>
            </div>

            <!-- Cost Enforcement Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">💰 Cost Enforcement</div>
                    <div class="status-badge status-active">🟢 MONITORING</div>
                </div>
                <div class="metric">
                    <span class="metric-label">Daily Usage:</span>
                    <span class="metric-value cost" id="daily-usage">€${data.costEnforcement.dailyUsage.toFixed(4)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min((data.costEnforcement.dailyUsage / data.costEnforcement.dailyLimit) * 100, 100)}%"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Daily Limit:</span>
                    <span class="metric-value">€${data.costEnforcement.dailyLimit.toFixed(2)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Monthly Usage:</span>
                    <span class="metric-value cost" id="monthly-usage">€${data.costEnforcement.monthlyUsage.toFixed(4)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Monthly Limit:</span>
                    <span class="metric-value">€${data.costEnforcement.monthlyLimit.toFixed(2)}</span>
                </div>
                <div class="controls-grid">
                    <button class="button button-primary" onclick="sendCommand('showCostDashboard')">Details</button>
                    <button class="button button-secondary" onclick="sendCommand('exportReport')">Export</button>
                </div>
            </div>

            <!-- Cursor Killer Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">🎯 Cursor Killer</div>
                    <div class="status-badge" id="cursor-status">
                        ${data.cursorKiller.isActive ? '🟢 HUNTING' : '🔴 IDLE'}
                    </div>
                </div>
                <div class="metric">
                    <span class="metric-label">Intercepted Calls:</span>
                    <span class="metric-value" id="cursor-calls">${data.cursorKiller.interceptedCalls}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Cost Saved:</span>
                    <span class="metric-value savings" id="cursor-saved">€${data.cursorKiller.costSaved.toFixed(6)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Tokens Optimized:</span>
                    <span class="metric-value" id="cursor-tokens">${data.cursorKiller.tokensOptimized}</span>
                </div>
                <div class="controls-grid">
                    <button class="button button-success" onclick="sendCommand('startCursorKiller')">Hunt</button>
                    <button class="button button-danger" onclick="sendCommand('stopCursorKiller')">Stop</button>
                    <button class="button button-secondary" onclick="resetCursorStats()">Reset</button>
                </div>
            </div>

            <!-- Copilot Bypass Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">🤖 Copilot Bypass</div>
                    <div class="status-badge" id="copilot-status">
                        ${data.copilotBypass.isActive ? '🟢 HIJACKING' : '🔴 IDLE'}
                    </div>
                </div>
                <div class="metric">
                    <span class="metric-label">Intercepted Calls:</span>
                    <span class="metric-value" id="copilot-calls">${data.copilotBypass.interceptedCalls}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Cost Saved:</span>
                    <span class="metric-value savings" id="copilot-saved">€${data.copilotBypass.costSaved.toFixed(6)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Tokens Optimized:</span>
                    <span class="metric-value" id="copilot-tokens">${data.copilotBypass.tokensOptimized}</span>
                </div>
                <div class="controls-grid">
                    <button class="button button-success" onclick="sendCommand('startCopilotBypass')">Hijack</button>
                    <button class="button button-danger" onclick="sendCommand('stopCopilotBypass')">Stop</button>
                    <button class="button button-secondary" onclick="resetCopilotStats()">Reset</button>
                </div>
            </div>

            <!-- Local Models Card -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">🏠 Local Models</div>
                    <div class="status-badge status-active">🟢 SCANNING</div>
                </div>
                <div class="metric">
                    <span class="metric-label">Discovered:</span>
                    <span class="metric-value" id="local-discovered">${data.localModels.discoveredProviders}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Online:</span>
                    <span class="metric-value" id="local-online">${data.localModels.onlineProviders}</span>
                </div>
                <div class="provider-list" id="provider-list">
                    ${data.localModels.providers.map(p => `
                        <div class="provider-item">
                            <div style="display: flex; align-items: center;">
                                <div class="provider-status ${p.online ? 'provider-online' : 'provider-offline'}"></div>
                                <span>${p.name}</span>
                            </div>
                            <span style="font-size: 0.8rem; color: #666;">${p.format}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="controls-grid">
                    <button class="button button-primary" onclick="sendCommand('refreshLocalModels')">Refresh</button>
                    <button class="button button-secondary" onclick="sendCommand('openSettings')">Config</button>
                </div>
            </div>

            <!-- Analytics Overview Card -->
            <div class="card" style="grid-column: 1 / -1;">
                <div class="card-header">
                    <div class="card-title">📊 Platform Analytics</div>
                    <div class="status-badge status-active">🟢 TRACKING</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div class="metric">
                        <span class="metric-label">Total Platform Savings:</span>
                        <span class="metric-value savings" id="total-savings">€${(data.cursorKiller.costSaved + data.copilotBypass.costSaved + data.universalProxy.totalSaved).toFixed(4)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Total Optimizations:</span>
                        <span class="metric-value" id="total-optimizations">${data.cursorKiller.tokensOptimized + data.copilotBypass.tokensOptimized + data.universalProxy.totalOptimized}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Active Components:</span>
                        <span class="metric-value" id="active-components">${[data.universalProxy.isActive, data.cursorKiller.isActive, data.copilotBypass.isActive].filter(Boolean).length}/3</span>
                    </div>
                </div>
                <div class="cost-chart">
                    💹 Cost Trend Chart (Coming Soon)
                </div>
                <div class="controls-grid">
                    <button class="button button-primary" onclick="sendCommand('exportReport')">Export Report</button>
                    <button class="button button-secondary" onclick="sendCommand('resetStats')">Reset All Stats</button>
                    <button class="button button-secondary" onclick="sendCommand('openSettings')">Global Settings</button>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>🚀 Universal AI Platform v1.2.0 - The AI Monopoly Killer</p>
            <p>"€20/year beats €240/year - Fuck Cursor pricing!"</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function sendCommand(command, data = null) {
            console.log('Sending command:', command, data);
            vscode.postMessage({
                command: command,
                data: data
            });
        }
        
        function resetCursorStats() {
            if (confirm('Reset Cursor Killer statistics?')) {
                sendCommand('resetStats', { component: 'cursor' });
            }
        }
        
        function resetCopilotStats() {
            if (confirm('Reset Copilot Bypass statistics?')) {
                sendCommand('resetStats', { component: 'copilot' });
            }
        }
        
        // Handle real-time updates from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.command === 'updateData') {
                updateDashboard(message.data);
            }
        });
        
        function updateDashboard(data) {
            // Update Universal Proxy
            document.getElementById('proxy-status').textContent = data.universalProxy.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE';
            document.getElementById('proxy-status').className = 'status-badge ' + (data.universalProxy.isActive ? 'status-active' : 'status-inactive');
            document.getElementById('proxy-requests').textContent = data.universalProxy.totalRequests;
            document.getElementById('proxy-optimized').textContent = data.universalProxy.totalOptimized;
            document.getElementById('proxy-saved').textContent = '€' + data.universalProxy.totalSaved.toFixed(4);
            document.getElementById('proxy-uptime').textContent = data.universalProxy.uptime;
            
            // Update Cost Enforcement
            document.getElementById('daily-usage').textContent = '€' + data.costEnforcement.dailyUsage.toFixed(4);
            document.getElementById('monthly-usage').textContent = '€' + data.costEnforcement.monthlyUsage.toFixed(4);
            
            // Update Cursor Killer
            document.getElementById('cursor-status').textContent = data.cursorKiller.isActive ? '🟢 HUNTING' : '🔴 IDLE';
            document.getElementById('cursor-status').className = 'status-badge ' + (data.cursorKiller.isActive ? 'status-active' : 'status-inactive');
            document.getElementById('cursor-calls').textContent = data.cursorKiller.interceptedCalls;
            document.getElementById('cursor-saved').textContent = '€' + data.cursorKiller.costSaved.toFixed(6);
            document.getElementById('cursor-tokens').textContent = data.cursorKiller.tokensOptimized;
            
            // Update Copilot Bypass
            document.getElementById('copilot-status').textContent = data.copilotBypass.isActive ? '🟢 HIJACKING' : '🔴 IDLE';
            document.getElementById('copilot-status').className = 'status-badge ' + (data.copilotBypass.isActive ? 'status-active' : 'status-inactive');
            document.getElementById('copilot-calls').textContent = data.copilotBypass.interceptedCalls;
            document.getElementById('copilot-saved').textContent = '€' + data.copilotBypass.costSaved.toFixed(6);
            document.getElementById('copilot-tokens').textContent = data.copilotBypass.tokensOptimized;
            
            // Update Local Models
            document.getElementById('local-discovered').textContent = data.localModels.discoveredProviders;
            document.getElementById('local-online').textContent = data.localModels.onlineProviders;
            
            // Update totals
            const totalSavings = data.cursorKiller.costSaved + data.copilotBypass.costSaved + data.universalProxy.totalSaved;
            const totalOptimizations = data.cursorKiller.tokensOptimized + data.copilotBypass.tokensOptimized + data.universalProxy.totalOptimized;
            const activeComponents = [data.universalProxy.isActive, data.cursorKiller.isActive, data.copilotBypass.isActive].filter(Boolean).length;
            
            document.getElementById('total-savings').textContent = '€' + totalSavings.toFixed(4);
            document.getElementById('total-optimizations').textContent = totalOptimizations;
            document.getElementById('active-components').textContent = activeComponents + '/3';
        }
        
        // Auto-refresh every 2 seconds is handled by the extension
        console.log('🎛️ Interactive Dashboard UI loaded - Ready for action!');
    </script>
</body>
</html>`;
    }

    /**
     * 🔧 HELPER METHODS
     */
    private formatUptime(startTime?: Date): string {
        if (!startTime) return 'Not started';
        
        const now = new Date();
        const diffMs = now.getTime() - startTime.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffHours > 0) {
            return `${diffHours}h ${diffMinutes}m`;
        } else {
            return `${diffMinutes}m`;
        }
    }

    public dispose(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.panel) {
            this.panel.dispose();
        }
    }
}