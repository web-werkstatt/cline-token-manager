import { UniversalAIProxy, AIRequest, AIResponse } from '../universal-ai-proxy';

export interface LocalModelRequest {
    model: string;
    prompt?: string;
    messages?: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
    options?: {
        num_predict?: number;
        temperature?: number;
        top_k?: number;
        top_p?: number;
    };
}

export interface LocalModelResponse {
    response?: string;
    choices?: Array<{
        message: {
            role: string;
            content: string;
        };
    }>;
    model: string;
    created_at?: string;
    done?: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export interface LocalProvider {
    name: string;
    baseUrl: string;
    apiEndpoint: string;
    defaultModel: string;
    costPer1kTokens: number;
    requestFormat: 'ollama' | 'openai-compatible' | 'custom';
    isOnline: boolean;
}

/**
 * 🏠 LOCAL MODELS ADAPTER - Self-Hosted AI Optimization
 * 
 * Specialized adapter for local/self-hosted AI models:
 * - OPTIMIZES Ollama requests (local LLMs)
 * - SUPPORTS LM Studio, LocalAI, custom endpoints
 * - ZERO COST tracking (local models are free!)
 * - SMART context management for resource-limited environments
 * - AUTOMATIC DISCOVERY of local AI services
 * 
 * Supported providers: Ollama, LM Studio, LocalAI, Text Generation WebUI, etc.
 * MESSAGE: "Free yourself from AI API costs - run everything locally!"
 */
export class LocalModelsAdapter {
    private discoveredProviders: Map<string, LocalProvider> = new Map();
    private readonly defaultProviders: LocalProvider[] = [
        {
            name: 'Ollama',
            baseUrl: 'http://localhost:11434',
            apiEndpoint: '/api/generate',
            defaultModel: 'llama2',
            costPer1kTokens: 0.0,
            requestFormat: 'ollama',
            isOnline: false
        },
        {
            name: 'LM Studio',
            baseUrl: 'http://localhost:1234',
            apiEndpoint: '/v1/chat/completions',
            defaultModel: 'local-model',
            costPer1kTokens: 0.0,
            requestFormat: 'openai-compatible',
            isOnline: false
        },
        {
            name: 'LocalAI',
            baseUrl: 'http://localhost:8080',
            apiEndpoint: '/v1/chat/completions',
            defaultModel: 'gpt-3.5-turbo',
            costPer1kTokens: 0.0,
            requestFormat: 'openai-compatible',
            isOnline: false
        },
        {
            name: 'Text Generation WebUI',
            baseUrl: 'http://localhost:5000',
            apiEndpoint: '/api/v1/generate',
            defaultModel: 'local-model',
            costPer1kTokens: 0.0,
            requestFormat: 'custom',
            isOnline: false
        },
        {
            name: 'Oobabooga',
            baseUrl: 'http://localhost:5000',
            apiEndpoint: '/api/v1/chat/completions',
            defaultModel: 'local-model',
            costPer1kTokens: 0.0,
            requestFormat: 'openai-compatible',
            isOnline: false
        }
    ];

    constructor() {
        console.log('🏠 Local Models Adapter initialized - Self-hosted AI optimization ready!');
        this.discoverLocalProviders();
    }

    /**
     * 🔍 DISCOVER LOCAL AI PROVIDERS
     */
    private async discoverLocalProviders(): Promise<void> {
        console.log('🔍 Discovering local AI providers...');
        
        for (const provider of this.defaultProviders) {
            try {
                const isOnline = await this.checkProviderHealth(provider);
                if (isOnline) {
                    provider.isOnline = true;
                    this.discoveredProviders.set(provider.name.toLowerCase(), provider);
                    console.log(`✅ Found ${provider.name} at ${provider.baseUrl}`);
                    
                    // Try to get available models
                    const models = await this.getAvailableModels(provider);
                    if (models.length > 0) {
                        console.log(`🧠 ${provider.name} models: ${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''}`);
                    }
                } else {
                    console.log(`❌ ${provider.name} not found at ${provider.baseUrl}`);
                }
            } catch (error) {
                console.log(`⚠️ Error checking ${provider.name}:`, error);
            }
        }
        
        if (this.discoveredProviders.size > 0) {
            console.log(`🎉 Discovered ${this.discoveredProviders.size} local AI providers!`);
        } else {
            console.log('ℹ️ No local AI providers found. Install Ollama or LM Studio for local AI!');
        }
    }

    /**
     * 🏥 CHECK PROVIDER HEALTH
     */
    private async checkProviderHealth(provider: LocalProvider): Promise<boolean> {
        try {
            const response = await fetch(`${provider.baseUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000) // 2 second timeout
            });
            return response.ok;
        } catch (error) {
            // Try alternative health endpoints
            try {
                const response = await fetch(`${provider.baseUrl}/api/tags`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(2000)
                });
                return response.ok;
            } catch (error2) {
                // Try basic connection
                try {
                    const response = await fetch(provider.baseUrl, {
                        method: 'GET',
                        signal: AbortSignal.timeout(2000)
                    });
                    return response.status < 500; // Any non-server-error response means it's online
                } catch (error3) {
                    return false;
                }
            }
        }
    }

    /**
     * 🧠 GET AVAILABLE MODELS
     */
    private async getAvailableModels(provider: LocalProvider): Promise<string[]> {
        try {
            let modelsEndpoint = '';
            
            switch (provider.requestFormat) {
                case 'ollama':
                    modelsEndpoint = '/api/tags';
                    break;
                case 'openai-compatible':
                    modelsEndpoint = '/v1/models';
                    break;
                default:
                    return [provider.defaultModel];
            }
            
            const response = await fetch(`${provider.baseUrl}${modelsEndpoint}`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) return [provider.defaultModel];
            
            const data = await response.json();
            
            if (provider.requestFormat === 'ollama' && (data as any).models) {
                return (data as any).models.map((m: any) => m.name || m.model);
            } else if (provider.requestFormat === 'openai-compatible' && (data as any).data) {
                return (data as any).data.map((m: any) => m.id);
            }
            
            return [provider.defaultModel];
            
        } catch (error) {
            console.log(`⚠️ Could not get models for ${provider.name}:`, error);
            return [provider.defaultModel];
        }
    }

    /**
     * 📡 PROCESS LOCAL MODEL REQUEST
     */
    public async processRequest(request: AIRequest): Promise<AIResponse> {
        try {
            console.log('🏠 Processing local model request...');
            console.log(`📝 Target URL: ${request.originalUrl}`);
            
            // Determine which local provider this request is for
            const provider = this.identifyProvider(request.originalUrl);
            if (!provider) {
                return {
                    success: false,
                    error: 'Local provider not recognized or not online'
                };
            }
            
            console.log(`🎯 Provider: ${provider.name}`);
            
            // Parse local model request
            const localRequest = this.parseLocalRequest(request, provider);
            
            // Optimize the request (local models often have limited resources)
            const optimized = await this.optimizeLocalRequest(localRequest, provider);
            
            console.log('✅ Local model request processed successfully');
            return {
                success: true,
                data: optimized.request,
                cost: 0.0, // Local models are free!
                optimization: optimized.optimization
            };
            
        } catch (error) {
            console.error('❌ Local models adapter error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * 🎯 IDENTIFY PROVIDER from URL
     */
    private identifyProvider(url: string): LocalProvider | null {
        for (const provider of this.discoveredProviders.values()) {
            if (url.includes(provider.baseUrl) || url.includes(new URL(provider.baseUrl).port)) {
                return provider;
            }
        }
        
        // Try to match by port
        const urlObj = new URL(url);
        const port = urlObj.port;
        
        for (const provider of this.discoveredProviders.values()) {
            const providerPort = new URL(provider.baseUrl).port;
            if (port === providerPort) {
                return provider;
            }
        }
        
        return null;
    }

    /**
     * 📝 PARSE LOCAL REQUEST
     */
    private parseLocalRequest(request: AIRequest, provider: LocalProvider): LocalModelRequest {
        try {
            let body = request.body;
            if (typeof body === 'string') {
                body = JSON.parse(body);
            }
            
            // Convert to local model format based on provider type
            switch (provider.requestFormat) {
                case 'ollama':
                    return this.convertToOllamaFormat(body, provider);
                case 'openai-compatible':
                    return this.convertToOpenAIFormat(body, provider);
                default:
                    return body as LocalModelRequest;
            }
            
        } catch (error) {
            console.error('❌ Error parsing local request:', error);
            // Fallback request
            return {
                model: provider.defaultModel,
                prompt: request.context,
                max_tokens: request.maxTokens || 2048
            };
        }
    }

    /**
     * 🦙 CONVERT TO OLLAMA FORMAT
     */
    private convertToOllamaFormat(body: any, provider: LocalProvider): LocalModelRequest {
        if (body.messages) {
            // Convert chat format to Ollama prompt
            const prompt = body.messages
                .map((m: any) => `${m.role}: ${m.content}`)
                .join('\n') + '\nassistant:';
            
            return {
                model: body.model || provider.defaultModel,
                prompt: prompt,
                stream: body.stream || false,
                options: {
                    num_predict: body.max_tokens || 2048,
                    temperature: body.temperature || 0.7,
                    top_k: 40,
                    top_p: 0.9
                }
            };
        } else {
            return {
                model: body.model || provider.defaultModel,
                prompt: body.prompt || body.input || '',
                stream: body.stream || false,
                options: {
                    num_predict: body.max_tokens || 2048,
                    temperature: body.temperature || 0.7
                }
            };
        }
    }

    /**
     * 🔄 CONVERT TO OPENAI FORMAT
     */
    private convertToOpenAIFormat(body: any, provider: LocalProvider): LocalModelRequest {
        return {
            model: body.model || provider.defaultModel,
            messages: body.messages || [
                {
                    role: 'user',
                    content: body.prompt || body.input || ''
                }
            ],
            max_tokens: body.max_tokens || 2048,
            temperature: body.temperature || 0.7,
            stream: body.stream || false
        };
    }

    /**
     * 🧠 OPTIMIZE LOCAL REQUEST
     */
    private async optimizeLocalRequest(request: LocalModelRequest, provider: LocalProvider): Promise<{
        request: LocalModelRequest;
        optimization?: {
            originalTokens: number;
            optimizedTokens: number;
            tokensSaved: number;
            costSaved: number;
            reductionPercentage: number;
        };
    }> {
        console.log(`🧠 Applying ${provider.name}-specific optimization...`);
        
        const originalRequest = JSON.parse(JSON.stringify(request));
        const originalText = this.extractText(request);
        const originalTokens = this.estimateTokens(originalText);
        
        // Apply local-model specific optimizations
        let optimizedRequest = await this.optimizeForLocalResources(request, provider);
        optimizedRequest = await this.optimizeForModelType(optimizedRequest, provider);
        
        const optimizedText = this.extractText(optimizedRequest);
        const optimizedTokens = this.estimateTokens(optimizedText);
        
        const tokensSaved = originalTokens - optimizedTokens;
        const reductionPercentage = originalTokens > 0 ? (tokensSaved / originalTokens) * 100 : 0;
        
        // Local models are free, but we can still show "computational savings"
        const costSaved = 0.0;
        
        console.log(`📉 Optimization results: ${originalTokens} → ${optimizedTokens} tokens (-${reductionPercentage.toFixed(1)}%)`);
        console.log(`🏠 Local model optimization complete - saved computational resources!`);
        
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
     * 💻 OPTIMIZE FOR LOCAL RESOURCES
     */
    private async optimizeForLocalResources(request: LocalModelRequest, provider: LocalProvider): Promise<LocalModelRequest> {
        // Local models often have limited VRAM/RAM, so we optimize more aggressively
        
        let text = this.extractText(request);
        
        // 1. More aggressive context truncation for local models
        if (text.length > 8000) { // Smaller context window for local models
            text = this.truncateForLocalModel(text);
        }
        
        // 2. Remove unnecessary verbose content
        text = this.removeVerbosity(text);
        
        // 3. Optimize token limits for local models
        if (request.max_tokens && request.max_tokens > 2048) {
            request.max_tokens = 2048; // Most local models work better with smaller outputs
        }
        
        // 4. Adjust temperature for better local model performance
        if (request.temperature && request.temperature > 0.8) {
            request.temperature = 0.7; // Local models often benefit from slightly lower temperature
        }
        
        // Update request with optimized text
        return this.updateRequestText(request, text);
    }

    /**
     * 🧠 OPTIMIZE FOR MODEL TYPE
     */
    private async optimizeForModelType(request: LocalModelRequest, provider: LocalProvider): Promise<LocalModelRequest> {
        const modelName = request.model.toLowerCase();
        
        // Optimize based on model family
        if (modelName.includes('llama')) {
            return this.optimizeForLlama(request);
        } else if (modelName.includes('mistral')) {
            return this.optimizeForMistral(request);
        } else if (modelName.includes('codellama') || modelName.includes('code')) {
            return this.optimizeForCodeModel(request);
        } else if (modelName.includes('chat') || modelName.includes('instruct')) {
            return this.optimizeForChatModel(request);
        }
        
        return request;
    }

    /**
     * 🦙 OPTIMIZE FOR LLAMA MODELS
     */
    private optimizeForLlama(request: LocalModelRequest): LocalModelRequest {
        // LLaMA models work well with specific prompt formats
        let text = this.extractText(request);
        
        // Add appropriate system prompt if missing
        if (request.messages && !request.messages.find(m => m.role === 'system')) {
            request.messages.unshift({
                role: 'system',
                content: 'You are a helpful assistant.'
            });
        }
        
        // Optimize for LLaMA's context understanding
        text = this.optimizeForInstructionFollowing(text);
        
        return this.updateRequestText(request, text);
    }

    /**
     * 🌪️ OPTIMIZE FOR MISTRAL MODELS
     */
    private optimizeForMistral(request: LocalModelRequest): LocalModelRequest {
        // Mistral models are efficient and handle longer contexts well
        let text = this.extractText(request);
        
        // Mistral works well with clear instructions
        text = this.addClearInstructions(text);
        
        return this.updateRequestText(request, text);
    }

    /**
     * 💻 OPTIMIZE FOR CODE MODELS
     */
    private optimizeForCodeModel(request: LocalModelRequest): LocalModelRequest {
        // Code models need clean, well-formatted code context
        let text = this.extractText(request);
        
        // Remove non-code content for code models
        text = this.cleanForCodeGeneration(text);
        
        // Optimize token limit for code generation
        if (request.max_tokens && request.max_tokens < 1024) {
            request.max_tokens = 1024; // Code models often need more tokens
        }
        
        return this.updateRequestText(request, text);
    }

    /**
     * 💬 OPTIMIZE FOR CHAT MODELS
     */
    private optimizeForChatModel(request: LocalModelRequest): LocalModelRequest {
        // Chat models work best with conversational format
        if (request.prompt && !request.messages) {
            // Convert prompt to messages format
            request.messages = [
                {
                    role: 'user',
                    content: request.prompt
                }
            ];
            delete request.prompt;
        }
        
        return request;
    }

    /**
     * 🔧 HELPER METHODS
     */
    private extractText(request: LocalModelRequest): string {
        if (request.messages) {
            return request.messages.map(m => m.content).join('\n');
        } else if (request.prompt) {
            return request.prompt;
        }
        return '';
    }

    private updateRequestText(request: LocalModelRequest, text: string): LocalModelRequest {
        if (request.messages) {
            // Update last user message
            const lastUserMessage = [...request.messages].reverse().find(m => m.role === 'user');
            if (lastUserMessage) {
                lastUserMessage.content = text;
            }
        } else if (request.prompt) {
            request.prompt = text;
        }
        
        return request;
    }

    private estimateTokens(text: string): number {
        // Local models typically use similar tokenization to GPT
        return Math.ceil(text.length / 4);
    }

    private truncateForLocalModel(text: string): string {
        // More aggressive truncation for local models
        const lines = text.split('\n');
        if (lines.length > 100) {
            return [
                ...lines.slice(0, 30),
                '/* ... (content optimized for local model) ... */',
                ...lines.slice(-30)
            ].join('\n');
        }
        return text;
    }

    private removeVerbosity(text: string): string {
        // Remove verbose explanations
        text = text.replace(/As you can see,?\s*/gi, '');
        text = text.replace(/Please note that\s*/gi, '');
        text = text.replace(/It should be mentioned that\s*/gi, '');
        text = text.replace(/Let me explain\s*/gi, '');
        
        // Remove redundant whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }

    private optimizeForInstructionFollowing(text: string): string {
        // Make instructions clearer for LLaMA
        text = text.replace(/Could you please/gi, 'Please');
        text = text.replace(/I would like you to/gi, '');
        text = text.replace(/Can you help me/gi, 'Help');
        
        return text;
    }

    private addClearInstructions(text: string): string {
        // Mistral models benefit from clear, direct instructions
        if (!text.includes('Task:') && !text.includes('Instruction:')) {
            text = 'Task: ' + text;
        }
        
        return text;
    }

    private cleanForCodeGeneration(text: string): string {
        // Keep only code-relevant content
        const lines = text.split('\n');
        const codeLines = lines.filter(line => {
            return line.includes('function') ||
                   line.includes('class') ||
                   line.includes('import') ||
                   line.includes('export') ||
                   line.includes('{') ||
                   line.includes('}') ||
                   line.includes('//') ||
                   line.includes('/*') ||
                   line.trim().length === 0; // Keep empty lines for structure
        });
        
        return codeLines.join('\n');
    }

    /**
     * 📊 PUBLIC INTERFACE
     */
    public getDiscoveredProviders(): LocalProvider[] {
        return Array.from(this.discoveredProviders.values());
    }

    public async refreshProviders(): Promise<void> {
        this.discoveredProviders.clear();
        await this.discoverLocalProviders();
    }

    public isLocalProvider(url: string): boolean {
        return this.identifyProvider(url) !== null;
    }

    public getProviderStats() {
        return {
            totalProviders: this.discoveredProviders.size,
            onlineProviders: Array.from(this.discoveredProviders.values()).filter(p => p.isOnline).length,
            providers: Array.from(this.discoveredProviders.values()).map(p => ({
                name: p.name,
                url: p.baseUrl,
                online: p.isOnline,
                format: p.requestFormat
            }))
        };
    }
}