/**
 * 🔍 Universal Provider Detection System
 * 
 * Detects which AI provider is being used in Cline and adapts
 * token tracking accordingly. Ready for Claude Code integration!
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ProviderInfo {
    name: string;
    id: string;
    storagePath?: string;
    configKey?: string;
    models?: string[];
    isActive: boolean;
}

export class ProviderDetector {
    private static instance: ProviderDetector;
    
    // Known provider patterns
    private readonly PROVIDERS = {
        ANTHROPIC: {
            id: 'anthropic',
            name: 'Anthropic',
            configKeys: ['apiProvider', 'anthropicApiKey'],
            models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3.5-sonnet']
        },
        CLAUDE_CODE: {
            id: 'claude-code',
            name: 'Claude Code',
            configKeys: ['claudeCodePath', 'apiProvider'],
            models: ['claude-sonnet-4-20250514', 'claude-4.0-sonnet-exp'],
            storagePath: 'claude-code' // Different storage structure expected
        },
        OPENROUTER: {
            id: 'openrouter',
            name: 'OpenRouter',
            configKeys: ['openRouterApiKey', 'apiProvider'],
            models: ['anthropic/', 'openai/', 'google/', 'meta/']
        },
        OPENAI: {
            id: 'openai',
            name: 'OpenAI',
            configKeys: ['openaiApiKey', 'apiProvider'],
            models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo']
        },
        CUSTOM: {
            id: 'custom',
            name: 'Custom Provider',
            configKeys: ['customBaseUrl', 'apiProvider'],
            models: []
        }
    };
    
    private constructor() {}
    
    public static getInstance(): ProviderDetector {
        if (!ProviderDetector.instance) {
            ProviderDetector.instance = new ProviderDetector();
        }
        return ProviderDetector.instance;
    }
    
    /**
     * Detect all active providers in the current workspace
     */
    public async detectActiveProviders(): Promise<ProviderInfo[]> {
        const activeProviders: ProviderInfo[] = [];
        
        try {
            // Check VS Code settings
            const config = vscode.workspace.getConfiguration('cline');
            const apiProvider = config.get<string>('apiProvider');
            
            console.log('🔍 ProviderDetector: Current API provider:', apiProvider);
            
            // Check each known provider
            for (const [key, provider] of Object.entries(this.PROVIDERS)) {
                const isActive = await this.isProviderActive(provider, config);
                
                if (isActive) {
                    const info: ProviderInfo = {
                        name: provider.name,
                        id: provider.id,
                        isActive: true,
                        models: provider.models,
                        storagePath: await this.getProviderStoragePath(provider.id)
                    };
                    
                    activeProviders.push(info);
                    console.log(`✅ ProviderDetector: ${provider.name} is active`);
                }
            }
            
            // Special detection for Claude Code (might not be in settings yet)
            if (await this.detectClaudeCodeInstallation()) {
                const claudeCode = this.PROVIDERS.CLAUDE_CODE;
                activeProviders.push({
                    name: claudeCode.name,
                    id: claudeCode.id,
                    isActive: true,
                    models: claudeCode.models,
                    storagePath: await this.getProviderStoragePath(claudeCode.id)
                });
                console.log('✅ ProviderDetector: Claude Code detected via CLI');
            }
            
        } catch (error) {
            console.error('🔍 ProviderDetector: Error detecting providers:', error);
        }
        
        return activeProviders;
    }
    
    /**
     * Check if a specific provider is active
     */
    private async isProviderActive(provider: any, config: vscode.WorkspaceConfiguration): Promise<boolean> {
        // Check if provider is selected
        const apiProvider = config.get<string>('apiProvider');
        if (apiProvider === provider.id) {
            return true;
        }
        
        // Check if provider has API key configured
        for (const configKey of provider.configKeys) {
            const value = config.get(configKey);
            if (value && value !== '') {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Special detection for Claude Code CLI installation
     */
    private async detectClaudeCodeInstallation(): Promise<boolean> {
        try {
            // Check common installation paths
            const possiblePaths = [
                path.join(process.env.HOME || '', '.claude-code', 'bin', 'claude-code'),
                path.join(process.env.HOME || '', '.local', 'bin', 'claude-code'),
                '/usr/local/bin/claude-code',
                'C:\\Program Files\\Claude Code\\claude-code.exe',
                'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\claude-code\\claude-code.exe'
            ];
            
            // Check VS Code config for custom path
            const config = vscode.workspace.getConfiguration('cline');
            const customPath = config.get<string>('claudeCodePath');
            if (customPath) {
                possiblePaths.unshift(customPath);
            }
            
            // Check if any path exists
            for (const claudePath of possiblePaths) {
                if (fs.existsSync(claudePath)) {
                    console.log('🔍 ProviderDetector: Found Claude Code at:', claudePath);
                    return true;
                }
            }
            
            // Check if claude-code is in PATH
            const { exec } = require('child_process');
            return new Promise((resolve) => {
                exec('claude-code --version', (error: any) => {
                    resolve(!error);
                });
            });
            
        } catch (error) {
            console.error('🔍 ProviderDetector: Error detecting Claude Code:', error);
            return false;
        }
    }
    
    /**
     * Get storage path for a specific provider
     */
    private async getProviderStoragePath(providerId: string): Promise<string | undefined> {
        const os = require('os');
        let baseStoragePath = '';
        
        // Base Cline storage path
        if (process.platform === 'win32') {
            baseStoragePath = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
        } else if (process.platform === 'darwin') {
            baseStoragePath = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
        } else {
            baseStoragePath = path.join(os.homedir(), '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
        }
        
        // Provider-specific paths
        switch (providerId) {
            case 'claude-code':
                // Claude Code might use different storage structure
                const claudeCodePath = path.join(os.homedir(), '.claude-code', 'sessions');
                if (fs.existsSync(claudeCodePath)) {
                    return claudeCodePath;
                }
                break;
        }
        
        // Default to standard Cline storage
        return baseStoragePath;
    }
    
    /**
     * Get current active provider
     */
    public async getCurrentProvider(): Promise<ProviderInfo | null> {
        const providers = await this.detectActiveProviders();
        
        // Prioritize based on VS Code settings
        const config = vscode.workspace.getConfiguration('cline');
        const apiProvider = config.get<string>('apiProvider');
        
        const currentProvider = providers.find(p => p.id === apiProvider);
        if (currentProvider) {
            return currentProvider;
        }
        
        // Return first active provider
        return providers.length > 0 ? providers[0] : null;
    }
    
    /**
     * Monitor for provider changes
     */
    public onProviderChange(callback: (provider: ProviderInfo) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('cline')) {
                const newProvider = await this.getCurrentProvider();
                if (newProvider) {
                    callback(newProvider);
                }
            }
        });
    }
}