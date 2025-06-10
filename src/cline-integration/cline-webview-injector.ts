import * as vscode from 'vscode';
import { TokenManager } from '../core/context/context-management/token-manager';
import { ConfigLoader } from '../config/config-loader';

export class ClineWebviewInjector {
    private static instance: ClineWebviewInjector;
    private tokenManager: TokenManager;
    private configLoader: ConfigLoader;
    private injectionInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.tokenManager = TokenManager.getInstance();
        this.configLoader = ConfigLoader.getInstance();
    }

    public static getInstance(): ClineWebviewInjector {
        if (!ClineWebviewInjector.instance) {
            ClineWebviewInjector.instance = new ClineWebviewInjector();
        }
        return ClineWebviewInjector.instance;
    }

    public startInjection(): void {
        console.log('🔧 ClineWebviewInjector: Starting optimized event-based injection...');
        
        // Initial injection after 1 second
        setTimeout(() => this.injectTokenDisplay(), 1000);
        
        // Debounced injection to prevent excessive calls
        let injectionTimeout: NodeJS.Timeout | null = null;
        const debouncedInject = () => {
            if (injectionTimeout) clearTimeout(injectionTimeout);
            injectionTimeout = setTimeout(() => this.injectTokenDisplay(), 500);
        };
        
        // Only re-inject when VS Code window focus changes or tabs change
        vscode.window.onDidChangeActiveTextEditor(debouncedInject);
        
        vscode.window.onDidChangeWindowState((state) => {
            if (state.focused) {
                debouncedInject();
            }
        });
        
        // Note: Command 'cline-enhanced.tokenDisplayUpdate' is registered in extension.ts
        // to avoid duplicate registration errors
    }

    public stopInjection(): void {
        if (this.injectionInterval) {
            clearInterval(this.injectionInterval);
            this.injectionInterval = null;
        }
    }

    private async injectTokenDisplay(): Promise<void> {
        try {
            // Find all webview panels (Cline chat windows)
            const webviewPanels = (vscode.window as any).tabGroups?.all
                ?.flatMap((group: any) => group.tabs)
                ?.filter((tab: any) => tab.input?.viewType === 'mainWebview' || 
                                      tab.label?.includes('Cline') ||
                                      tab.label?.includes('Claude'));

            if (webviewPanels && webviewPanels.length > 0) {
                // Inject into active webview
                this.injectIntoActiveWebview();
            }
        } catch (error) {
            console.warn('🔧 ClineWebviewInjector: Failed to inject:', error);
        }
    }

    private async injectIntoActiveWebview(): Promise<void> {
        try {
            // Execute JavaScript in the active webview to inject our token display
            const injectionScript = this.generateInjectionScript();
            
            // Use postMessage to communicate with webview
            const message = {
                type: 'TOKEN_MANAGER_INJECTION',
                script: injectionScript,
                data: await this.getTokenDisplayData()
            };

            // Broadcast to all potential Cline webviews
            vscode.commands.executeCommand('cline.injectTokenDisplay', message);
            
        } catch (error) {
            console.warn('🔧 ClineWebviewInjector: Injection failed:', error);
        }
    }

    private generateInjectionScript(): string {
        return `
        (function() {
            // Remove existing token display if present
            const existingDisplay = document.getElementById('cline-token-manager-overlay');
            if (existingDisplay) {
                existingDisplay.remove();
            }

            // Create token display overlay
            const overlay = document.createElement('div');
            overlay.id = 'cline-token-manager-overlay';
            overlay.style.cssText = \`
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-family: 'Monaco', 'Consolas', monospace;
                font-size: 11px;
                z-index: 10000;
                border: 1px solid rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(4px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
                cursor: pointer;
                min-width: 160px;
            \`;

            // Add content
            overlay.innerHTML = \`
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-weight: bold; color: #4CAF50;">🎯 Token Manager</span>
                    <span id="token-status-indicator" style="width: 8px; height: 8px; border-radius: 50%; background: #4CAF50;"></span>
                </div>
                <div style="font-size: 10px; opacity: 0.8; margin-bottom: 2px;">
                    Tokens: <span id="token-usage">0</span> / <span id="token-limit">0</span>
                </div>
                <div style="font-size: 10px; opacity: 0.8;">
                    Cost: <span id="cost-today">$0.00</span> / <span id="cost-limit">$0.00</span>
                </div>
                <div style="width: 100%; height: 3px; background: rgba(255,255,255,0.2); border-radius: 2px; margin-top: 4px; overflow: hidden;">
                    <div id="token-progress" style="height: 100%; background: #4CAF50; width: 0%; transition: width 0.3s ease;"></div>
                </div>
            \`;

            // Click handler to open Token Manager dashboard
            overlay.addEventListener('click', () => {
                // Send message to extension
                if (window.acquireVsCodeApi) {
                    const vscode = window.acquireVsCodeApi();
                    vscode.postMessage({
                        type: 'OPEN_TOKEN_MANAGER',
                        command: 'cline-token-manager.showDashboard'
                    });
                }
            });

            // Hover effects
            overlay.addEventListener('mouseenter', () => {
                overlay.style.background = 'rgba(0, 0, 0, 0.9)';
                overlay.style.transform = 'scale(1.05)';
            });

            overlay.addEventListener('mouseleave', () => {
                overlay.style.background = 'rgba(0, 0, 0, 0.8)';
                overlay.style.transform = 'scale(1)';
            });

            // Insert into page
            document.body.appendChild(overlay);

            console.log('🎯 Token Manager overlay injected successfully');

            // Function to update display data
            window.updateTokenManagerDisplay = function(data) {
                const tokenUsage = document.getElementById('token-usage');
                const tokenLimit = document.getElementById('token-limit');
                const costToday = document.getElementById('cost-today');
                const costLimit = document.getElementById('cost-limit');
                const tokenProgress = document.getElementById('token-progress');
                const statusIndicator = document.getElementById('token-status-indicator');

                if (tokenUsage) tokenUsage.textContent = data.tokenUsage.toLocaleString();
                if (tokenLimit) tokenLimit.textContent = data.tokenLimit.toLocaleString();
                if (costToday) costToday.textContent = data.currency + data.costToday.toFixed(2);
                if (costLimit) costLimit.textContent = data.currency + data.costLimit.toFixed(2);

                // Update progress bar
                if (tokenProgress) {
                    const percentage = Math.min((data.tokenUsage / data.tokenLimit) * 100, 100);
                    tokenProgress.style.width = percentage + '%';
                    
                    // Change color based on usage
                    if (percentage > 90) {
                        tokenProgress.style.background = '#f44336'; // Red
                        statusIndicator.style.background = '#f44336';
                    } else if (percentage > 75) {
                        tokenProgress.style.background = '#ff9800'; // Orange
                        statusIndicator.style.background = '#ff9800';
                    } else {
                        tokenProgress.style.background = '#4CAF50'; // Green
                        statusIndicator.style.background = '#4CAF50';
                    }
                }
            };

            return true;
        })();
        `;
    }

    private async getTokenDisplayData(): Promise<any> {
        const tokenStatus = this.tokenManager.getTokenLimitStatus();
        const costStatus = this.tokenManager.getCostLimitStatus();
        const config = this.configLoader.getConfig();

        return {
            tokenUsage: tokenStatus.used,
            tokenLimit: tokenStatus.limit,
            costToday: costStatus.cost,
            costLimit: costStatus.limit,
            currency: config.costTracking?.currency || '$',
            tokenPercentage: tokenStatus.percentage,
            costPercentage: costStatus.percentage,
            warning: tokenStatus.warning || costStatus.warning
        };
    }

    public async updateDisplay(): Promise<void> {
        try {
            const data = await this.getTokenDisplayData();
            
            // Send update message to all webviews
            const updateScript = `
                if (window.updateTokenManagerDisplay) {
                    window.updateTokenManagerDisplay(${JSON.stringify(data)});
                }
            `;

            // Execute update in active webview
            vscode.commands.executeCommand('cline.updateTokenDisplay', {
                type: 'TOKEN_MANAGER_UPDATE',
                script: updateScript,
                data: data
            });
        } catch (error) {
            console.warn('🔧 ClineWebviewInjector: Update failed:', error);
        }
    }

    public dispose(): void {
        this.stopInjection();
    }
}