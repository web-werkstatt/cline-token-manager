import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

/**
 * 🚀 TypeScript ↔ Python Gateway Bridge
 * 
 * Integriert den Python Universal Context Optimizer in die VS Code Extension
 * Ermöglicht hybride Optimierung: TypeScript für UI/Integration + Python für ML/Advanced
 * 
 * Features:
 * - Automatische Python Environment Detection
 * - Async Python Process Communication 
 * - Fallback auf TypeScript wenn Python nicht verfügbar
 * - Performance Monitoring und Vergleich
 * - Error Handling und Recovery
 */

interface PythonOptimizationRequest {
    messages: Array<{
        role: string;
        content: string;
        timestamp?: string;
        message_type?: string;
    }>;
    max_tokens: number;
    strategy: 'statistical' | 'hybrid' | 'neural';
    preserve_quality: boolean;
}

interface PythonOptimizationResult {
    success: boolean;
    original_tokens: number;
    optimized_tokens: number;
    reduction_percentage: number;
    quality_score: number;
    processing_time: number;
    strategy_used: string;
    optimized_messages: Array<{
        role: string;
        content: string;
        timestamp?: string;
        relevance_score?: number;
        message_type?: string;
    }>;
    error?: string;
}

interface PythonEnvironmentInfo {
    available: boolean;
    python_path: string;
    version: string;
    gateway_path: string;
    error?: string;
}

export class PythonGatewayBridge {
    private static instance: PythonGatewayBridge;
    private pythonEnv: PythonEnvironmentInfo | null = null;
    private isInitialized = false;
    
    private constructor() {}
    
    public static getInstance(): PythonGatewayBridge {
        if (!PythonGatewayBridge.instance) {
            PythonGatewayBridge.instance = new PythonGatewayBridge();
        }
        return PythonGatewayBridge.instance;
    }
    
    /**
     * Initialisierung der Python Gateway Bridge
     */
    public async initialize(): Promise<boolean> {
        if (this.isInitialized) {
            return this.pythonEnv?.available || false;
        }
        
        console.log('🔍 PythonGatewayBridge: Initializing Python environment...');
        
        try {
            this.pythonEnv = await this.detectPythonEnvironment();
            this.isInitialized = true;
            
            if (this.pythonEnv.available) {
                console.log(`✅ Python Gateway ready: ${this.pythonEnv.python_path} (${this.pythonEnv.version})`);
                return true;
            } else {
                console.log(`⚠️ Python Gateway not available: ${this.pythonEnv.error}`);
                return false;
            }
        } catch (error) {
            console.error('❌ PythonGatewayBridge initialization failed:', error);
            this.pythonEnv = { available: false, python_path: '', version: '', gateway_path: '', error: String(error) };
            this.isInitialized = true;
            return false;
        }
    }
    
    /**
     * Python Environment Detection
     */
    private async detectPythonEnvironment(): Promise<PythonEnvironmentInfo> {
        const extensionPath = vscode.extensions.getExtension('webwerkstatt.cline-token-manager-beta')?.extensionPath;
        if (!extensionPath) {
            throw new Error('Extension path not found');
        }
        
        const gatewayPath = path.join(extensionPath, 'python-gateway');
        const optimizerScript = path.join(gatewayPath, 'optimization_engine.py');
        
        // Check if Python gateway files exist
        try {
            const fs = require('fs');
            if (!fs.existsSync(optimizerScript)) {
                return {
                    available: false,
                    python_path: '',
                    version: '',
                    gateway_path: gatewayPath,
                    error: 'Python gateway files not found'
                };
            }
        } catch (error) {
            return {
                available: false,
                python_path: '',
                version: '',
                gateway_path: gatewayPath,
                error: 'File system access error'
            };
        }
        
        // Try different Python executables
        const pythonCommands = ['python3', 'python', 'py'];
        
        for (const pythonCmd of pythonCommands) {
            try {
                const version = await this.checkPythonVersion(pythonCmd);
                if (version) {
                    // Test if Python gateway can be imported
                    const canImport = await this.testPythonEnvironment(pythonCmd, gatewayPath);
                    if (canImport) {
                        return {
                            available: true,
                            python_path: pythonCmd,
                            version: version,
                            gateway_path: gatewayPath
                        };
                    }
                }
            } catch (error) {
                // Continue to next Python command
                continue;
            }
        }
        
        return {
            available: false,
            python_path: '',
            version: '',
            gateway_path: gatewayPath,
            error: 'No compatible Python installation found'
        };
    }
    
    /**
     * Check Python version
     */
    private async checkPythonVersion(pythonCmd: string): Promise<string | null> {
        return new Promise((resolve) => {
            const process = spawn(pythonCmd, ['--version'], { 
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true 
            });
            
            let output = '';
            
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                output += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0 && output.includes('Python')) {
                    resolve(output.trim());
                } else {
                    resolve(null);
                }
            });
            
            process.on('error', () => {
                resolve(null);
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                process.kill();
                resolve(null);
            }, 5000);
        });
    }
    
    /**
     * Test if Python gateway can be imported and used
     */
    private async testPythonEnvironment(pythonCmd: string, gatewayPath: string): Promise<boolean> {
        return new Promise((resolve) => {
            const testScript = `
import sys
sys.path.insert(0, "${gatewayPath.replace(/\\/g, '/')}")
try:
    from optimization_engine import UniversalOptimizationEngine
    engine = UniversalOptimizationEngine()
    print("GATEWAY_TEST_SUCCESS")
except Exception as e:
    print(f"GATEWAY_TEST_ERROR: {e}")
`;
            
            const process = spawn(pythonCmd, ['-c', testScript], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                cwd: gatewayPath
            });
            
            let output = '';
            
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                output += data.toString();
            });
            
            process.on('close', (code) => {
                resolve(output.includes('GATEWAY_TEST_SUCCESS'));
            });
            
            process.on('error', () => {
                resolve(false);
            });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                process.kill();
                resolve(false);
            }, 10000);
        });
    }
    
    /**
     * Main optimization method - calls Python engine
     */
    public async optimizeWithPython(
        messages: any[],
        maxTokens: number = 20000,
        strategy: 'statistical' | 'hybrid' | 'neural' = 'hybrid',
        preserveQuality: boolean = true
    ): Promise<PythonOptimizationResult> {
        
        // Ensure initialization
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        if (!this.pythonEnv?.available) {
            return {
                success: false,
                original_tokens: 0,
                optimized_tokens: 0,
                reduction_percentage: 0,
                quality_score: 0,
                processing_time: 0,
                strategy_used: 'none',
                optimized_messages: [],
                error: `Python gateway not available: ${this.pythonEnv?.error || 'Unknown error'}`
            };
        }
        
        const request: PythonOptimizationRequest = {
            messages: messages.map(msg => ({
                role: msg.role || 'user',
                content: msg.content || '',
                timestamp: msg.timestamp?.toISOString?.() || new Date().toISOString(),
                message_type: msg.message_type || 'response'
            })),
            max_tokens: maxTokens,
            strategy: strategy,
            preserve_quality: preserveQuality
        };
        
        console.log(`🚀 PythonGatewayBridge: Starting optimization with ${messages.length} messages`);
        const startTime = Date.now();
        
        try {
            const result = await this.callPythonOptimizer(request);
            const totalTime = Date.now() - startTime;
            
            console.log(`✅ Python optimization completed in ${totalTime}ms`);
            console.log(`📊 Result: ${result.original_tokens} → ${result.optimized_tokens} tokens (${result.reduction_percentage.toFixed(1)}% reduction)`);
            
            return result;
            
        } catch (error) {
            const totalTime = Date.now() - startTime;
            console.error(`❌ Python optimization failed after ${totalTime}ms:`, error);
            
            return {
                success: false,
                original_tokens: 0,
                optimized_tokens: 0,
                reduction_percentage: 0,
                quality_score: 0,
                processing_time: totalTime,
                strategy_used: strategy,
                optimized_messages: [],
                error: String(error)
            };
        }
    }
    
    /**
     * Call Python optimization engine
     */
    private async callPythonOptimizer(request: PythonOptimizationRequest): Promise<PythonOptimizationResult> {
        return new Promise((resolve, reject) => {
            if (!this.pythonEnv?.available) {
                reject(new Error('Python environment not available'));
                return;
            }
            
            // Create Python script to run optimization
            const optimizationScript = `
import json
import sys
import asyncio
sys.path.insert(0, "${this.pythonEnv.gateway_path.replace(/\\/g, '/')}")

async def run_optimization():
    try:
        from optimization_engine import UniversalOptimizationEngine, ConversationMessage, ConversationContext
        from datetime import datetime
        
        # Parse input
        request_data = json.loads('''${JSON.stringify(request).replace(/'/g, "\\'")}''')
        
        # Create conversation context
        messages = []
        for msg_data in request_data['messages']:
            timestamp = None
            if 'timestamp' in msg_data and msg_data['timestamp']:
                try:
                    timestamp = datetime.fromisoformat(msg_data['timestamp'].replace('Z', '+00:00'))
                except:
                    timestamp = datetime.now()
            
            message = ConversationMessage(
                role=msg_data['role'],
                content=msg_data['content'],
                timestamp=timestamp,
                message_type=msg_data.get('message_type', 'response')
            )
            messages.append(message)
        
        context = ConversationContext(
            messages=messages,
            total_tokens=sum(len(msg.content) // 4 for msg in messages),
            source_tool="typescript_bridge",
            session_id="bridge_session"
        )
        
        # Run optimization
        engine = UniversalOptimizationEngine()
        result = await engine.optimize_context(
            context=context,
            max_tokens=request_data['max_tokens'],
            strategy=request_data['strategy'],
            preserve_quality=request_data['preserve_quality']
        )
        
        # Format result
        output = {
            "success": True,
            "original_tokens": result.original_tokens,
            "optimized_tokens": result.optimized_tokens,
            "reduction_percentage": result.reduction_percentage,
            "quality_score": result.quality_score,
            "processing_time": result.processing_time * 1000,  # Convert to ms
            "strategy_used": result.strategy_used,
            "optimized_messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                    "relevance_score": msg.relevance_score,
                    "message_type": msg.message_type
                }
                for msg in result.optimized_messages
            ]
        }
        
        print("OPTIMIZATION_RESULT_START")
        print(json.dumps(output))
        print("OPTIMIZATION_RESULT_END")
        
    except Exception as e:
        error_output = {
            "success": False,
            "error": str(e),
            "original_tokens": 0,
            "optimized_tokens": 0,
            "reduction_percentage": 0,
            "quality_score": 0,
            "processing_time": 0,
            "strategy_used": "error",
            "optimized_messages": []
        }
        print("OPTIMIZATION_RESULT_START")
        print(json.dumps(error_output))
        print("OPTIMIZATION_RESULT_END")

# Run the optimization
asyncio.run(run_optimization())
`;
            
            const process = spawn(this.pythonEnv.python_path, ['-c', optimizationScript], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                cwd: this.pythonEnv.gateway_path
            });
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            process.on('close', (code) => {
                try {
                    // Extract result from stdout
                    const startMarker = 'OPTIMIZATION_RESULT_START';
                    const endMarker = 'OPTIMIZATION_RESULT_END';
                    
                    const startIndex = stdout.indexOf(startMarker);
                    const endIndex = stdout.indexOf(endMarker);
                    
                    if (startIndex === -1 || endIndex === -1) {
                        throw new Error(`Invalid Python output format. Code: ${code}, stderr: ${stderr}`);
                    }
                    
                    const resultJson = stdout.substring(startIndex + startMarker.length, endIndex).trim();
                    const result = JSON.parse(resultJson);
                    
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'Python optimization failed'));
                    }
                    
                } catch (error) {
                    reject(new Error(`Failed to parse Python result: ${error}. stdout: ${stdout}, stderr: ${stderr}`));
                }
            });
            
            process.on('error', (error) => {
                reject(new Error(`Python process error: ${error}`));
            });
            
            // Timeout after 30 seconds
            setTimeout(() => {
                process.kill();
                reject(new Error('Python optimization timed out after 30 seconds'));
            }, 30000);
        });
    }
    
    /**
     * Check if Python gateway is available
     */
    public async isAvailable(): Promise<boolean> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.pythonEnv?.available || false;
    }
    
    /**
     * Get Python environment info
     */
    public getPythonInfo(): PythonEnvironmentInfo | null {
        return this.pythonEnv;
    }
    
    /**
     * Test Python gateway with sample data
     */
    public async testPythonGateway(): Promise<{ success: boolean; result?: any; error?: string }> {
        try {
            const testMessages = [
                {
                    role: 'user',
                    content: 'This is a test message for the Python gateway.',
                    timestamp: new Date(),
                    message_type: 'question'
                },
                {
                    role: 'assistant', 
                    content: 'This is a test response from the assistant. It contains some example content that should be optimized by the Python engine.',
                    timestamp: new Date(),
                    message_type: 'response'
                }
            ];
            
            const result = await this.optimizeWithPython(testMessages, 1000, 'statistical', true);
            
            if (result.success) {
                return { success: true, result };
            } else {
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
}