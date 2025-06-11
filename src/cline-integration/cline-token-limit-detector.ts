import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface ModelLimits {
    official: number;
    clineActual: number;
    betaLimit?: number;
    betaHeader?: string;
}

export class ClineTokenLimitDetector {
    private static instance: ClineTokenLimitDetector;
    private readonly officialLimits: Record<string, ModelLimits> = {
        // Claude 4 Models
        'claude-sonnet-4-20250514': {
            official: 64000,
            clineActual: 8192
        },
        'claude-opus-4-20250514': {
            official: 32000,
            clineActual: 8192
        },
        // Claude 3.7
        'claude-3-7-sonnet-20250219': {
            official: 64000,
            clineActual: 8192,
            betaLimit: 128000,
            betaHeader: 'output-128k-2025-02-19'
        },
        // Claude 3.5
        'claude-3-5-sonnet-20241022': {
            official: 8192,
            clineActual: 8192,
            betaLimit: 8192,
            betaHeader: 'max-tokens-3-5-sonnet-2024-07-15'
        }
    };

    private constructor() {}

    public static getInstance(): ClineTokenLimitDetector {
        if (!ClineTokenLimitDetector.instance) {
            ClineTokenLimitDetector.instance = new ClineTokenLimitDetector();
        }
        return ClineTokenLimitDetector.instance;
    }

    public async checkClineInstallation(): Promise<{
        isInstalled: boolean;
        hasTokenLimitIssue: boolean;
        affectedModels: string[];
        clineExtensionPath?: string;
    }> {
        try {
            // Find Cline extension
            const clineExtension = vscode.extensions.getExtension('saoudrizwan.claude-dev');
            
            if (!clineExtension) {
                return {
                    isInstalled: false,
                    hasTokenLimitIssue: false,
                    affectedModels: []
                };
            }

            const extensionPath = clineExtension.extensionPath;
            const apiFilePath = path.join(extensionPath, 'dist', 'extension.js');
            
            // Check if the file exists
            if (!fs.existsSync(apiFilePath)) {
                return {
                    isInstalled: true,
                    hasTokenLimitIssue: true,
                    affectedModels: Object.keys(this.officialLimits),
                    clineExtensionPath: extensionPath
                };
            }

            // Read the compiled file to check for hardcoded limits
            const fileContent = fs.readFileSync(apiFilePath, 'utf8');
            
            // Check for the pattern "maxTokens:8192" which indicates the issue
            const hasHardcodedLimits = fileContent.includes('maxTokens:8192');
            
            const affectedModels = Object.entries(this.officialLimits)
                .filter(([_, limits]) => limits.official > limits.clineActual)
                .map(([model]) => model);

            return {
                isInstalled: true,
                hasTokenLimitIssue: hasHardcodedLimits,
                affectedModels,
                clineExtensionPath: extensionPath
            };
        } catch (error) {
            console.error('Error checking Cline installation:', error);
            return {
                isInstalled: false,
                hasTokenLimitIssue: false,
                affectedModels: []
            };
        }
    }

    public async showTokenLimitWarning(affectedModels: string[]): Promise<void> {
        const message = `⚠️ Cline Token Limit Problem erkannt!\n\n` +
            `Cline begrenzt künstlich die Output-Token auf 8192 für folgende Modelle:\n` +
            `${affectedModels.map(m => `• ${m}`).join('\n')}\n\n` +
            `Dies kann zu abgeschnittenen Antworten führen.`;

        const selection = await vscode.window.showWarningMessage(
            message,
            'Details anzeigen',
            'Anleitung zum Beheben',
            'Später erinnern'
        );

        if (selection === 'Details anzeigen') {
            await this.showDetailedInfo();
        } else if (selection === 'Anleitung zum Beheben') {
            await this.showFixInstructions();
        }
    }

    private async showDetailedInfo(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'clineTokenLimitInfo',
            'Cline Token Limit Problem',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        panel.webview.html = this.getDetailedInfoHtml();
    }

    private async showFixInstructions(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'clineTokenLimitFix',
            'Cline Token Limit beheben',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        panel.webview.html = this.getFixInstructionsHtml();
    }

    private getDetailedInfoHtml(): string {
        return `<!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cline Token Limit Problem</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    padding: 20px;
                    line-height: 1.6;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                h1, h2 { color: var(--vscode-textLink-foreground); }
                .warning {
                    background-color: var(--vscode-inputValidation-warningBackground);
                    border: 1px solid var(--vscode-inputValidation-warningBorder);
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 20px 0;
                }
                th, td {
                    border: 1px solid var(--vscode-panel-border);
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: var(--vscode-editor-lineHighlightBackground);
                }
                .code {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                }
            </style>
        </head>
        <body>
            <h1>🚨 Cline Token Limit Problem</h1>
            
            <div class="warning">
                <strong>Problem:</strong> Cline begrenzt alle Anthropic-Modelle auf 8192 Output-Token, 
                obwohl die neueren Modelle viel höhere Limits unterstützen.
            </div>

            <h2>Betroffene Modelle</h2>
            <table>
                <tr>
                    <th>Modell</th>
                    <th>Cline Limit</th>
                    <th>Offizielles Limit</th>
                    <th>Mit Beta-Header</th>
                </tr>
                <tr>
                    <td>Claude 4 Sonnet</td>
                    <td>8.192</td>
                    <td>64.000</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>Claude 4 Opus</td>
                    <td>8.192</td>
                    <td>32.000</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>Claude 3.7 Sonnet</td>
                    <td>8.192</td>
                    <td>64.000</td>
                    <td>128.000</td>
                </tr>
                <tr>
                    <td>Claude 3.5 Sonnet</td>
                    <td>8.192</td>
                    <td>8.192</td>
                    <td>8.192*</td>
                </tr>
            </table>
            <p><small>* Claude 3.5 Sonnet ist korrekt konfiguriert</small></p>

            <h2>Auswirkungen</h2>
            <ul>
                <li>❌ Längere Antworten werden abgeschnitten</li>
                <li>❌ Große Code-Generierungen sind unvollständig</li>
                <li>❌ Sie nutzen nicht die volle Leistung der Modelle</li>
                <li>❌ Token-Tracking zeigt niedrigere Werte als möglich</li>
            </ul>

            <h2>GitHub Issue</h2>
            <p>
                Dieses Problem wurde bereits gemeldet: 
                <a href="https://github.com/cline/cline/issues/4149">Issue #4149</a>
            </p>

            <h2>Lösungsmöglichkeiten</h2>
            <ol>
                <li><strong>Manueller Fix:</strong> Cline's Source-Code anpassen (temporär)</li>
                <li><strong>Fork verwenden:</strong> Modifizierte Version von Cline installieren</li>
                <li><strong>Auf Update warten:</strong> Offizielles Fix vom Cline-Team</li>
            </ol>
        </body>
        </html>`;
    }

    public getFixInstructionsHtml(): string {
        return `<!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cline Token Limit beheben</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    padding: 20px;
                    line-height: 1.6;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                h1, h2 { color: var(--vscode-textLink-foreground); }
                .warning {
                    background-color: var(--vscode-inputValidation-warningBackground);
                    border: 1px solid var(--vscode-inputValidation-warningBorder);
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                .info {
                    background-color: var(--vscode-inputValidation-infoBackground);
                    border: 1px solid var(--vscode-inputValidation-infoBorder);
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                pre {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 15px;
                    border-radius: 5px;
                    overflow-x: auto;
                }
                code {
                    font-family: 'Courier New', monospace;
                }
                .step {
                    margin: 20px 0;
                    padding: 15px;
                    background-color: var(--vscode-editor-lineHighlightBackground);
                    border-radius: 5px;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin: 5px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <h1>🔧 Cline Token Limit beheben</h1>
            
            <div class="warning">
                <strong>Achtung:</strong> Diese Anleitung zeigt, wie Sie Cline's Token-Limits temporär anpassen können. 
                Die Änderungen werden bei einem Update von Cline überschrieben.
            </div>

            <h2>Option 1: Manueller Fix (Empfohlen)</h2>
            
            <div class="step">
                <h3>Schritt 1: Cline Source-Code klonen</h3>
                <pre><code>git clone https://github.com/cline/cline.git
cd cline</code></pre>
            </div>

            <div class="step">
                <h3>Schritt 2: api.ts bearbeiten</h3>
                <p>Öffnen Sie <code>src/shared/api.ts</code> und ändern Sie die maxTokens Werte:</p>
                <pre><code>// Vorher:
"claude-sonnet-4-20250514": {
    maxTokens: 8192,  // ❌ Künstlich begrenzt
    ...
}

// Nachher:
"claude-sonnet-4-20250514": {
    maxTokens: 64000,  // ✅ Offizielles Limit
    ...
}</code></pre>
            </div>

            <div class="step">
                <h3>Schritt 3: Extension neu bauen</h3>
                <pre><code>npm install
npm run build
npm run package</code></pre>
            </div>

            <div class="step">
                <h3>Schritt 4: Modifizierte Version installieren</h3>
                <pre><code>code --install-extension cline-*.vsix</code></pre>
            </div>

            <h2>Option 2: Vorgefertigter Patch</h2>
            
            <div class="info">
                <p>Wir arbeiten an einem automatischen Patch-Tool, das die Änderungen für Sie durchführt.</p>
                <button onclick="alert('Patch-Tool noch in Entwicklung')">🚀 Auto-Patch (Coming Soon)</button>
            </div>

            <h2>Option 3: Fork mit Fix verwenden</h2>
            
            <p>Suchen Sie nach Community-Forks, die das Problem bereits behoben haben:</p>
            <ul>
                <li><a href="https://github.com/search?q=cline+fork+token+limit&type=repositories">GitHub Fork-Suche</a></li>
            </ul>

            <h2>Empfohlene Token-Limits</h2>
            <pre><code>{
    "claude-sonnet-4-20250514": { maxTokens: 64000 },
    "claude-opus-4-20250514": { maxTokens: 32000 },
    "claude-3-7-sonnet-20250219": { maxTokens: 64000 },
    "claude-3-5-sonnet-20241022": { maxTokens: 8192 }, // Bereits korrekt
    "claude-3-5-haiku-20241022": { maxTokens: 8192 },
    "claude-3-opus-20240229": { maxTokens: 4096 },
    "claude-3-haiku-20240307": { maxTokens: 4096 }
}</code></pre>

            <h2>Beta-Header für erweiterte Limits</h2>
            <p>Für Claude 3.7 Sonnet können Sie bis zu 128K Token mit folgendem Header aktivieren:</p>
            <pre><code>"anthropic-beta": "output-128k-2025-02-19"</code></pre>

            <div class="warning">
                <strong>Hinweis:</strong> Nach jedem Cline-Update müssen Sie diese Änderungen erneut durchführen.
            </div>
        </body>
        </html>`;
    }

    public async detectAndWarnOnActivation(): Promise<void> {
        // Check if warning was already shown today
        const context = vscode.workspace.getConfiguration('clineTokenManager');
        const lastWarningDate = context.get<string>('lastTokenLimitWarning');
        const today = new Date().toDateString();
        
        if (lastWarningDate === today) {
            return; // Already warned today
        }

        const result = await this.checkClineInstallation();
        
        if (result.isInstalled && result.hasTokenLimitIssue && result.affectedModels.length > 0) {
            await this.showTokenLimitWarning(result.affectedModels);
            
            // Save warning date
            await vscode.workspace.getConfiguration('clineTokenManager')
                .update('lastTokenLimitWarning', today, vscode.ConfigurationTarget.Global);
        }
    }

    public getModelLimitInfo(modelId: string): ModelLimits | undefined {
        return this.officialLimits[modelId];
    }

    public isModelAffected(modelId: string): boolean {
        const limits = this.officialLimits[modelId];
        return limits ? limits.official > limits.clineActual : false;
    }
}