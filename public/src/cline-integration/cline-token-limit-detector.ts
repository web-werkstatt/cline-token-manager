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
            
            // Check for SPECIFIC model patterns to avoid false positives after fix
            const affectedModels: string[] = [];
            
            // Check Claude 4 Sonnet (must have 8192 to need fix)
            if (fileContent.includes('"claude-sonnet-4-20250514":{maxTokens:8192')) {
                affectedModels.push('claude-sonnet-4-20250514');
            }
            
            // Check Claude 4 Opus (must have 8192 to need fix)
            if (fileContent.includes('"claude-opus-4-20250514":{maxTokens:8192')) {
                affectedModels.push('claude-opus-4-20250514');
            }
            
            // Check Claude 3.7 Sonnet (must have 8192 to need fix)
            if (fileContent.includes('"claude-3-7-sonnet-20250219":{maxTokens:8192')) {
                affectedModels.push('claude-3-7-sonnet-20250219');
            }

            return {
                isInstalled: true,
                hasTokenLimitIssue: affectedModels.length > 0,
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
        const modelList = affectedModels.map(m => {
            const limits = this.officialLimits[m];
            return `• ${m} (${limits?.clineActual} → ${limits?.official} Token)`;
        }).join('\n');

        const message = `🔧 Cline Token Limit Fix verfügbar!\n\n` +
            `Folgende Modelle können automatisch optimiert werden:\n${modelList}\n\n` +
            `Backup wird automatisch erstellt. Ein Klick genügt!`;

        const selection = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            'Jetzt automatisch beheben',
            'Details anzeigen',
            'Später'
        );

        if (selection === 'Jetzt automatisch beheben') {
            await this.performQuickAutoFix(affectedModels);
        } else if (selection === 'Details anzeigen') {
            await this.showAutoFixDialog();
        }
    }

    private async performQuickAutoFix(affectedModels: string[]): Promise<void> {
        try {
            vscode.window.showInformationMessage('🔧 Token-Limits und Cache-Problem werden automatisch behoben...');
            
            const result = await this.checkClineInstallation();
            if (!result.isInstalled || !result.clineExtensionPath) {
                vscode.window.showErrorMessage('❌ Cline extension nicht gefunden.');
                return;
            }

            // Create backup
            await this.createBackupInternal(result.clineExtensionPath);
            vscode.window.showInformationMessage('✅ Backup erstellt');
            
            // Apply token limit fixes
            const apiFilePath = path.join(result.clineExtensionPath, 'dist', 'extension.js');
            const tokenFixSuccess = await this.patchTokenLimits(apiFilePath, affectedModels);
            
            // 🚨 NEW: Apply cache fix
            const cacheFixSuccess = await this.patchCacheTokenProblem(result.clineExtensionPath);
            
            if (tokenFixSuccess && cacheFixSuccess) {
                const reloadChoice = await vscode.window.showInformationMessage(
                    '🎉 Token-Limits UND Cache-Problem erfolgreich behoben! VS Code muss neu geladen werden um die Änderungen zu aktivieren.',
                    'Jetzt neu laden',
                    'Später'
                );
                
                if (reloadChoice === 'Jetzt neu laden') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            } else if (tokenFixSuccess && !cacheFixSuccess) {
                vscode.window.showWarningMessage('⚠️ Token-Limits behoben, aber Cache-Fix fehlgeschlagen.');
            } else if (!tokenFixSuccess && cacheFixSuccess) {
                vscode.window.showWarningMessage('⚠️ Cache-Fix behoben, aber Token-Limits fehlgeschlagen.');
            } else {
                vscode.window.showErrorMessage('❌ Beide Fixes fehlgeschlagen. Bitte verwenden Sie die manuelle Anleitung.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Fehler beim Auto-Fix: ${error instanceof Error ? error.message : String(error)}`);
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

    private async showAutoFixDialog(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'clineTokenLimitAutoFix',
            'Cline Token Limit - Automatisch beheben',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        panel.webview.html = this.getAutoFixHtml();
        
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'performAutoFix':
                        await this.performAutoFix(panel, message.selectedModels);
                        break;
                    case 'createBackup':
                        await this.createBackup(panel);
                        break;
                }
            },
            undefined
        );
    }

    private async performAutoFix(panel: vscode.WebviewPanel, selectedModels: string[]): Promise<void> {
        try {
            const result = await this.checkClineInstallation();
            
            if (!result.isInstalled || !result.clineExtensionPath) {
                panel.webview.postMessage({
                    command: 'fixResult',
                    success: false,
                    message: 'Cline extension nicht gefunden.'
                });
                return;
            }

            // Create backup first
            await this.createBackupInternal(result.clineExtensionPath);
            
            // Apply the fixes
            const apiFilePath = path.join(result.clineExtensionPath, 'dist', 'extension.js');
            const success = await this.patchTokenLimits(apiFilePath, selectedModels);
            
            if (success) {
                panel.webview.postMessage({
                    command: 'fixResult',
                    success: true,
                    message: 'Token-Limits erfolgreich aktualisiert! Bitte VS Code neu laden (Ctrl+Shift+P → "Developer: Reload Window").'
                });
                
                // Show reload window prompt
                const reloadChoice = await vscode.window.showInformationMessage(
                    'Token-Limits wurden erfolgreich aktualisiert! VS Code muss neu geladen werden.',
                    'Jetzt neu laden',
                    'Später'
                );
                
                if (reloadChoice === 'Jetzt neu laden') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            } else {
                panel.webview.postMessage({
                    command: 'fixResult',
                    success: false,
                    message: 'Fehler beim Anwenden der Token-Limit-Fixes. Bitte manuelle Anleitung verwenden.'
                });
            }
        } catch (error) {
            panel.webview.postMessage({
                command: 'fixResult',
                success: false,
                message: `Fehler: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    private async createBackup(panel: vscode.WebviewPanel): Promise<void> {
        try {
            const result = await this.checkClineInstallation();
            if (!result.clineExtensionPath) {
                panel.webview.postMessage({
                    command: 'backupResult',
                    success: false,
                    message: 'Cline extension path nicht gefunden.'
                });
                return;
            }

            const backupPath = await this.createBackupInternal(result.clineExtensionPath);
            panel.webview.postMessage({
                command: 'backupResult',
                success: true,
                message: `Backup erstellt: ${backupPath}`
            });
        } catch (error) {
            panel.webview.postMessage({
                command: 'backupResult',
                success: false,
                message: `Backup fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    private async createBackupInternal(clineExtensionPath: string): Promise<string> {
        const apiFilePath = path.join(clineExtensionPath, 'dist', 'extension.js');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(clineExtensionPath, 'dist', `extension.js.backup-${timestamp}`);
        
        fs.copyFileSync(apiFilePath, backupPath);
        return backupPath;
    }

    private async patchTokenLimits(apiFilePath: string, selectedModels: string[]): Promise<boolean> {
        try {
            const fileContent = fs.readFileSync(apiFilePath, 'utf8');
            let patchedContent = fileContent;
            
            // Apply patches for selected models
            for (const modelId of selectedModels) {
                const limits = this.officialLimits[modelId];
                if (!limits || limits.official === limits.clineActual) {
                    continue; // Skip models that don't need fixing
                }
                
                // Pattern to find and replace maxTokens for this model
                // Looking for patterns like: "claude-sonnet-4-20250514":{...maxTokens:8192...}
                const modelPattern = new RegExp(
                    `("${modelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\s*:\s*{[^}]*maxTokens\s*:\s*)8192`,
                    'g'
                );
                
                patchedContent = patchedContent.replace(modelPattern, `$1${limits.official}`);
                
                // Also handle cases with different formatting
                const altPattern = new RegExp(
                    `(maxTokens\s*:\s*)8192([^,}]*[,}][^}]*"${modelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`,
                    'g'
                );
                
                patchedContent = patchedContent.replace(altPattern, `$1${limits.official}$2`);
            }
            
            // Only write if content actually changed
            if (patchedContent !== fileContent) {
                fs.writeFileSync(apiFilePath, patchedContent, 'utf8');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error patching token limits:', error);
            return false;
        }
    }

    // 🚨 NEW: Cache token fix function
    private async patchCacheTokenProblem(clineExtensionPath: string): Promise<boolean> {
        try {
            console.log('🚨 Applying Cache Token Fix...');
            
            // File paths that need to be patched
            const filesToPatch = [
                {
                    path: path.join(clineExtensionPath, 'dist', 'src', 'core', 'context', 'context-management', 'ContextManager.js'),
                    pattern: /const totalTokens = \(tokensIn \|\| 0\) \+ \(tokensOut \|\| 0\) \+ \(cacheWrites \|\| 0\) \+ \(cacheReads \|\| 0\)/g,
                    replacement: '// 🚨 CACHE FIX: Cache tokens don\'t count toward context window limit!\n                // Cache tokens are reused content, not new context that needs to fit in the window\n                const totalTokens = (tokensIn || 0) + (tokensOut || 0)\n                // const cacheTokens = (cacheWrites || 0) + (cacheReads || 0) // excluded from context window'
                },
                {
                    path: path.join(clineExtensionPath, 'dist', 'src', 'core', 'task', 'index.js'),
                    pattern: /return \(tokensIn \|\| 0\) \+ \(tokensOut \|\| 0\) \+ \(cacheWrites \|\| 0\) \+ \(cacheReads \|\| 0\)/g,
                    replacement: '// 🚨 CACHE FIX: Cache tokens don\'t count toward context window limit!\n                // Cache tokens are reused content, not new context that needs to fit in the window\n                return (tokensIn || 0) + (tokensOut || 0)\n                // const cacheTokens = (cacheWrites || 0) + (cacheReads || 0) // excluded from context window'
                }
            ];

            let patchedFiles = 0;
            
            for (const file of filesToPatch) {
                if (fs.existsSync(file.path)) {
                    const fileContent = fs.readFileSync(file.path, 'utf8');
                    
                    if (file.pattern.test(fileContent)) {
                        const patchedContent = fileContent.replace(file.pattern, file.replacement);
                        fs.writeFileSync(file.path, patchedContent, 'utf8');
                        patchedFiles++;
                        console.log(`✅ Cache fix applied to: ${path.basename(file.path)}`);
                    } else {
                        console.log(`⚠️ Pattern not found in: ${path.basename(file.path)} (may already be patched)`);
                    }
                } else {
                    console.log(`⚠️ File not found: ${file.path}`);
                }
            }
            
            return patchedFiles > 0;
        } catch (error) {
            console.error('Error applying cache token fix:', error);
            return false;
        }
    }

    private getAutoFixHtml(): string {
        return '<!DOCTYPE html>' +
        '<html lang="de">' +
        '<head>' +
            '<meta charset="UTF-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
            '<title>Cline Token Limit - Automatisch beheben</title>' +
            '<style>' +
                'body {' +
                    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
                    'padding: 20px;' +
                    'line-height: 1.6;' +
                    'color: var(--vscode-foreground);' +
                    'background-color: var(--vscode-editor-background);' +
                '}' +
                'h1, h2 { color: var(--vscode-textLink-foreground); }' +
                '.warning {' +
                    'background-color: var(--vscode-inputValidation-warningBackground);' +
                    'border: 1px solid var(--vscode-inputValidation-warningBorder);' +
                    'padding: 15px;' +
                    'border-radius: 4px;' +
                    'margin: 15px 0;' +
                '}' +
                '.success {' +
                    'background-color: var(--vscode-inputValidation-infoBackground);' +
                    'border: 1px solid var(--vscode-inputValidation-infoBorder);' +
                    'padding: 15px;' +
                    'border-radius: 4px;' +
                    'margin: 15px 0;' +
                '}' +
                '.error {' +
                    'background-color: var(--vscode-inputValidation-errorBackground);' +
                    'border: 1px solid var(--vscode-inputValidation-errorBorder);' +
                    'padding: 15px;' +
                    'border-radius: 4px;' +
                    'margin: 15px 0;' +
                '}' +
                '.step {' +
                    'margin: 20px 0;' +
                    'padding: 15px;' +
                    'background-color: var(--vscode-editor-lineHighlightBackground);' +
                    'border-radius: 5px;' +
                '}' +
                'button {' +
                    'background-color: var(--vscode-button-background);' +
                    'color: var(--vscode-button-foreground);' +
                    'border: none;' +
                    'padding: 12px 20px;' +
                    'border-radius: 4px;' +
                    'cursor: pointer;' +
                    'margin: 8px 5px;' +
                    'font-size: 14px;' +
                    'min-width: 120px;' +
                '}' +
                'button:hover {' +
                    'background-color: var(--vscode-button-hoverBackground);' +
                '}' +
                'button:disabled {' +
                    'opacity: 0.6;' +
                    'cursor: not-allowed;' +
                '}' +
                '.model-selection {' +
                    'margin: 15px 0;' +
                '}' +
                '.model-checkbox {' +
                    'display: block;' +
                    'margin: 8px 0;' +
                    'padding: 8px;' +
                    'background-color: var(--vscode-input-background);' +
                    'border-radius: 4px;' +
                '}' +
                '.model-checkbox input {' +
                    'margin-right: 10px;' +
                '}' +
                '.progress {' +
                    'display: none;' +
                    'text-align: center;' +
                    'padding: 20px;' +
                '}' +
                '.spinner {' +
                    'border: 3px solid var(--vscode-progressBar-background);' +
                    'border-top: 3px solid var(--vscode-button-background);' +
                    'border-radius: 50%;' +
                    'width: 30px;' +
                    'height: 30px;' +
                    'animation: spin 1s linear infinite;' +
                    'margin: 0 auto 10px;' +
                '}' +
                '@keyframes spin {' +
                    '0% { transform: rotate(0deg); }' +
                    '100% { transform: rotate(360deg); }' +
                '}' +
                '#result {' +
                    'margin-top: 20px;' +
                '}' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<h1>🔧 Cline Token Limit + Cache Fix - Automatische Reparatur</h1>' +
            
            '<div class="warning">' +
                '<strong>⚠️ Wichtiger Hinweis:</strong> Diese automatische Reparatur modifiziert Clines JavaScript-Code direkt. Ein Backup wird automatisch erstellt. Die Änderungen werden bei einem Cline-Update überschrieben und müssen dann erneut angewendet werden.' +
            '</div>' +

            '<div class="success">' +
                '<strong>🚨 NEU: Cache-Token Fix!</strong> Behebt das Problem mit 1.4M Cache-Tokens die Cline fälschlicherweise zur Context Window zählt. Cache-Tokens sind gecachte Inhalte und sollten nicht zur Context Window zählen!' +
            '</div>' +

            '<div class="step">' +
                '<h3>Schritt 1: Modelle auswählen</h3>' +
                '<p>Wählen Sie die Modelle aus, für die die Token-Limits korrigiert werden sollen:</p>' +
                
                '<div class="model-selection">' +
                    '<label class="model-checkbox">' +
                        '<input type="checkbox" value="claude-sonnet-4-20250514" checked>' +
                        '<strong>Claude 4 Sonnet</strong> - 8192 → 64000 Token' +
                    '</label>' +
                    '<label class="model-checkbox">' +
                        '<input type="checkbox" value="claude-opus-4-20250514" checked>' +
                        '<strong>Claude 4 Opus</strong> - 8192 → 32000 Token' +
                    '</label>' +
                    '<label class="model-checkbox">' +
                        '<input type="checkbox" value="claude-3-7-sonnet-20250219" checked>' +
                        '<strong>Claude 3.7 Sonnet</strong> - 8192 → 64000 Token' +
                    '</label>' +
                '</div>' +
            '</div>' +

            '<div class="step">' +
                '<h3>Schritt 2: Cache-Fix aktivieren</h3>' +
                '<p>Der Cache-Fix behebt das Problem mit großen Cache-Tokens (z.B. 1.4M) automatisch:</p>' +
                
                '<label class="model-checkbox">' +
                    '<input type="checkbox" id="cacheFixEnabled" checked>' +
                    '<strong>🚨 Cache-Token Fix aktivieren</strong> - Verhindert, dass Cache-Tokens zur Context Window zählen' +
                '</label>' +
                
                '<div class="success">' +
                    '<strong>Was passiert:</strong><br>' +
                    '• Cache-Tokens werden nicht mehr zur Context Window gezählt<br>' +
                    '• 1.4M Cache + 67k Conversation = nur 67k zählen zur Context Window<br>' +
                    '• Keine vorzeitigen Abbrüche mehr wegen Cache-Größe!' +
                '</div>' +
            '</div>' +

            '<div class="step">' +
                '<h3>Schritt 3: Backup und Reparatur</h3>' +
                '<p>Klicken Sie auf "Backup erstellen", um eine Sicherung zu erstellen, dann auf "Reparatur starten":</p>' +
                
                '<button id="backupBtn" class="secondary">📁 Backup erstellen</button>' +
                '<button id="fixBtn" class="primary">🔧 Reparatur starten</button>' +
            '</div>' +

            '<div class="progress" id="progress">' +
                '<div class="spinner"></div>' +
                '<p id="progressText">Verarbeitung läuft...</p>' +
            '</div>' +

            '<div id="result"></div>' +

            '<div class="step">' +
                '<h3>Nach der Reparatur:</h3>' +
                '<ol>' +
                    '<li><strong>VS Code neu laden:</strong> Drücken Sie Ctrl+Shift+P → "Developer: Reload Window"</li>' +
                    '<li><strong>Testen:</strong> Starten Sie eine neue Cline-Aufgabe und überprüfen Sie längere Antworten</li>' +
                    '<li><strong>Bei Problemen:</strong> Das Backup kann manuell wiederhergestellt werden</li>' +
                '</ol>' +
            '</div>' +

            '<script>' +
                'const vscode = acquireVsCodeApi();' +

                'document.getElementById("backupBtn").addEventListener("click", function() {' +
                    'showProgress("Backup wird erstellt...");' +
                    'vscode.postMessage({ command: "createBackup" });' +
                '});' +

                'document.getElementById("fixBtn").addEventListener("click", function() {' +
                    'var selectedModels = Array.from(document.querySelectorAll(".model-selection input:checked"))' +
                        '.map(function(input) { return input.value; });' +
                    
                    'if (selectedModels.length === 0) {' +
                        'showResult("Bitte wählen Sie mindestens ein Modell aus.", "error");' +
                        'return;' +
                    '}' +
                    
                    'showProgress("Token-Limits werden repariert...");' +
                    'vscode.postMessage({' +
                        'command: "performAutoFix",' +
                        'selectedModels: selectedModels' +
                    '});' +
                '});' +

                'function showProgress(text) {' +
                    'document.getElementById("progressText").textContent = text;' +
                    'document.getElementById("progress").style.display = "block";' +
                    'document.getElementById("result").innerHTML = "";' +
                    'document.getElementById("backupBtn").disabled = true;' +
                    'document.getElementById("fixBtn").disabled = true;' +
                '}' +

                'function hideProgress() {' +
                    'document.getElementById("progress").style.display = "none";' +
                    'document.getElementById("backupBtn").disabled = false;' +
                    'document.getElementById("fixBtn").disabled = false;' +
                '}' +

                'function showResult(message, type) {' +
                    'type = type || "success";' +
                    'hideProgress();' +
                    'var resultDiv = document.getElementById("result");' +
                    'resultDiv.innerHTML = "<div class=\\"" + type + "\\"><strong>" + (type === "success" ? "✅" : "❌") + "</strong> " + message + "</div>";' +
                '}' +

                'window.addEventListener("message", function(event) {' +
                    'var message = event.data;' +
                    'switch (message.command) {' +
                        'case "fixResult":' +
                            'showResult(message.message, message.success ? "success" : "error");' +
                            'break;' +
                        'case "backupResult":' +
                            'showResult(message.message, message.success ? "success" : "error");' +
                            'break;' +
                    '}' +
                '});' +
            '</script>' +
        '</body>' +
        '</html>';
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