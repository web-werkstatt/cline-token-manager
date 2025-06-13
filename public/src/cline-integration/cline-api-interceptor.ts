import * as vscode from 'vscode';
import { SmartFileCondenser } from '../core/context/smart-file-condenser';
import { TokenManager } from '../core/context/context-management/token-manager';

interface ApiCallData {
    url: string;
    method: string;
    headers: any;
    body: string;
    timestamp: number;
}

interface OptimizationResult {
    optimized: boolean;
    originalTokens: number;
    optimizedTokens: number;
    reductionPercentage: number;
    optimizedBody?: string;
    error?: string;
}

export class ClineApiInterceptor {
    private static instance: ClineApiInterceptor;
    private smartFileCondenser: SmartFileCondenser;
    private tokenManager: TokenManager;
    private interceptedCalls: ApiCallData[] = [];

    private constructor() {
        this.smartFileCondenser = SmartFileCondenser.getInstance();
        this.tokenManager = TokenManager.getInstance();
    }

    public static getInstance(): ClineApiInterceptor {
        if (!ClineApiInterceptor.instance) {
            ClineApiInterceptor.instance = new ClineApiInterceptor();
        }
        return ClineApiInterceptor.instance;
    }

    public startInterception(): void {
        console.log('🔧 ClineApiInterceptor: Starting API call interception...');
        this.injectInterceptionScript();
    }

    private injectInterceptionScript(): void {
        // Find all Cline webviews and inject our interception script
        vscode.window.visibleTextEditors.forEach(editor => {
            this.tryInjectIntoWebview();
        });

        // Re-inject when new webviews are created
        vscode.window.onDidChangeActiveTextEditor(() => {
            setTimeout(() => this.tryInjectIntoWebview(), 1000);
        });
    }

    private tryInjectIntoWebview(): void {
        try {
            // This is a proof of concept - real implementation would need webview access
            console.log('🔧 ClineApiInterceptor: Attempting to inject API interception...');
            
            // For now, we'll use command registration as a communication bridge
            this.registerMessageHandlers();
        } catch (error) {
            console.log('🔧 ClineApiInterceptor: No webview found, will retry...');
        }
    }

    private registerMessageHandlers(): void {
        // Register commands that Cline can call to communicate with us
        vscode.commands.registerCommand('cline-token-manager.interceptApiCall', async (data: ApiCallData) => {
            return await this.handleApiCall(data);
        });

        vscode.commands.registerCommand('cline-token-manager.preProcessContext', async (context: string) => {
            return await this.preProcessContext(context);
        });
    }

    public async handleApiCall(data: ApiCallData): Promise<OptimizationResult> {
        console.log('🔧 ClineApiInterceptor: Handling API call to:', data.url);
        
        try {
            // Check if auto-optimize is enabled
            const config = vscode.workspace.getConfiguration('clineTokenManager');
            const autoOptimize = config.get('autoOptimize', true);
            
            if (!autoOptimize) {
                return {
                    optimized: false,
                    originalTokens: 0,
                    optimizedTokens: 0,
                    reductionPercentage: 0
                };
            }

            // Parse the API call body to extract the prompt
            const requestBody = JSON.parse(data.body);
            const messages = requestBody.messages || [];
            
            if (messages.length === 0) {
                return {
                    optimized: false,
                    originalTokens: 0,
                    optimizedTokens: 0,
                    reductionPercentage: 0
                };
            }

            // Get the context from the last user message
            const lastUserMessage = messages.filter((msg: any) => msg.role === 'user').pop();
            if (!lastUserMessage || !lastUserMessage.content) {
                return {
                    optimized: false,
                    originalTokens: 0,
                    optimizedTokens: 0,
                    reductionPercentage: 0
                };
            }

            // Extract text content from Cline's message format
            let contextText = '';
            if (Array.isArray(lastUserMessage.content)) {
                contextText = lastUserMessage.content
                    .filter((item: any) => item.type === 'text')
                    .map((item: any) => item.text || '')
                    .join('\n');
            } else if (typeof lastUserMessage.content === 'string') {
                contextText = lastUserMessage.content;
            }

            // Estimate original token count
            const originalTokens = this.estimateTokens(contextText);
            
            // Check if optimization is needed
            const threshold = config.get('optimizeThreshold', 10000);
            if (originalTokens < threshold) {
                console.log(`🔧 ClineApiInterceptor: Context (${originalTokens} tokens) below threshold (${threshold}), skipping optimization`);
                return {
                    optimized: false,
                    originalTokens,
                    optimizedTokens: originalTokens,
                    reductionPercentage: 0
                };
            }

            // Perform automatic optimization
            console.log(`🔧 ClineApiInterceptor: Auto-optimizing context (${originalTokens} tokens)...`);
            const optimizationResult = await this.preProcessContext(contextText);
            
            if (optimizationResult.optimized && optimizationResult.optimizedContent) {
                // Update the message content with optimized version
                if (Array.isArray(lastUserMessage.content)) {
                    lastUserMessage.content = lastUserMessage.content.map((item: any) => {
                        if (item.type === 'text') {
                            return { ...item, text: optimizationResult.optimizedContent };
                        }
                        return item;
                    });
                } else {
                    lastUserMessage.content = optimizationResult.optimizedContent;
                }

                // Update the request body
                const optimizedRequestBody = { ...requestBody, messages };
                
                console.log(`🎉 ClineApiInterceptor: Auto-optimization successful! ${originalTokens} → ${optimizationResult.optimizedTokens} tokens (${optimizationResult.reductionPercentage}% reduction)`);
                
                // Show non-intrusive notification
                vscode.window.showInformationMessage(
                    `⚡ Auto-optimized: ${originalTokens.toLocaleString()} → ${optimizationResult.optimizedTokens.toLocaleString()} tokens (${optimizationResult.reductionPercentage}% saved)`,
                    { modal: false }
                );

                return {
                    optimized: true,
                    originalTokens,
                    optimizedTokens: optimizationResult.optimizedTokens,
                    reductionPercentage: optimizationResult.reductionPercentage,
                    optimizedBody: JSON.stringify(optimizedRequestBody)
                };
            }

            return {
                optimized: false,
                originalTokens,
                optimizedTokens: originalTokens,
                reductionPercentage: 0
            };

        } catch (error) {
            console.error('🔧 ClineApiInterceptor: Error handling API call:', error);
            return {
                optimized: false,
                originalTokens: 0,
                optimizedTokens: 0,
                reductionPercentage: 0,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async preProcessContext(context: string): Promise<{
        optimized: boolean;
        optimizedContent?: string;
        originalTokens: number;
        optimizedTokens: number;
        reductionPercentage: number;
    }> {
        try {
            const originalTokens = this.estimateTokens(context);
            
            // Use SmartFileCondenser for optimization
            const optimizationResult = await this.smartFileCondenser.optimizeContext(context);
            
            if (optimizationResult && optimizationResult.optimizedContent) {
                const optimizedTokens = this.estimateTokens(optimizationResult.optimizedContent);
                const reductionPercentage = Math.round(((originalTokens - optimizedTokens) / originalTokens) * 100);
                
                return {
                    optimized: true,
                    optimizedContent: optimizationResult.optimizedContent,
                    originalTokens,
                    optimizedTokens,
                    reductionPercentage
                };
            }

            return {
                optimized: false,
                originalTokens,
                optimizedTokens: originalTokens,
                reductionPercentage: 0
            };

        } catch (error) {
            console.error('🔧 ClineApiInterceptor: Error preprocessing context:', error);
            return {
                optimized: false,
                originalTokens: this.estimateTokens(context),
                optimizedTokens: this.estimateTokens(context),
                reductionPercentage: 0
            };
        }
    }

    private estimateTokens(text: string): number {
        // Simple token estimation (Claude uses ~4 chars per token)
        return Math.ceil(text.length / 4);
    }

    public getInterceptionStats(): {
        totalCalls: number;
        optimizedCalls: number;
        totalTokensSaved: number;
        averageReduction: number;
    } {
        // Placeholder for stats
        return {
            totalCalls: this.interceptedCalls.length,
            optimizedCalls: 0,
            totalTokensSaved: 0,
            averageReduction: 0
        };
    }
}