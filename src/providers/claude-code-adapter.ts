/**
 * 🚀 Claude Code Provider Adapter
 * 
 * Specialized adapter for the new Claude Code CLI integration in Cline.
 * Ready for PR #4111 merge!
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TokenUsage } from '../shared/types';

export interface ClaudeCodeSession {
    id: string;
    timestamp: number;
    model: string;
    messages: any[];
    tokenUsage?: {
        input: number;
        output: number;
        total: number;
    };
}

export class ClaudeCodeAdapter {
    private static instance: ClaudeCodeAdapter;
    private sessionPath: string | null = null;
    private fileWatcher: vscode.FileSystemWatcher | null = null;
    
    private constructor() {
        this.initializeSessionPath();
    }
    
    public static getInstance(): ClaudeCodeAdapter {
        if (!ClaudeCodeAdapter.instance) {
            ClaudeCodeAdapter.instance = new ClaudeCodeAdapter();
        }
        return ClaudeCodeAdapter.instance;
    }
    
    /**
     * Initialize Claude Code session storage path
     */
    private async initializeSessionPath(): Promise<void> {
        try {
            const os = require('os');
            
            // Possible Claude Code session locations
            const possiblePaths = [
                path.join(os.homedir(), '.claude-code', 'sessions'),
                path.join(os.homedir(), '.claude-code', 'logs'),
                path.join(os.homedir(), '.config', 'claude-code', 'sessions'),
                path.join(os.homedir(), 'AppData', 'Local', 'claude-code', 'sessions')
            ];
            
            // Check VS Code config for custom path
            const config = vscode.workspace.getConfiguration('cline');
            const customPath = config.get<string>('claudeCodeSessionPath');
            if (customPath) {
                possiblePaths.unshift(customPath);
            }
            
            // Find existing session path
            for (const sessionPath of possiblePaths) {
                if (fs.existsSync(sessionPath)) {
                    this.sessionPath = sessionPath;
                    console.log('🚀 ClaudeCodeAdapter: Found session path at:', sessionPath);
                    break;
                }
            }
            
            // Create default path if none exists
            if (!this.sessionPath) {
                const defaultPath = path.join(os.homedir(), '.claude-code', 'sessions');
                fs.mkdirSync(defaultPath, { recursive: true });
                this.sessionPath = defaultPath;
                console.log('🚀 ClaudeCodeAdapter: Created session path at:', defaultPath);
            }
            
        } catch (error) {
            console.error('🚀 ClaudeCodeAdapter: Failed to initialize session path:', error);
        }
    }
    
    /**
     * Start watching for Claude Code session changes
     */
    public startWatching(onTokenUpdate: (usage: TokenUsage) => void): void {
        if (!this.sessionPath) {
            console.warn('🚀 ClaudeCodeAdapter: No session path available for watching');
            return;
        }
        
        try {
            // Watch for session file changes
            const pattern = new vscode.RelativePattern(this.sessionPath, '**/*.json');
            this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
            
            console.log('🚀 ClaudeCodeAdapter: Starting file watcher for Claude Code sessions');
            
            // Debounced update handler
            let debounceTimer: NodeJS.Timeout | null = null;
            const debouncedUpdate = () => {
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debounceTimer = setTimeout(async () => {
                    const usage = await this.getLatestTokenUsage();
                    if (usage) {
                        onTokenUpdate(usage);
                    }
                }, 2000); // 2 second debounce
            };
            
            // Watch for changes
            this.fileWatcher.onDidChange(debouncedUpdate);
            this.fileWatcher.onDidCreate(debouncedUpdate);
            
            // Initial scan
            this.scanExistingSessions(onTokenUpdate);
            
        } catch (error) {
            console.error('🚀 ClaudeCodeAdapter: Failed to start watching:', error);
        }
    }
    
    /**
     * Scan existing Claude Code sessions
     */
    private async scanExistingSessions(onTokenUpdate: (usage: TokenUsage) => void): Promise<void> {
        if (!this.sessionPath) return;
        
        try {
            const files = fs.readdirSync(this.sessionPath)
                .filter(file => file.endsWith('.json'))
                .sort()
                .reverse(); // Most recent first
            
            console.log(`🚀 ClaudeCodeAdapter: Found ${files.length} session files`);
            
            let totalUsage = {
                totalTokens: 0,
                promptTokens: 0,
                completionTokens: 0,
                timestamp: Date.now(),
                model: 'claude-code',
                requests: 0
            };
            
            // Process recent sessions
            for (const file of files.slice(0, 10)) { // Last 10 sessions
                const sessionPath = path.join(this.sessionPath, file);
                const session = await this.parseSessionFile(sessionPath);
                
                if (session && session.tokenUsage) {
                    totalUsage.totalTokens += session.tokenUsage.total;
                    totalUsage.promptTokens += session.tokenUsage.input;
                    totalUsage.completionTokens += session.tokenUsage.output;
                    totalUsage.requests += 1;
                }
            }
            
            if (totalUsage.requests > 0) {
                // Convert to proper TokenUsage format
                const tokenUsage: TokenUsage = {
                    totalTokens: totalUsage.totalTokens,
                    promptTokens: totalUsage.promptTokens,
                    completionTokens: totalUsage.completionTokens,
                    timestamp: totalUsage.timestamp,
                    model: totalUsage.model
                };
                onTokenUpdate(tokenUsage);
            }
            
        } catch (error) {
            console.error('🚀 ClaudeCodeAdapter: Failed to scan sessions:', error);
        }
    }
    
    /**
     * Parse a Claude Code session file
     */
    private async parseSessionFile(filePath: string): Promise<ClaudeCodeSession | null> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            // Handle different possible formats
            if (data.session) {
                return this.parseSessionFormat(data.session);
            } else if (data.messages && Array.isArray(data.messages)) {
                return this.parseMessagesFormat(data);
            } else if (data.conversation) {
                return this.parseConversationFormat(data.conversation);
            }
            
            console.warn('🚀 ClaudeCodeAdapter: Unknown session format:', filePath);
            return null;
            
        } catch (error) {
            console.error('🚀 ClaudeCodeAdapter: Failed to parse session file:', filePath, error);
            return null;
        }
    }
    
    /**
     * Parse different session formats
     */
    private parseSessionFormat(session: any): ClaudeCodeSession {
        return {
            id: session.id || 'unknown',
            timestamp: session.timestamp || Date.now(),
            model: session.model || 'claude-code',
            messages: session.messages || [],
            tokenUsage: session.usage || session.tokenUsage || this.estimateTokenUsage(session)
        };
    }
    
    private parseMessagesFormat(data: any): ClaudeCodeSession {
        const messages = data.messages || [];
        const tokenUsage = this.calculateTokenUsageFromMessages(messages);
        
        return {
            id: data.id || 'unknown',
            timestamp: data.timestamp || Date.now(),
            model: data.model || 'claude-code',
            messages: messages,
            tokenUsage: tokenUsage
        };
    }
    
    private parseConversationFormat(conversation: any): ClaudeCodeSession {
        return {
            id: conversation.id || 'unknown',
            timestamp: conversation.startTime || Date.now(),
            model: conversation.model || 'claude-code',
            messages: conversation.messages || [],
            tokenUsage: conversation.tokenUsage || this.estimateTokenUsage(conversation)
        };
    }
    
    /**
     * Calculate token usage from messages
     */
    private calculateTokenUsageFromMessages(messages: any[]): { input: number; output: number; total: number } {
        let inputTokens = 0;
        let outputTokens = 0;
        
        for (const message of messages) {
            const content = message.content || message.text || '';
            const tokens = this.estimateTokenCount(content);
            
            if (message.role === 'user' || message.type === 'human') {
                inputTokens += tokens;
            } else if (message.role === 'assistant' || message.type === 'assistant') {
                outputTokens += tokens;
            }
        }
        
        return {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens
        };
    }
    
    /**
     * Estimate token count (rough approximation)
     */
    private estimateTokenCount(text: string): number {
        // Claude's tokenization is roughly 1 token per 4 characters
        // Account for system prompts and context overhead
        const baseTokens = Math.ceil(text.length / 4);
        const overhead = Math.min(2000, Math.max(500, baseTokens * 0.2)); // 20% overhead
        return baseTokens + overhead;
    }
    
    /**
     * Estimate token usage from session data
     */
    private estimateTokenUsage(data: any): { input: number; output: number; total: number } {
        // Fallback estimation logic
        const messages = data.messages || [];
        return this.calculateTokenUsageFromMessages(messages);
    }
    
    /**
     * Get latest token usage
     */
    public async getLatestTokenUsage(): Promise<TokenUsage | null> {
        if (!this.sessionPath) return null;
        
        try {
            const files = fs.readdirSync(this.sessionPath)
                .filter(file => file.endsWith('.json'))
                .sort()
                .reverse();
            
            if (files.length === 0) return null;
            
            // Get most recent session
            const latestSession = await this.parseSessionFile(
                path.join(this.sessionPath, files[0])
            );
            
            if (latestSession && latestSession.tokenUsage) {
                return {
                    totalTokens: latestSession.tokenUsage.total,
                    promptTokens: latestSession.tokenUsage.input,
                    completionTokens: latestSession.tokenUsage.output,
                    timestamp: Date.now(),
                    model: 'claude-code'
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('🚀 ClaudeCodeAdapter: Failed to get latest usage:', error);
            return null;
        }
    }
    
    /**
     * Stop watching for changes
     */
    public stopWatching(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }
    }
    
    /**
     * Check if Claude Code is available
     */
    public async isAvailable(): Promise<boolean> {
        try {
            const { exec } = require('child_process');
            return new Promise((resolve) => {
                exec('claude-code --version', (error: any) => {
                    resolve(!error);
                });
            });
        } catch {
            return false;
        }
    }
}