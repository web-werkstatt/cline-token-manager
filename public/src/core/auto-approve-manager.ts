import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SmartFileCondenser } from './context/smart-file-condenser';
import { TokenManager } from './context/context-management/token-manager';
import { LoggingService } from './logging-service';
import { PythonGatewayBridge } from './context/python-gateway-bridge';

interface AutoApproveSettings {
    enabled: boolean;
    tokenThreshold: number;
    fileCountThreshold: number;
    reductionThreshold: number; // Minimum reduction percentage to apply optimization
    preserveFileTypes: string[];
    aggressiveMode: boolean;
}

interface OptimizationJob {
    taskId: string;
    originalContext: string;
    optimizedContext: string;
    tokensSaved: number;
    reductionPercentage: number;
    timestamp: number;
}

export class AutoApproveManager {
    private static instance: AutoApproveManager;
    private smartFileCondenser: SmartFileCondenser;
    private tokenManager: TokenManager;
    private logger: LoggingService;
    private pythonGateway: PythonGatewayBridge;
    private settings: AutoApproveSettings;
    private optimizationHistory: OptimizationJob[] = [];
    private isWatching: boolean = false;
    private lastProcessedTaskId: string | null = null;
    private static dashboardProvider: any = null; // Reference to OptimizationDashboardProvider

    private constructor() {
        this.smartFileCondenser = SmartFileCondenser.getInstance();
        this.tokenManager = TokenManager.getInstance();
        this.logger = LoggingService.getInstance();
        this.pythonGateway = PythonGatewayBridge.getInstance();
        this.settings = this.loadSettings();
    }

    public static getInstance(): AutoApproveManager {
        if (!AutoApproveManager.instance) {
            AutoApproveManager.instance = new AutoApproveManager();
        }
        return AutoApproveManager.instance;
    }

    public static setDashboardProvider(dashboardProvider: any): void {
        AutoApproveManager.dashboardProvider = dashboardProvider;
    }

    private updateDashboard(): void {
        if (AutoApproveManager.dashboardProvider && AutoApproveManager.dashboardProvider.updateDashboard) {
            try {
                AutoApproveManager.dashboardProvider.updateDashboard();
                this.logger.logDevelopment('AutoApproveManager', 'Dashboard updated after Auto-Approve activity', {
                    timestamp: Date.now()
                });
            } catch (error) {
                this.logger.logDevelopment('AutoApproveManager', 'Failed to update dashboard', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    }

    public startAutoApprove(): void {
        if (this.isWatching) {
            this.logger.log('INFO', 'AutoApprove', 'Already watching - startAutoApprove called again');
            return;
        }

        this.logger.logAutoApprove('SUCCESS', 'Auto-Approve monitoring started', {
            trigger: 'Manual start or extension activation'
        });
        this.isWatching = true;

        // Watch for new Cline conversations
        this.watchClineConversations();
        
        // Update settings when configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('clineTokenManager')) {
                this.settings = this.loadSettings();
                console.log('🔧 AutoApproveManager: Settings updated');
            }
        });
    }

    public stopAutoApprove(): void {
        console.log('🔧 AutoApproveManager: Stopping Auto-Approve monitoring');
        this.isWatching = false;
    }

    private loadSettings(): AutoApproveSettings {
        const config = vscode.workspace.getConfiguration('clineTokenManager');
        
        return {
            enabled: config.get('autoOptimize', true),
            tokenThreshold: config.get('optimizeThreshold', 10000),
            fileCountThreshold: config.get('autoApprove.fileCountThreshold', 15),
            reductionThreshold: config.get('autoApprove.reductionThreshold', 20),
            preserveFileTypes: config.get('autoApprove.preserveFileTypes', ['package.json', '*.config.*', '.env']),
            aggressiveMode: config.get('autoApprove.aggressiveMode', false)
        };
    }

    private async watchClineConversations(): Promise<void> {
        try {
            const clineStoragePath = this.getClineStoragePath();
            if (!clineStoragePath) {
                console.log('⚠️ AutoApproveManager: Cline storage path not found');
                return;
            }

            const tasksPath = path.join(clineStoragePath, 'tasks');
            if (!fs.existsSync(tasksPath)) {
                console.log('⚠️ AutoApproveManager: Cline tasks directory not found');
                return;
            }

            // Watch for changes in the tasks directory
            const watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(tasksPath, '**/api_conversation_history.json')
            );

            // Debounce function to prevent excessive processing
            let processingTimeout: NodeJS.Timeout | null = null;
            const debouncedProcess = (uri: vscode.Uri) => {
                if (processingTimeout) clearTimeout(processingTimeout);
                processingTimeout = setTimeout(() => {
                    this.processConversationChange(uri);
                }, 2000); // 2 second delay
            };

            watcher.onDidChange(debouncedProcess);
            watcher.onDidCreate(debouncedProcess);

            console.log('✅ AutoApproveManager: Watching Cline conversations for Auto-Approve opportunities');

        } catch (error) {
            this.logger.logAutoApprove('ERROR', 'Error setting up conversation watching', {
                error: error instanceof Error ? error.message : String(error)
            });
            console.error('🔧 AutoApproveManager: Error setting up conversation watching:', error);
        }
    }

    private async processConversationChange(uri: vscode.Uri): Promise<void> {
        if (!this.settings.enabled || !this.isWatching) {
            this.logger.logDevelopment('AutoApproveManager', 'Conversation change detected but Auto-Approve disabled', {
                enabled: this.settings.enabled,
                watching: this.isWatching,
                filePath: uri.fsPath
            });
            return;
        }

        try {
            const taskDir = path.dirname(uri.fsPath);
            const taskId = path.basename(taskDir);

            this.logger.logFileWatcher('CHANGE', uri.fsPath, {
                taskDir,
                taskId,
                lastProcessedTaskId: this.lastProcessedTaskId
            });

            // Skip if we already processed this task recently
            if (this.lastProcessedTaskId === taskId) {
                this.logger.log('INFO', 'AutoApprove', `Skipping task ${taskId} - already processed recently`);
                return;
            }

            this.logger.logAutoApprove('INFO', 'Processing conversation change', { taskId });

            const conversationPath = uri.fsPath;
            if (!fs.existsSync(conversationPath)) {
                this.logger.logDevelopment('AutoApproveManager', 'Conversation file does not exist', {
                    conversationPath,
                    exists: fs.existsSync(conversationPath)
                });
                return;
            }

            const conversationData = JSON.parse(fs.readFileSync(conversationPath, 'utf8'));
            
            this.logger.logDevelopment('AutoApproveManager', 'Loaded conversation data', {
                taskId,
                conversationLength: conversationData.length,
                messageTypes: conversationData.map((msg: any) => ({ role: msg.role, contentLength: msg.content?.length || 0 })),
                filePath: conversationPath
            });
            
            // 🚀 NEW: Also analyze Cline's internal cache/context
            const clineContext = await this.analyzeClineContext(taskId, conversationPath);
            
            // Analyze the conversation to see if Auto-Approve should trigger
            const shouldOptimize = await this.shouldTriggerOptimization(conversationData, taskId, clineContext);
            
            // Log the complete analysis for debugging including cache
            this.logger.logConversationProcessing(taskId, conversationData, shouldOptimize.estimatedTokens, shouldOptimize);
            
            // 🚀 NEW: Log Cline's cache/context analysis
            this.logger.logDevelopment('ClineContextAnalyzer', 'Cline Internal Context Analysis', {
                taskId,
                cacheAnalysis: clineContext,
                conversationTokens: shouldOptimize.estimatedTokens,
                cacheTokens: clineContext?.estimatedCacheTokens || 0,
                totalEstimatedTokens: shouldOptimize.estimatedTokens + (clineContext?.estimatedCacheTokens || 0)
            });
            
            if (shouldOptimize.trigger) {
                this.logger.logAutoApprove('SUCCESS', `Triggering Auto-Approve: ${shouldOptimize.reason}`, {
                    taskId,
                    originalTokens: shouldOptimize.estimatedTokens,
                    trigger: shouldOptimize.reason
                });
                await this.performAutoOptimization(conversationData, taskId, conversationPath);
                this.lastProcessedTaskId = taskId;
            } else {
                this.logger.logAutoApprove('INFO', `No optimization needed: ${shouldOptimize.reason}`, {
                    taskId,
                    originalTokens: shouldOptimize.estimatedTokens
                });
            }

        } catch (error) {
            this.logger.logAutoApprove('ERROR', 'Error processing conversation change', {
                taskId: 'unknown',
                error: error instanceof Error ? error.message : String(error)
            });
            this.logger.logDevelopment('AutoApproveManager', 'Exception in processConversationChange', {
                error: error instanceof Error ? error.stack : String(error),
                filePath: uri.fsPath
            });
            console.error('🔧 AutoApproveManager: Error processing conversation change:', error);
        }
    }

    private async analyzeClineContext(taskId: string, conversationPath: string): Promise<{
        estimatedCacheTokens: number;
        fileContents: { [key: string]: number };
        contextFiles: string[];
        cacheSize: number;
        memoryUsage: number;
    } | null> {
        try {
            const taskDir = path.dirname(conversationPath);
            
            // Look for Cline's additional context files
            const contextFiles = [
                path.join(taskDir, 'context.json'),
                path.join(taskDir, 'file_cache.json'), 
                path.join(taskDir, 'workspace_state.json'),
                path.join(taskDir, 'memory.json')
            ];
            
            let totalCacheTokens = 0;
            const fileContents: { [key: string]: number } = {};
            const foundFiles: string[] = [];
            let totalCacheSize = 0;
            
            for (const contextFile of contextFiles) {
                if (fs.existsSync(contextFile)) {
                    try {
                        const content = fs.readFileSync(contextFile, 'utf8');
                        const contentTokens = Math.ceil(content.length / 4);
                        
                        fileContents[path.basename(contextFile)] = contentTokens;
                        totalCacheTokens += contentTokens;
                        totalCacheSize += content.length;
                        foundFiles.push(contextFile);
                        
                        this.logger.logDevelopment('ClineContextAnalyzer', `Found context file: ${path.basename(contextFile)}`, {
                            file: contextFile,
                            sizeBytes: content.length,
                            estimatedTokens: contentTokens,
                            preview: content.substring(0, 200) + '...'
                        });
                        
                    } catch (error) {
                        this.logger.logDevelopment('ClineContextAnalyzer', `Error reading context file: ${contextFile}`, {
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                }
            }
            
            // Also check for file references in the task directory that might be cached
            try {
                const taskFiles = fs.readdirSync(taskDir);
                for (const file of taskFiles) {
                    if (file.endsWith('.txt') || file.endsWith('.md') || file.includes('cache')) {
                        const filePath = path.join(taskDir, file);
                        const stat = fs.statSync(filePath);
                        if (stat.size > 1000) { // Only larger files
                            const content = fs.readFileSync(filePath, 'utf8');
                            const tokens = Math.ceil(content.length / 4);
                            
                            fileContents[file] = tokens;
                            totalCacheTokens += tokens;
                            totalCacheSize += content.length;
                            foundFiles.push(filePath);
                        }
                    }
                }
            } catch (error) {
                // Silent fail
            }
            
            return {
                estimatedCacheTokens: totalCacheTokens,
                fileContents,
                contextFiles: foundFiles,
                cacheSize: totalCacheSize,
                memoryUsage: process.memoryUsage().heapUsed
            };
            
        } catch (error) {
            this.logger.logDevelopment('ClineContextAnalyzer', 'Error analyzing Cline context', {
                taskId,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    private async shouldTriggerOptimization(conversationData: any[], taskId: string, clineContext?: any): Promise<{
        trigger: boolean;
        reason: string;
        estimatedTokens: number;
    }> {
        try {
            this.logger.logDevelopment('AutoApproveManager', 'Starting trigger optimization analysis', {
                taskId,
                conversationLength: conversationData.length,
                settings: this.settings
            });

            // Estimate total context size
            let totalContext = '';
            let fileCount = 0;
            const messageAnalysis: any[] = [];

            for (const message of conversationData) {
                if (message.role === 'user' && message.content) {
                    const content = Array.isArray(message.content) 
                        ? message.content.map((c: any) => c.text || '').join(' ')
                        : message.content;
                    
                    totalContext += content + '\n';
                    
                    // Count files mentioned in the content
                    const fileMatches = content.match(/(?:File:|```[a-zA-Z]*\n[\s\S]*?```)/g) || [];
                    fileCount += fileMatches.length;

                    messageAnalysis.push({
                        role: message.role,
                        contentLength: content.length,
                        filesFound: fileMatches.length,
                        contentPreview: content.substring(0, 100) + '...'
                    });
                }
            }

            // 🚨 HOTFIX: Improved token calculation for large conversations
            // Real ratio from 197KB = 114k tokens is ~1.72x not 4x
            const conversationTokens = Math.ceil(totalContext.length / 1.72);
            const cacheTokens = clineContext?.estimatedCacheTokens || 0;
            const estimatedTokens = conversationTokens + cacheTokens;
            
            // 🚨 CRITICAL: Log real file size vs our calculation 
            this.logger.logDevelopment('TokenCalculationFix', 'Improved token calculation', {
                totalContextLength: totalContext.length,
                oldCalculation: Math.ceil(totalContext.length / 4),
                newCalculation: conversationTokens,
                improvement: `${((conversationTokens / Math.ceil(totalContext.length / 4)) * 100).toFixed(1)}% more accurate`,
                realFileRatio: '197KB = 114k tokens = 1.72x ratio'
            });

            this.logger.logTokenEstimation(totalContext, {
                totalContextLength: totalContext.length,
                conversationTokens,
                cacheTokens,
                estimatedTokens,
                fileCount,
                messageAnalysis,
                clineContext,
                thresholds: {
                    tokenThreshold: this.settings.tokenThreshold,
                    fileCountThreshold: this.settings.fileCountThreshold,
                    aggressiveMode: this.settings.aggressiveMode
                }
            });

            // Decision logic with detailed logging
            if (estimatedTokens > this.settings.tokenThreshold) {
                const decision = {
                    trigger: true,
                    reason: `Token count (${estimatedTokens.toLocaleString()}) exceeds threshold (${this.settings.tokenThreshold.toLocaleString()})`,
                    estimatedTokens
                };
                
                this.logger.logDevelopment('AutoApproveManager', 'TRIGGER: Token threshold exceeded', {
                    estimatedTokens,
                    threshold: this.settings.tokenThreshold,
                    exceeded: estimatedTokens - this.settings.tokenThreshold,
                    decision
                });
                
                return decision;
            }

            if (fileCount > this.settings.fileCountThreshold) {
                const decision = {
                    trigger: true,
                    reason: `File count (${fileCount}) exceeds threshold (${this.settings.fileCountThreshold})`,
                    estimatedTokens
                };
                
                this.logger.logDevelopment('AutoApproveManager', 'TRIGGER: File count threshold exceeded', {
                    fileCount,
                    threshold: this.settings.fileCountThreshold,
                    exceeded: fileCount - this.settings.fileCountThreshold,
                    decision
                });
                
                return decision;
            }

            // In aggressive mode, optimize even smaller contexts
            if (this.settings.aggressiveMode && estimatedTokens > 5000) {
                const decision = {
                    trigger: true,
                    reason: `Aggressive mode: Token count (${estimatedTokens.toLocaleString()}) > 5k`,
                    estimatedTokens
                };
                
                this.logger.logDevelopment('AutoApproveManager', 'TRIGGER: Aggressive mode threshold exceeded', {
                    estimatedTokens,
                    aggressiveThreshold: 5000,
                    aggressiveMode: this.settings.aggressiveMode,
                    decision
                });
                
                return decision;
            }

            const decision = {
                trigger: false,
                reason: `No optimization needed (${estimatedTokens.toLocaleString()} tokens, ${fileCount} files)`,
                estimatedTokens
            };

            this.logger.logDevelopment('AutoApproveManager', 'NO TRIGGER: All thresholds satisfied', {
                estimatedTokens,
                tokenThreshold: this.settings.tokenThreshold,
                fileCount,
                fileCountThreshold: this.settings.fileCountThreshold,
                aggressiveMode: this.settings.aggressiveMode,
                decision
            });

            return decision;

        } catch (error) {
            this.logger.logAutoApprove('ERROR', 'Error in optimization trigger analysis', {
                error: error instanceof Error ? error.message : String(error)
            });
            this.logger.logDevelopment('AutoApproveManager', 'Exception in shouldTriggerOptimization', {
                error: error instanceof Error ? error.stack : String(error),
                taskId
            });
            console.error('🔧 AutoApproveManager: Error in shouldTriggerOptimization:', error);
            return { trigger: false, reason: 'Error in analysis', estimatedTokens: 0 };
        }
    }

    private async performAutoOptimization(conversationData: any[], taskId: string, conversationPath: string): Promise<void> {
        try {
            console.log(`🔧 AutoApproveManager: Starting auto-optimization for task ${taskId}`);

            // Extract the latest user message that likely contains file context
            const userMessages = conversationData.filter(msg => msg.role === 'user');
            const latestUserMessage = userMessages[userMessages.length - 1];

            if (!latestUserMessage || !latestUserMessage.content) {
                console.log('🔧 AutoApproveManager: No user message found to optimize');
                return;
            }

            // Extract content
            const content = Array.isArray(latestUserMessage.content)
                ? latestUserMessage.content.map((c: any) => c.text || '').join('\n')
                : latestUserMessage.content;

            const originalTokens = Math.ceil(content.length / 4);

            // 🚀 TRY PYTHON OPTIMIZATION FIRST (if available)
            let optimizationResult: any = null;
            let usedPython = false;

            this.logger.logDevelopment('AutoApproveManager', 'Starting optimization process', {
                taskId,
                originalTokens,
                contentLength: content.length,
                pythonAvailable: await this.pythonGateway.isAvailable()
            });

            if (originalTokens > 15000) { // Use Python for larger contexts
                try {
                    this.logger.logDevelopment('AutoApproveManager', 'Attempting Python optimization for large context', {
                        taskId,
                        originalTokens,
                        reason: 'Large context detected (>15k tokens)'
                    });

                    const pythonResult = await this.pythonGateway.optimizeWithPython(
                        conversationData,
                        Math.floor(originalTokens * 0.7), // Target 30% reduction
                        'hybrid',
                        true
                    );

                    if (pythonResult.success && pythonResult.reduction_percentage >= this.settings.reductionThreshold) {
                        // Convert Python result to our format
                        optimizationResult = {
                            optimized: true,
                            optimizedContent: pythonResult.optimized_messages.map(msg => msg.content).join('\n'),
                            originalTokens: pythonResult.original_tokens,
                            optimizedTokens: pythonResult.optimized_tokens,
                            reductionPercentage: pythonResult.reduction_percentage,
                            filesOptimized: pythonResult.optimized_messages.length,
                            qualityScore: pythonResult.quality_score,
                            processingTime: pythonResult.processing_time
                        };
                        usedPython = true;

                        this.logger.logDevelopment('AutoApproveManager', 'Python optimization successful!', {
                            taskId,
                            originalTokens: pythonResult.original_tokens,
                            optimizedTokens: pythonResult.optimized_tokens,
                            reductionPercentage: pythonResult.reduction_percentage,
                            qualityScore: pythonResult.quality_score,
                            processingTime: pythonResult.processing_time
                        });
                    } else {
                        this.logger.logDevelopment('AutoApproveManager', 'Python optimization insufficient, falling back to TypeScript', {
                            taskId,
                            pythonResult,
                            reason: pythonResult.error || 'Insufficient reduction percentage'
                        });
                    }
                } catch (error) {
                    this.logger.logDevelopment('AutoApproveManager', 'Python optimization failed, falling back to TypeScript', {
                        taskId,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }

            // Fallback to TypeScript optimization
            if (!optimizationResult) {
                this.logger.logDevelopment('AutoApproveManager', 'Using TypeScript optimization', {
                    taskId,
                    reason: usedPython ? 'Python failed/insufficient' : 'Context size < 15k tokens'
                });

                optimizationResult = await this.smartFileCondenser.optimizeContext(content);
            }

            if (optimizationResult && optimizationResult.optimized && optimizationResult.reductionPercentage >= this.settings.reductionThreshold) {
                // Apply the optimization
                await this.applyOptimizationToConversation(
                    conversationPath, 
                    latestUserMessage, 
                    optimizationResult.optimizedContent!
                );

                // Record the optimization
                this.optimizationHistory.push({
                    taskId,
                    originalContext: content,
                    optimizedContext: optimizationResult.optimizedContent!,
                    tokensSaved: optimizationResult.originalTokens - optimizationResult.optimizedTokens,
                    reductionPercentage: optimizationResult.reductionPercentage,
                    timestamp: Date.now()
                });

                // Log success
                this.logger.logAutoApprove('SUCCESS', 'Auto-optimization completed successfully', {
                    taskId,
                    originalTokens: originalTokens,
                    optimizedTokens: optimizationResult.optimizedTokens,
                    reductionPercentage: optimizationResult.reductionPercentage,
                    filesOptimized: optimizationResult.filesOptimized,
                    trigger: `Auto-Approve ${usedPython ? '(Python)' : '(TypeScript)'}`
                });

                // 🚀 NEW: Update Dashboard with recent activity
                this.updateDashboard();

                // Show success notification
                const optimizationMethod = usedPython ? 'Python Gateway' : 'TypeScript';
                vscode.window.showInformationMessage(
                    `🎉 Auto-Approve (${optimizationMethod}): Optimized conversation (${optimizationResult.reductionPercentage}% reduction, ${optimizationResult.filesOptimized} files)`,
                    { modal: false }
                );

            } else {
                console.log(`🔧 AutoApproveManager: Optimization not beneficial for task ${taskId} (${optimizationResult?.reductionPercentage || 0}% reduction)`);
            }

        } catch (error) {
            this.logger.logAutoApprove('ERROR', 'Auto-optimization failed', {
                taskId,
                error: error instanceof Error ? error.message : String(error)
            });
            console.error('🔧 AutoApproveManager: Error performing auto-optimization:', error);
            vscode.window.showErrorMessage(`❌ Auto-Approve failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async applyOptimizationToConversation(conversationPath: string, userMessage: any, optimizedContent: string): Promise<void> {
        try {
            // Create backup first
            const backupPath = conversationPath + `.backup.${Date.now()}`;
            fs.copyFileSync(conversationPath, backupPath);
            console.log(`🔧 AutoApproveManager: Created backup at ${backupPath}`);

            // Read current conversation
            const conversationData = JSON.parse(fs.readFileSync(conversationPath, 'utf8'));

            // Find and update the user message
            for (let i = conversationData.length - 1; i >= 0; i--) {
                if (conversationData[i].role === 'user' && conversationData[i] === userMessage) {
                    if (Array.isArray(conversationData[i].content)) {
                        // Update content array
                        conversationData[i].content = conversationData[i].content.map((c: any) => {
                            if (c.type === 'text') {
                                return { ...c, text: optimizedContent };
                            }
                            return c;
                        });
                    } else {
                        // Update string content
                        conversationData[i].content = optimizedContent;
                    }
                    break;
                }
            }

            // Write back optimized conversation
            fs.writeFileSync(conversationPath, JSON.stringify(conversationData, null, 2));
            console.log(`✅ AutoApproveManager: Applied optimization to ${conversationPath}`);

        } catch (error) {
            this.logger.logAutoApprove('ERROR', 'Error applying optimization to conversation', {
                error: error instanceof Error ? error.message : String(error),
                conversationPath
            });
            console.error('🔧 AutoApproveManager: Error applying optimization to conversation:', error);
            throw error;
        }
    }

    private getClineStoragePath(): string | null {
        try {
            const os = require('os');
            const homeDir = os.homedir();
            
            // Try different possible paths for Cline storage including Cursor
            const possiblePaths = [
                path.join(homeDir, '.vscode', 'extensions'),
                path.join(homeDir, '.vscode-insiders', 'extensions'),
                path.join(homeDir, '.cursor', 'extensions'),
                path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage'),
                path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage'),
                path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage'),
                path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage'),
                path.join(homeDir, '.config', 'Code', 'User', 'globalStorage'),
                path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage')
            ];

            // Add Windows WSL paths
            if (process.platform === 'linux' && process.env.WSL_DISTRO_NAME) {
                possiblePaths.push(
                    '/mnt/c/Users/*/AppData/Roaming/Code/User/globalStorage',
                    '/mnt/c/Users/*/AppData/Roaming/Cursor/User/globalStorage',
                    '/mnt/c/Users/*/.vscode/extensions',
                    '/mnt/c/Users/*/.cursor/extensions'
                );
            }

            for (const basePath of possiblePaths) {
                // Handle wildcard paths for Windows WSL
                if (basePath.includes('*')) {
                    try {
                        const glob = require('glob');
                        const matches = glob.sync(basePath);
                        for (const matchPath of matches) {
                            const result = this.searchForClineInPath(matchPath);
                            if (result) {
                                this.logger.logDevelopment('ClineStorageLocator', 'Found Cline via wildcard', {
                                    pattern: basePath,
                                    matchPath,
                                    result
                                });
                                return result;
                            }
                        }
                    } catch (error) {
                        // Continue search
                    }
                } else {
                    const result = this.searchForClineInPath(basePath);
                    if (result) return result;
                }
            }

            return null;
        } catch (error) {
            this.logger.logAutoApprove('ERROR', 'Error finding Cline storage path', {
                error: error instanceof Error ? error.message : String(error)
            });
            console.error('🔧 AutoApproveManager: Error finding Cline storage path:', error);
            return null;
        }
    }

    private searchForClineInPath(basePath: string): string | null {
        try {
            if (!fs.existsSync(basePath)) return null;
            
            const clinePatterns = [
                /saoudrizwan\.claude-dev/,
                /cline/i,
                /claude-dev/i
            ];
            
            const files = fs.readdirSync(basePath);
            
            for (const file of files) {
                for (const pattern of clinePatterns) {
                    if (pattern.test(file)) {
                        // Try different storage structure possibilities
                        const possibleStoragePaths = [
                            path.join(basePath, file), // Direct extension folder
                            path.join(basePath, file, 'globalStorage', file), // VS Code structure
                            path.join(basePath, file, 'storage'), // Alternative structure
                        ];
                        
                        for (const storagePath of possibleStoragePaths) {
                            // Check for Cline storage indicators
                            const indicators = [
                                path.join(storagePath, 'tasks'),
                                path.join(storagePath, 'storage.json'),
                                path.join(storagePath, 'globalState.json')
                            ];
                            
                            for (const indicator of indicators) {
                                if (fs.existsSync(indicator)) {
                                    this.logger.logDevelopment('ClineStorageLocator', 'Found Cline storage', {
                                        basePath,
                                        file,
                                        storagePath,
                                        indicator
                                    });
                                    return storagePath;
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.logDevelopment('ClineStorageLocator', 'Error searching path', {
                basePath,
                error: error instanceof Error ? error.message : String(error)
            });
        }
        return null;
    }

    public getOptimizationStats(): {
        totalOptimizations: number;
        totalTokensSaved: number;
        averageReduction: number;
        lastOptimization: Date | null;
    } {
        const history = this.optimizationHistory;
        
        if (history.length === 0) {
            return {
                totalOptimizations: 0,
                totalTokensSaved: 0,
                averageReduction: 0,
                lastOptimization: null
            };
        }

        const totalTokensSaved = history.reduce((sum, opt) => sum + opt.tokensSaved, 0);
        const averageReduction = history.reduce((sum, opt) => sum + opt.reductionPercentage, 0) / history.length;
        const lastOptimization = new Date(Math.max(...history.map(opt => opt.timestamp)));

        return {
            totalOptimizations: history.length,
            totalTokensSaved,
            averageReduction: Math.round(averageReduction),
            lastOptimization
        };
    }

    public isAutoApproveEnabled(): boolean {
        return this.settings.enabled && this.isWatching;
    }
}