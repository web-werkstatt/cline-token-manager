import * as vscode from 'vscode';
import { TokenManager } from './context/context-management/token-manager';
import { ClineTokenLimitDetector } from '../cline-integration/cline-token-limit-detector';

interface TruncationEvent {
    timestamp: number;
    modelId: string;
    outputTokens: number;
    modelLimit: number;
    possiblyTruncated: boolean;
    truncationIndicators: string[];
}

export class TruncationDetector {
    private static instance: TruncationDetector;
    private tokenManager: TokenManager;
    private clineTokenLimitDetector: ClineTokenLimitDetector;
    private truncationEvents: TruncationEvent[] = [];
    
    // Common patterns that indicate truncation
    private readonly truncationPatterns = [
        /\.\.\.$/, // Ends with ellipsis
        /\[truncated\]/i,
        /\[output truncated\]/i,
        /\[rest of .*? omitted\]/i,
        /^\s*$/m, // Ends with empty line
        /```[\s\S]*?$/, // Unclosed code block
        /^(?!.*\*\/).*\/\*[\s\S]*$/m, // Unclosed comment
        /^\s*\{[^}]*$/m, // Unclosed JSON/object
        /^\s*\[[^\]]*$/m, // Unclosed array
        /[^.!?]\s*$/, // Doesn't end with punctuation
    ];

    private constructor(tokenManager: TokenManager) {
        this.tokenManager = tokenManager;
        this.clineTokenLimitDetector = ClineTokenLimitDetector.getInstance();
    }

    public static getInstance(tokenManager: TokenManager): TruncationDetector {
        if (!TruncationDetector.instance) {
            TruncationDetector.instance = new TruncationDetector(tokenManager);
        }
        return TruncationDetector.instance;
    }

    public checkForTruncation(
        modelId: string,
        outputText: string,
        outputTokens: number
    ): TruncationEvent | null {
        // Get model limits
        const modelLimits = this.clineTokenLimitDetector.getModelLimitInfo(modelId);
        if (!modelLimits) {
            return null;
        }

        // Check if output is near the limit (95% or more)
        const nearLimit = outputTokens >= modelLimits.clineActual * 0.95;
        
        // Check for truncation patterns
        const truncationIndicators: string[] = [];
        
        for (const pattern of this.truncationPatterns) {
            if (pattern.test(outputText)) {
                truncationIndicators.push(pattern.toString());
            }
        }

        // Additional checks for code
        if (outputText.includes('```')) {
            const codeBlockCount = (outputText.match(/```/g) || []).length;
            if (codeBlockCount % 2 !== 0) {
                truncationIndicators.push('Unclosed code block');
            }
        }

        // Check for incomplete sentences
        const lastLine = outputText.trim().split('\n').pop() || '';
        if (lastLine && !lastLine.match(/[.!?]$/) && lastLine.length > 10) {
            truncationIndicators.push('Incomplete sentence');
        }

        const possiblyTruncated = nearLimit && truncationIndicators.length > 0;

        if (possiblyTruncated || nearLimit) {
            const event: TruncationEvent = {
                timestamp: Date.now(),
                modelId,
                outputTokens,
                modelLimit: modelLimits.clineActual,
                possiblyTruncated,
                truncationIndicators
            };

            this.truncationEvents.push(event);
            
            // Show warning if likely truncated
            if (possiblyTruncated) {
                this.showTruncationWarning(event);
            }

            return event;
        }

        return null;
    }

    private async showTruncationWarning(event: TruncationEvent): Promise<void> {
        const modelLimits = this.clineTokenLimitDetector.getModelLimitInfo(event.modelId);
        if (!modelLimits) return;

        const message = `⚠️ Antwort möglicherweise abgeschnitten!\n\n` +
            `Model: ${event.modelId}\n` +
            `Output Tokens: ${event.outputTokens} / ${event.modelLimit} (Cline Limit)\n` +
            `Offizielles Limit: ${modelLimits.official} Tokens`;

        const selection = await vscode.window.showWarningMessage(
            message,
            'Details',
            'Token Limit Fix',
            'Ignorieren'
        );

        if (selection === 'Details') {
            await this.showTruncationDetails(event);
        } else if (selection === 'Token Limit Fix') {
            await vscode.commands.executeCommand('cline-token-manager.showTokenLimitFix');
        }
    }

    private async showTruncationDetails(event: TruncationEvent): Promise<void> {
        const modelLimits = this.clineTokenLimitDetector.getModelLimitInfo(event.modelId);
        
        const content = `# Truncation Detection Report

## Event Details
- **Timestamp:** ${new Date(event.timestamp).toLocaleString()}
- **Model:** ${event.modelId}
- **Output Tokens:** ${event.outputTokens}
- **Cline Limit:** ${event.modelLimit}
- **Official Limit:** ${modelLimits?.official || 'Unknown'}
${modelLimits?.betaLimit ? `- **Beta Limit:** ${modelLimits.betaLimit}` : ''}

## Truncation Indicators Found
${event.truncationIndicators.map(ind => `- ${ind}`).join('\n')}

## Recommendation
${event.outputTokens < (modelLimits?.official || 0) 
    ? 'This response was truncated due to Cline\'s artificial limit. Consider applying the token limit fix.'
    : 'This response reached the model\'s official limit. Consider using a model with higher output capacity.'}

## How to Fix
1. Run command: \`Token Manager: Show Token Limit Fix Instructions\`
2. Follow the guide to patch Cline's token limits
3. Restart VS Code after applying the fix
`;

        const doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(doc);
    }

    public getTruncationEvents(): TruncationEvent[] {
        return [...this.truncationEvents];
    }

    public getRecentTruncationEvents(hours: number = 24): TruncationEvent[] {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.truncationEvents.filter(e => e.timestamp >= cutoff);
    }

    public getTruncationStats(): {
        totalEvents: number;
        byModel: Record<string, number>;
        last24h: number;
        averageTokensAtTruncation: number;
    } {
        const byModel: Record<string, number> = {};
        let totalTokens = 0;

        for (const event of this.truncationEvents) {
            byModel[event.modelId] = (byModel[event.modelId] || 0) + 1;
            totalTokens += event.outputTokens;
        }

        return {
            totalEvents: this.truncationEvents.length,
            byModel,
            last24h: this.getRecentTruncationEvents(24).length,
            averageTokensAtTruncation: this.truncationEvents.length > 0 
                ? Math.round(totalTokens / this.truncationEvents.length)
                : 0
        };
    }

    public clearEvents(): void {
        this.truncationEvents = [];
    }
}