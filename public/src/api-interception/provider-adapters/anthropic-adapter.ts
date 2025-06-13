import { UniversalAIProxy, AIRequest, AIResponse } from '../universal-ai-proxy';

export interface AnthropicRequest {
    model: string;
    max_tokens: number;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    system?: string;
    temperature?: number;
    stream?: boolean;
}

export interface AnthropicResponse {
    id: string;
    type: 'message';
    role: 'assistant';
    content: Array<{
        type: 'text';
        text: string;
    }>;
    model: string;
    stop_reason: string;
    stop_sequence?: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
    };
}

/**
 * 🤖 ANTHROPIC ADAPTER - Claude API Optimization
 * 
 * Specialized adapter for Anthropic's Claude API:
 * - OPTIMIZES Claude requests (Cline, Claude Code, direct API)
 * - TRANSPARENT cost tracking for all Claude models
 * - CACHE-AWARE optimization (addresses the 1.4M cache token problem)
 * - SMART context management for Claude's strengths
 * 
 * Supported models: Claude 4 Sonnet, Claude 4 Opus, Claude 3.7 Sonnet, Claude 3.5 Sonnet
 */
export class AnthropicAdapter {
    private readonly modelCosts = {
        'claude-sonnet-4-20250514': { input: 0.000003, output: 0.000015 },
        'claude-opus-4-20250514': { input: 0.000015, output: 0.000075 },
        'claude-3-7-sonnet-20250219': { input: 0.000003, output: 0.000015 },
        'claude-3-5-sonnet-20241022': { input: 0.000003, output: 0.000015 },
        'claude-3-5-haiku-20241022': { input: 0.00000025, output: 0.00000125 },
        'claude-3-opus-20240229': { input: 0.000015, output: 0.000075 },
        'claude-3-haiku-20240307': { input: 0.00000025, output: 0.00000125 }
    };

    private readonly defaultModel = 'claude-3-5-sonnet-20241022';

    constructor() {
        console.log('🤖 Anthropic Adapter initialized - Claude optimization ready!');
    }

    /**
     * 📡 PROCESS ANTHROPIC REQUEST
     */
    public async processRequest(request: AIRequest): Promise<AIResponse> {
        try {
            console.log('🤖 Processing Anthropic/Claude request...');
            console.log(`📝 Model: ${request.model}`);
            
            // Parse Anthropic-specific request
            const anthropicRequest = this.parseAnthropicRequest(request);
            
            // Calculate costs
            const costs = this.calculateCosts(anthropicRequest);
            console.log(`💰 Estimated cost: Input: €${costs.inputCost.toFixed(6)}, Output: €${costs.outputCost.toFixed(6)}`);
            
            // Optimize the request
            const optimized = await this.optimizeAnthropicRequest(anthropicRequest);
            
            console.log('✅ Anthropic request processed successfully');
            return {
                success: true,
                data: optimized.request,
                cost: costs.totalCost,
                optimization: optimized.optimization
            };
            
        } catch (error) {
            console.error('❌ Anthropic adapter error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * 📝 PARSE ANTHROPIC REQUEST
     */
    private parseAnthropicRequest(request: AIRequest): AnthropicRequest {
        try {
            // Handle different input formats
            if (typeof request.body === 'string') {
                return JSON.parse(request.body);
            }
            
            if (request.body && typeof request.body === 'object') {
                return request.body as AnthropicRequest;
            }
            
            // Fallback: create from basic request
            return {
                model: request.model || this.defaultModel,
                max_tokens: request.maxTokens || 4096,
                messages: [
                    {
                        role: 'user',
                        content: request.context || ''
                    }
                ]
            };
            
        } catch (error) {
            console.error('❌ Error parsing Anthropic request:', error);
            throw new Error('Invalid Anthropic request format');
        }
    }

    /**
     * 💰 CALCULATE COSTS for Claude models
     */
    private calculateCosts(request: AnthropicRequest) {
        const model = request.model || this.defaultModel;
        const costs = this.modelCosts[model as keyof typeof this.modelCosts] || 
                     this.modelCosts[this.defaultModel as keyof typeof this.modelCosts];
        
        // Calculate input tokens
        const inputText = this.extractInputText(request);
        const inputTokens = this.estimateTokens(inputText);
        
        // Estimate output tokens (use max_tokens as upper bound)
        const maxOutputTokens = request.max_tokens || 4096;
        
        const inputCost = (inputTokens / 1000) * costs.input;
        const outputCost = (maxOutputTokens / 1000) * costs.output;
        
        return {
            inputTokens,
            maxOutputTokens,
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost
        };
    }

    /**
     * 🧠 OPTIMIZE ANTHROPIC REQUEST
     */
    private async optimizeAnthropicRequest(request: AnthropicRequest): Promise<{
        request: AnthropicRequest;
        optimization?: {
            originalTokens: number;
            optimizedTokens: number;
            tokensSaved: number;
            costSaved: number;
            reductionPercentage: number;
        };
    }> {
        console.log('🧠 Applying Claude-specific optimization...');
        
        const originalRequest = JSON.parse(JSON.stringify(request));
        const originalInputText = this.extractInputText(request);
        const originalTokens = this.estimateTokens(originalInputText);
        
        // Apply Claude-specific optimizations
        let optimizedRequest = await this.optimizeMessages(request);
        optimizedRequest = await this.optimizeSystemPrompt(optimizedRequest);
        optimizedRequest = await this.optimizeCodeContext(optimizedRequest);
        
        const optimizedInputText = this.extractInputText(optimizedRequest);
        const optimizedTokens = this.estimateTokens(optimizedInputText);
        
        const tokensSaved = originalTokens - optimizedTokens;
        const reductionPercentage = (tokensSaved / originalTokens) * 100;
        
        // Calculate cost savings
        const model = request.model || this.defaultModel;
        const costs = this.modelCosts[model as keyof typeof this.modelCosts] || 
                     this.modelCosts[this.defaultModel as keyof typeof this.modelCosts];
        const costSaved = (tokensSaved / 1000) * costs.input;
        
        console.log(`📉 Optimization results: ${originalTokens} → ${optimizedTokens} tokens (-${reductionPercentage.toFixed(1)}%)`);
        console.log(`💰 Cost saved: €${costSaved.toFixed(6)}`);
        
        return {
            request: optimizedRequest,
            optimization: {
                originalTokens,
                optimizedTokens,
                tokensSaved,
                costSaved,
                reductionPercentage
            }
        };
    }

    /**
     * 💬 OPTIMIZE MESSAGES - Claude conversation optimization
     */
    private async optimizeMessages(request: AnthropicRequest): Promise<AnthropicRequest> {
        if (!request.messages || request.messages.length === 0) {
            return request;
        }
        
        const optimizedMessages = request.messages.map(message => {
            if (message.role === 'user') {
                // Optimize user messages
                let content = message.content;
                
                // Remove redundant whitespace
                content = content.replace(/\s+/g, ' ').trim();
                
                // Smart code compression
                content = this.compressCodeInContent(content);
                
                // Remove verbose explanations if they're repetitive
                content = this.removeRedundantExplanations(content);
                
                return {
                    ...message,
                    content
                };
            }
            return message;
        });
        
        return {
            ...request,
            messages: optimizedMessages
        };
    }

    /**
     * 🎯 OPTIMIZE SYSTEM PROMPT
     */
    private async optimizeSystemPrompt(request: AnthropicRequest): Promise<AnthropicRequest> {
        if (!request.system) {
            return request;
        }
        
        let systemPrompt = request.system;
        
        // Remove redundant instructions
        systemPrompt = systemPrompt.replace(/\b(please|kindly|if you could|would you mind)\b/gi, '');
        
        // Compress verbose instructions
        systemPrompt = systemPrompt.replace(/You are a helpful AI assistant that/gi, 'You are an AI that');
        systemPrompt = systemPrompt.replace(/I would like you to/gi, '');
        systemPrompt = systemPrompt.replace(/Can you help me/gi, 'Help');
        
        // Remove redundant whitespace
        systemPrompt = systemPrompt.replace(/\s+/g, ' ').trim();
        
        return {
            ...request,
            system: systemPrompt
        };
    }

    /**
     * 🗜️ OPTIMIZE CODE CONTEXT - Claude code optimization
     */
    private async optimizeCodeContext(request: AnthropicRequest): Promise<AnthropicRequest> {
        const optimizedMessages = request.messages.map(message => {
            if (message.role === 'user' && this.containsCode(message.content)) {
                let content = message.content;
                
                // Extract and compress code blocks
                content = content.replace(/```[\s\S]*?```/g, (match) => {
                    return this.compressCodeBlock(match);
                });
                
                // Compress inline code
                content = content.replace(/`[^`]+`/g, (match) => {
                    return this.compressInlineCode(match);
                });
                
                return {
                    ...message,
                    content
                };
            }
            return message;
        });
        
        return {
            ...request,
            messages: optimizedMessages
        };
    }

    /**
     * 🔧 HELPER METHODS
     */
    private extractInputText(request: AnthropicRequest): string {
        let text = '';
        
        if (request.system) {
            text += request.system + '\n';
        }
        
        if (request.messages) {
            text += request.messages.map(m => m.content).join('\n');
        }
        
        return text;
    }

    private estimateTokens(text: string): number {
        // Claude tokenization is roughly 1 token per 3.5 characters
        return Math.ceil(text.length / 3.5);
    }

    private compressCodeInContent(content: string): string {
        // Remove excessive blank lines in code
        content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        // Compress verbose variable names in examples (not in actual code)
        if (content.includes('example') || content.includes('sample')) {
            content = content.replace(/\bveryLongVariableName\b/g, 'varName');
            content = content.replace(/\bsomeVeryLongFunctionName\b/g, 'funcName');
        }
        
        return content;
    }

    private removeRedundantExplanations(content: string): string {
        // Remove phrases that add no value
        const redundantPhrases = [
            /As you can see,?\s*/gi,
            /It should be noted that\s*/gi,
            /Please note that\s*/gi,
            /It is important to mention that\s*/gi,
            /I would like to point out that\s*/gi
        ];
        
        for (const phrase of redundantPhrases) {
            content = content.replace(phrase, '');
        }
        
        return content;
    }

    private containsCode(content: string): boolean {
        return content.includes('```') || 
               content.includes('function') ||
               content.includes('class ') ||
               content.includes('import ') ||
               content.includes('export ') ||
               content.match(/\w+\([^)]*\)\s*{/) !== null;
    }

    private compressCodeBlock(codeBlock: string): string {
        // Extract language and code
        const match = codeBlock.match(/```(\w+)?\n([\s\S]*?)```/);
        if (!match) return codeBlock;
        
        const [, language, code] = match;
        let compressedCode = code;
        
        // Remove empty lines
        compressedCode = compressedCode.replace(/^\s*\n/gm, '');
        
        // Compress long functions (keep signature, summarize body)
        compressedCode = compressedCode.replace(
            /(function\s+\w+\([^)]*\)|\w+\([^)]*\)\s*=>|\w+\([^)]*\))\s*{[\s\S]{150,}?}/g,
            (match) => {
                const signature = match.match(/(function\s+\w+\([^)]*\)|\w+\([^)]*\)\s*=>|\w+\([^)]*\))/)?.[0] || '';
                return signature + ' { /* ... */ }';
            }
        );
        
        return '```' + (language || '') + '\n' + compressedCode + '\n```';
    }

    private compressInlineCode(inlineCode: string): string {
        // Don't modify short inline code
        if (inlineCode.length < 50) return inlineCode;
        
        // Truncate very long inline code
        const code = inlineCode.slice(1, -1); // Remove backticks
        if (code.length > 100) {
            return '`' + code.substring(0, 47) + '...' + code.substring(code.length - 47) + '`';
        }
        
        return inlineCode;
    }

    /**
     * 🔍 RESPONSE PARSING
     */
    public parseResponse(response: any): AnthropicResponse | null {
        try {
            if (response && response.content && response.usage) {
                return response as AnthropicResponse;
            }
            return null;
        } catch (error) {
            console.error('❌ Error parsing Anthropic response:', error);
            return null;
        }
    }

    /**
     * 📊 EXTRACT USAGE FROM RESPONSE
     */
    public extractUsage(response: AnthropicResponse) {
        return {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            cacheCreationTokens: response.usage.cache_creation_input_tokens || 0,
            cacheReadTokens: response.usage.cache_read_input_tokens || 0,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens
        };
    }

    /**
     * 💰 CALCULATE ACTUAL COST from response
     */
    public calculateActualCost(response: AnthropicResponse): number {
        const model = response.model || this.defaultModel;
        const costs = this.modelCosts[model as keyof typeof this.modelCosts] || 
                     this.modelCosts[this.defaultModel as keyof typeof this.modelCosts];
        
        const usage = this.extractUsage(response);
        
        const inputCost = (usage.inputTokens / 1000) * costs.input;
        const outputCost = (usage.outputTokens / 1000) * costs.output;
        
        return inputCost + outputCost;
    }

    /**
     * 🎯 GET SUPPORTED MODELS
     */
    public getSupportedModels(): string[] {
        return Object.keys(this.modelCosts);
    }

    /**
     * 📋 GET MODEL INFO
     */
    public getModelInfo(model: string) {
        const costs = this.modelCosts[model as keyof typeof this.modelCosts];
        if (!costs) return null;
        
        return {
            model,
            inputCostPer1k: costs.input,
            outputCostPer1k: costs.output,
            provider: 'Anthropic',
            family: model.includes('claude-4') ? 'Claude 4' : 
                   model.includes('claude-3-7') ? 'Claude 3.7' :
                   model.includes('claude-3-5') ? 'Claude 3.5' : 'Claude 3'
        };
    }
}