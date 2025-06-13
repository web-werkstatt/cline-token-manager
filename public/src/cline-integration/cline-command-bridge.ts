import * as vscode from 'vscode';
import { ClineWebviewInjector } from './cline-webview-injector';

export class ClineCommandBridge {
    private static instance: ClineCommandBridge;
    private webviewInjector: ClineWebviewInjector;

    private constructor() {
        this.webviewInjector = ClineWebviewInjector.getInstance();
    }

    public static getInstance(): ClineCommandBridge {
        if (!ClineCommandBridge.instance) {
            ClineCommandBridge.instance = new ClineCommandBridge();
        }
        return ClineCommandBridge.instance;
    }

    public registerCommands(context: vscode.ExtensionContext): void {
        // Register command to inject token display into Cline
        const injectCommand = vscode.commands.registerCommand(
            'cline-token-manager.injectTokenDisplay',
            async () => {
                console.log('🔧 ClineCommandBridge: Manual injection triggered');
                this.webviewInjector.startInjection();
                vscode.window.showInformationMessage('🎯 Token display injected into Cline interface');
            }
        );

        // Register command to listen for Cline webview messages
        const messageHandler = vscode.commands.registerCommand(
            'cline.injectTokenDisplay',
            async (message: any) => {
                console.log('🔧 ClineCommandBridge: Received injection message:', message);
                // This would be called by the webview injection
                return this.handleWebviewMessage(message);
            }
        );

        // Register command to update token display
        const updateCommand = vscode.commands.registerCommand(
            'cline.updateTokenDisplay',
            async (message: any) => {
                console.log('🔧 ClineCommandBridge: Updating token display');
                return this.handleDisplayUpdate(message);
            }
        );

        // Register command to handle clicks from injected overlay
        const clickHandler = vscode.commands.registerCommand(
            'cline-token-manager.handleOverlayClick',
            async () => {
                console.log('🔧 ClineCommandBridge: Overlay clicked, opening dashboard');
                vscode.commands.executeCommand('cline-token-manager.showDashboard');
            }
        );

        context.subscriptions.push(injectCommand, messageHandler, updateCommand, clickHandler);

        console.log('🔧 ClineCommandBridge: Commands registered');
    }

    public startAutoInjection(): void {
        console.log('🔧 ClineCommandBridge: Starting auto-injection');
        this.webviewInjector.startInjection();
        
        // Note: Command 'cline-enhanced.tokenUsageUpdated' is registered elsewhere
        // to avoid duplicate registration errors
    }

    private async handleWebviewMessage(message: any): Promise<boolean> {
        try {
            console.log('🔧 ClineCommandBridge: Handling webview message:', message.type);
            
            if (message.type === 'TOKEN_MANAGER_INJECTION') {
                // Execute the injection script in the webview
                return await this.executeInWebview(message.script, message.data);
            }

            return true;
        } catch (error) {
            console.error('🔧 ClineCommandBridge: Message handling failed:', error);
            return false;
        }
    }

    private async handleDisplayUpdate(message: any): Promise<boolean> {
        try {
            if (message.type === 'TOKEN_MANAGER_UPDATE') {
                // Execute the update script in the webview
                return await this.executeInWebview(message.script, message.data);
            }

            return true;
        } catch (error) {
            console.error('🔧 ClineCommandBridge: Display update failed:', error);
            return false;
        }
    }

    private async executeInWebview(script: string, data: any): Promise<boolean> {
        try {
            // Try to find and execute in active Cline webview
            // This is a simplified approach - in reality we'd need to find the specific webview
            
            // For now, we'll use a different approach: CSS injection via VS Code API
            await this.injectViaCSS(data);
            
            return true;
        } catch (error) {
            console.error('🔧 ClineCommandBridge: Webview execution failed:', error);
            return false;
        }
    }

    private async injectViaCSS(data: any): Promise<void> {
        try {
            // Alternative approach: Use VS Code's built-in notification system
            // to show token info when Cline is active
            
            const tokenPercentage = Math.round((data.tokenUsage / data.tokenLimit) * 100);
            const costPercentage = Math.round((data.costToday / data.costLimit) * 100);
            
            if (tokenPercentage > 80 || costPercentage > 80) {
                const message = `🎯 Token Usage: ${tokenPercentage}% | Cost: ${data.currency}${data.costToday.toFixed(2)}/${data.currency}${data.costLimit.toFixed(2)}`;
                
                if (tokenPercentage > 90 || costPercentage > 90) {
                    vscode.window.showWarningMessage(message, 'Open Dashboard').then(selection => {
                        if (selection === 'Open Dashboard') {
                            vscode.commands.executeCommand('cline-token-manager.showDashboard');
                        }
                    });
                } else {
                    // Show in status bar instead
                    this.updateStatusBar(data);
                }
            }
        } catch (error) {
            console.error('🔧 ClineCommandBridge: CSS injection failed:', error);
        }
    }

    private updateStatusBar(data: any): void {
        try {
            // Update our status bar with current info when Cline is active
            const tokenPercentage = Math.round((data.tokenUsage / data.tokenLimit) * 100);
            const statusBarMessage = `🎯 ${tokenPercentage}% | ${data.currency}${data.costToday.toFixed(2)}`;
            
            // This will be picked up by our main extension's status bar
            vscode.commands.executeCommand('cline-token-manager.updateStatusBar', statusBarMessage);
        } catch (error) {
            console.error('🔧 ClineCommandBridge: Status bar update failed:', error);
        }
    }

    public dispose(): void {
        this.webviewInjector.dispose();
    }
}