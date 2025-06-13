import * as vscode from 'vscode';
import { CustomRulesManager } from '../core/custom-rules-manager';

/**
 * Rule Injection Panel - WebView for managing custom rules
 */
export class RuleInjectionPanel {
    private static currentPanel: RuleInjectionPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private rulesManager: CustomRulesManager;

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        rulesManager: CustomRulesManager
    ) {
        this.panel = panel;
        this.rulesManager = rulesManager;

        // Set webview content
        this.updateWebview();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'reload':
                        await vscode.commands.executeCommand('cline-token-manager.reloadRules');
                        await this.updateWebview();
                        break;
                    case 'inject':
                        await vscode.commands.executeCommand('cline-token-manager.injectRules');
                        break;
                    case 'toggle':
                        await this.toggleRuleInjection();
                        break;
                    case 'openSettings':
                        vscode.commands.executeCommand('workbench.action.openSettings', 
                            'cline-token-manager.ruleInjection');
                        break;
                }
            },
            undefined,
            []
        );
    }

    public static async show(extensionUri: vscode.Uri, rulesManager: CustomRulesManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If panel exists, reveal it
        if (RuleInjectionPanel.currentPanel) {
            RuleInjectionPanel.currentPanel.panel.reveal(column);
            await RuleInjectionPanel.currentPanel.updateWebview();
            return;
        }

        // Create new panel
        const panel = vscode.window.createWebviewPanel(
            'clineRuleInjection',
            'Cline Rule Injection',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        RuleInjectionPanel.currentPanel = new RuleInjectionPanel(panel, extensionUri, rulesManager);
    }

    private async updateWebview() {
        const status = await this.rulesManager.getRuleStatus();
        this.panel.webview.html = this.getWebviewContent(status);
    }

    private async toggleRuleInjection() {
        const config = vscode.workspace.getConfiguration('cline-token-manager.ruleInjection');
        const currentState = config.get('enabled', true);
        await config.update('enabled', !currentState, vscode.ConfigurationTarget.Global);
        await this.updateWebview();
    }

    private getWebviewContent(status: any): string {
        const totalSize = status.rules.reduce((sum: number, rule: any) => 
            sum + rule.content.length, 0);
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cline Rule Injection</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                }
                
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid var(--vscode-panel-border);
                }
                
                h1 {
                    color: var(--vscode-foreground);
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .status-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    margin-left: 10px;
                }
                
                .status-enabled {
                    background-color: #28a745;
                    color: white;
                }
                
                .status-disabled {
                    background-color: #dc3545;
                    color: white;
                }
                
                .stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .stat-card {
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 15px;
                    text-align: center;
                }
                
                .stat-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: var(--vscode-editor-foreground);
                }
                
                .stat-label {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 5px;
                }
                
                .rules-list {
                    margin-top: 20px;
                }
                
                .rule-item {
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                }
                
                .rule-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .rule-name {
                    font-weight: bold;
                    color: var(--vscode-editor-foreground);
                }
                
                .rule-priority {
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                }
                
                .rule-content {
                    font-family: var(--vscode-editor-font-family);
                    font-size: 12px;
                    color: var(--vscode-editor-foreground);
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 10px;
                    border-radius: 4px;
                    max-height: 200px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                }
                
                .actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .toggle-button {
                    background-color: ${status.enabled ? '#dc3545' : '#28a745'};
                }
                
                .warning {
                    background-color: var(--vscode-editorWarning-background);
                    border: 1px solid var(--vscode-editorWarning-border);
                    padding: 10px;
                    border-radius: 4px;
                    margin-top: 20px;
                }
                
                .info {
                    background-color: var(--vscode-editorInfo-background);
                    border: 1px solid var(--vscode-editorInfo-border);
                    padding: 10px;
                    border-radius: 4px;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>
                    🔧 Custom Rule Injection
                    <span class="status-badge ${status.enabled ? 'status-enabled' : 'status-disabled'}">
                        ${status.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                </h1>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value">${status.ruleCount}</div>
                    <div class="stat-label">Active Rules</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${status.totalTokens}</div>
                    <div class="stat-label">Total Tokens</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(totalSize / 1024).toFixed(1)} KB</div>
                    <div class="stat-label">Total Size</div>
                </div>
            </div>
            
            ${status.enabled && status.totalTokens > 3000 ? `
            <div class="warning">
                <strong>⚠️ Warning:</strong> Your rules are using ${status.totalTokens} tokens. 
                Consider reducing rule size to leave more context for code.
            </div>
            ` : ''}
            
            <div class="info">
                <strong>💡 How it works:</strong> This feature automatically injects your custom rules 
                into every Cline conversation, ensuring they are ALWAYS read and applied. 
                Place rule files in <code>.clinerules/</code> or <code>.cline/rules/</code> directories.
            </div>
            
            <div class="rules-list">
                <h2>📋 Loaded Rules</h2>
                ${status.rules.length === 0 ? `
                    <p>No rules found. Create rule files in <code>.clinerules/</code> directory.</p>
                ` : status.rules.map((rule: any) => `
                    <div class="rule-item">
                        <div class="rule-header">
                            <span class="rule-name">${rule.path.split('/').pop()}</span>
                            <span class="rule-priority">Priority: ${rule.priority}</span>
                        </div>
                        <div>
                            <small>Tokens: ${rule.tokens} | Size: ${(rule.content.length / 1024).toFixed(1)} KB</small>
                        </div>
                        <div class="rule-content">${this.escapeHtml(rule.content)}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="actions">
                <button onclick="sendMessage('reload')">🔄 Reload Rules</button>
                <button onclick="sendMessage('inject')">💉 Inject Now</button>
                <button class="toggle-button" onclick="sendMessage('toggle')">
                    ${status.enabled ? '🛑 Disable' : '✅ Enable'} Rule Injection
                </button>
                <button onclick="sendMessage('openSettings')">⚙️ Settings</button>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function sendMessage(command) {
                    vscode.postMessage({ command });
                }
            </script>
        </body>
        </html>`;
    }

    private escapeHtml(text: string): string {
        const map: any = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    public dispose() {
        RuleInjectionPanel.currentPanel = undefined;
    }
}