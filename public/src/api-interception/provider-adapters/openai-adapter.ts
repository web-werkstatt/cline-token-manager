import { UniversalAIProxy, AIRequest, AIResponse } from '../universal-ai-proxy';

export interface OpenAIRequest {
    model: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
    tools?: any[];
    tool_choice?: string | object;
}

export interface OpenAIResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: 'assistant';
            content: string;
            tool_calls?: any[];
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * 🤖 OPENAI ADAPTER - GPT API Optimization
 * 
 * Specialized adapter for OpenAI's GPT API:
 * - OPTIMIZES GPT requests (GitHub Copilot, ChatGPT, direct API)
 * - TRANSPARENT cost tracking for all GPT models
 * - SMART context management for GPT's capabilities
 * - FUNCTION CALLING optimization
 * 
 * Supported models: GPT-4o, GPT-4, GPT-3.5-turbo, etc.
 */
export class OpenAIAdapter {
    private readonly modelCosts = {
        // GPT-4o models
        'gpt-4o': { input: 0.00250, output: 0.01000 },
        'gpt-4o-2024-08-06': { input: 0.00250, output: 0.01000 },
        'gpt-4o-mini': { input: 0.00015, output: 0.00060 },
        'gpt-4o-mini-2024-07-18': { input: 0.00015, output: 0.00060 },
        
        // GPT-4 models
        'gpt-4': { input: 0.03000, output: 0.06000 },
        'gpt-4-0613': { input: 0.03000, output: 0.06000 },
        'gpt-4-32k': { input: 0.06000, output: 0.12000 },
        'gpt-4-turbo': { input: 0.01000, output: 0.03000 },
        'gpt-4-turbo-2024-04-09': { input: 0.01000, output: 0.03000 },
        
        // GPT-3.5 models
        'gpt-3.5-turbo': { input: 0.00050, output: 0.00150 },
        'gpt-3.5-turbo-0125': { input: 0.00050, output: 0.00150 },
        'gpt-3.5-turbo-instruct': { input: 0.00150, output: 0.00200 },
        
        // Legacy models
        'text-davinci-003': { input: 0.02000, output: 0.02000 },
        'text-davinci-002': { input: 0.02000, output: 0.02000 }
    };

    private readonly defaultModel = 'gpt-4o-mini';

    constructor() {
        console.log('🤖 OpenAI Adapter initialized - GPT optimization ready!');
    }

    /**
     * 📡 PROCESS OPENAI REQUEST
     */
    public async processRequest(request: AIRequest): Promise<AIResponse> {
        try {
            console.log('🤖 Processing OpenAI/GPT request...');
            console.log(`📝 Model: ${request.model}`);
            
            // Parse OpenAI-specific request
            const openaiRequest = this.parseOpenAIRequest(request);
            
            // Calculate costs
            const costs = this.calculateCosts(openaiRequest);
            console.log(`💰 Estimated cost: Input: €${costs.inputCost.toFixed(6)}, Output: €${costs.outputCost.toFixed(6)}`);
            
            // Optimize the request
            const optimized = await this.optimizeOpenAIRequest(openaiRequest);
            
            console.log('✅ OpenAI request processed successfully');
            return {
                success: true,
                data: optimized.request,
                cost: costs.totalCost,
                optimization: optimized.optimization
            };
            
        } catch (error) {
            console.error('❌ OpenAI adapter error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * 📝 PARSE OPENAI REQUEST
     */
    private parseOpenAIRequest(request: AIRequest): OpenAIRequest {
        try {
            // Handle different input formats
            if (typeof request.body === 'string') {
                return JSON.parse(request.body);
            }
            
            if (request.body && typeof request.body === 'object') {
                return request.body as OpenAIRequest;
            }
            
            // Fallback: create from basic request
            return {
                model: request.model || this.defaultModel,
                messages: [
                    {
                        role: 'user',
                        content: request.context || ''
                    }
                ],
                max_tokens: request.maxTokens || 4096
            };
            
        } catch (error) {
            console.error('❌ Error parsing OpenAI request:', error);
            throw new Error('Invalid OpenAI request format');
        }
    }

    /**
     * 💰 CALCULATE COSTS for GPT models
     */
    private calculateCosts(request: OpenAIRequest) {
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
     * 🧠 OPTIMIZE OPENAI REQUEST
     */
    private async optimizeOpenAIRequest(request: OpenAIRequest): Promise<{
        request: OpenAIRequest;
        optimization?: {
            originalTokens: number;
            optimizedTokens: number;
            tokensSaved: number;
            costSaved: number;
            reductionPercentage: number;
        };
    }> {
        console.log('🧠 Applying GPT-specific optimization...');
        
        const originalRequest = JSON.parse(JSON.stringify(request));
        const originalInputText = this.extractInputText(request);
        const originalTokens = this.estimateTokens(originalInputText);
        
        // Apply GPT-specific optimizations
        let optimizedRequest = await this.optimizeMessages(request);
        optimizedRequest = await this.optimizeFunctionCalls(optimizedRequest);
        optimizedRequest = await this.optimizeCodeContext(optimizedRequest);
        optimizedRequest = await this.optimizeConversationHistory(optimizedRequest);
        
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
     * 💬 OPTIMIZE MESSAGES - GPT conversation optimization
     */
    private async optimizeMessages(request: OpenAIRequest): Promise<OpenAIRequest> {
        if (!request.messages || request.messages.length === 0) {
            return request;
        }
        
        const optimizedMessages = request.messages.map(message => {
            if (message.role === 'user' || message.role === 'system') {
                // Optimize user and system messages
                let content = message.content;
                
                // Remove redundant whitespace
                content = content.replace(/\s+/g, ' ').trim();
                
                // GPT-specific optimizations
                content = this.optimizeForGPT(content);
                
                // Smart code compression
                content = this.compressCodeInContent(content);
                
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
     * 🔧 OPTIMIZE FUNCTION CALLS - GPT function calling optimization
     */
    private async optimizeFunctionCalls(request: OpenAIRequest): Promise<OpenAIRequest> {
        if (!request.tools || request.tools.length === 0) {
            return request;
        }
        
        // Optimize function descriptions
        const optimizedTools = request.tools.map(tool => {
            if (tool.function && tool.function.description) {
                // Compress verbose function descriptions
                tool.function.description = tool.function.description
                    .replace(/This function (is used to|will|can)/gi, 'This')
                    .replace(/\b(please note that|it should be noted that)\b/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
            
            // Optimize parameter descriptions
            if (tool.function && tool.function.parameters && tool.function.parameters.properties) {
                const properties = tool.function.parameters.properties;
                for (const [key, value] of Object.entries(properties)) {
                    if ((value as any).description) {
                        (value as any).description = (value as any).description
                            .replace(/The\s+/gi, '')
                            .replace(/A\s+/gi, '')
                            .replace(/An\s+/gi, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                    }
                }
            }
            
            return tool;
        });
        
        return {
            ...request,
            tools: optimizedTools
        };
    }

    /**
     * 📚 OPTIMIZE CONVERSATION HISTORY - Smart history truncation
     */
    private async optimizeConversationHistory(request: OpenAIRequest): Promise<OpenAIRequest> {
        if (!request.messages || request.messages.length <= 5) {
            return request;
        }
        
        // Keep system message and recent messages, summarize middle
        const systemMessage = request.messages.find(m => m.role === 'system');
        const recentMessages = request.messages.slice(-4); // Keep last 4 messages
        const middleMessages = request.messages.slice(
            systemMessage ? 1 : 0, 
            request.messages.length - 4
        );
        
        let optimizedMessages: typeof request.messages = [];
        
        // Add system message if exists
        if (systemMessage) {
            optimizedMessages.push(systemMessage);
        }
        
        // Summarize middle messages if there are many
        if (middleMessages.length > 6) {
            const summary = this.summarizeMessages(middleMessages);
            optimizedMessages.push({
                role: 'user',
                content: `[Previous conversation summary: ${summary}]`
            });
        } else {
            optimizedMessages.push(...middleMessages);
        }
        
        // Add recent messages
        optimizedMessages.push(...recentMessages);
        
        return {
            ...request,
            messages: optimizedMessages
        };
    }

    /**
     * 🗜️ OPTIMIZE CODE CONTEXT - GPT code optimization
     */
    private async optimizeCodeContext(request: OpenAIRequest): Promise<OpenAIRequest> {
        const optimizedMessages = request.messages.map(message => {
            if ((message.role === 'user' || message.role === 'system') && this.containsCode(message.content)) {
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
    private extractInputText(request: OpenAIRequest): string {
        return request.messages.map(m => m.content).join('\n');
    }

    private estimateTokens(text: string): number {
        // GPT tokenization is roughly 1 token per 4 characters
        return Math.ceil(text.length / 4);
    }

    private optimizeForGPT(content: string): string {
        // GPT-specific optimizations
        
        // Remove verbose GPT-style prompting
        content = content.replace(/As an AI language model,?\s*/gi, '');
        content = content.replace(/I understand that you want me to\s*/gi, '');
        content = content.replace(/I'll help you (with|to)\s*/gi, '');
        
        // Compress common phrases
        content = content.replace(/Please provide/gi, 'Provide');
        content = content.replace(/Could you please/gi, 'Please');
        content = content.replace(/I would like you to/gi, '');
        content = content.replace(/Can you help me (with|to)/gi, 'Help');
        
        // Remove filler words
        content = content.replace(/\b(basically|actually|literally|obviously)\b/gi, '');
        
        return content;
    }

    private compressCodeInContent(content: string): string {
        // Remove excessive blank lines in code
        content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        // Compress verbose comments
        content = content.replace(/\/\*\s*[\s\S]{100,}?\s*\*\//g, '/* ... */');
        content = content.replace(/\/\/\s.{50,}/g, '// ...');
        
        return content;
    }

    private summarizeMessages(messages: OpenAIRequest['messages']): string {
        const topics = new Set<string>();
        
        for (const message of messages) {
            const content = message.content.toLowerCase();
            
            // Extract key topics
            if (content.includes('function')) topics.add('functions');
            if (content.includes('class')) topics.add('classes');
            if (content.includes('error') || content.includes('bug')) topics.add('debugging');
            if (content.includes('test')) topics.add('testing');
            if (content.includes('api')) topics.add('API');
            if (content.includes('database')) topics.add('database');
            if (content.includes('frontend') || content.includes('ui')) topics.add('frontend');
            if (content.includes('backend') || content.includes('server')) topics.add('backend');
        }
        
        const topicList = Array.from(topics).slice(0, 5).join(', ');
        return `Discussed ${messages.length} messages about: ${topicList || 'general development'}`;
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
        
        // Compress imports/exports
        compressedCode = compressedCode.replace(
            /^(import|export).*$/gm,
            (match) => match.length > 80 ? match.substring(0, 77) + '...' : match
        );
        
        // Compress long functions
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
    public parseResponse(response: any): OpenAIResponse | null {
        try {
            if (response && response.choices && response.usage) {
                return response as OpenAIResponse;
            }
            return null;
        } catch (error) {
            console.error('❌ Error parsing OpenAI response:', error);
            return null;
        }
    }

    /**
     * 📊 EXTRACT USAGE FROM RESPONSE
     */
    public extractUsage(response: OpenAIResponse) {
        return {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens
        };
    }

    /**
     * 💰 CALCULATE ACTUAL COST from response
     */
    public calculateActualCost(response: OpenAIResponse): number {
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
            provider: 'OpenAI',
            family: model.includes('gpt-4o') ? 'GPT-4o' : 
                   model.includes('gpt-4') ? 'GPT-4' :
                   model.includes('gpt-3.5') ? 'GPT-3.5' : 'GPT'
        };
    }
}