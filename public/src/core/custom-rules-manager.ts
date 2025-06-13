import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
// Simple debounce implementation to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    }) as T;
}
import { EventEmitter } from 'events';

/**
 * CustomRulesManager - Automatic Rule Injection for Cline
 * 
 * This revolutionary feature ensures that Cline ALWAYS reads and applies custom rules
 * by injecting them directly into the conversation history.
 * 
 * Key Features:
 * - Automatic rule file detection (.clinerules/, .cline/rules/)
 * - Smart token management for rules
 * - Live reload on rule changes
 * - Priority-based rule ordering
 * - Conversation history injection
 */

interface RuleFile {
    path: string;
    content: string;
    priority: number;
    tokens: number;
    lastModified: Date;
}

interface RuleInjectionConfig {
    enabled: boolean;
    maxRuleTokens: number;
    rulePaths: string[];
    injectionMode: 'prepend' | 'append' | 'smart';
    autoReload: boolean;
    preserveOriginal: boolean;
}

export class CustomRulesManager extends EventEmitter {
    private config: RuleInjectionConfig;
    private rules: Map<string, RuleFile> = new Map();
    private watchers: vscode.FileSystemWatcher[] = [];
    private outputChannel: vscode.OutputChannel;
    private conversationWatcher?: vscode.FileSystemWatcher;
    private injectionHistory: Map<string, string> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        super();
        this.outputChannel = vscode.window.createOutputChannel('Cline Rule Injection');
        
        // Default configuration
        this.config = {
            enabled: true,
            maxRuleTokens: 4000, // Reserve tokens for rules
            rulePaths: [
                '.clinerules',
                '.cline/rules',
                path.join(process.env.HOME || '', '.cline/global-rules')
            ],
            injectionMode: 'smart',
            autoReload: true,
            preserveOriginal: true
        };

        this.loadConfiguration();
        this.initialize();
    }

    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('cline-token-manager.ruleInjection');
        this.config = {
            ...this.config,
            enabled: config.get('enabled', true),
            maxRuleTokens: config.get('maxRuleTokens', 4000),
            rulePaths: config.get('rulePaths', this.config.rulePaths),
            injectionMode: config.get('injectionMode', 'smart'),
            autoReload: config.get('autoReload', true)
        };
    }

    private async initialize(): Promise<void> {
        if (!this.config.enabled) return;

        this.log('Initializing Custom Rules Manager...');
        
        // Load existing rules
        await this.scanForRules();
        
        // Set up file watchers for rule changes
        if (this.config.autoReload) {
            this.setupRuleWatchers();
        }
        
        // Watch for new Cline conversations
        this.setupConversationWatcher();
        
        // Register commands
        this.registerCommands();
        
        this.log('Custom Rules Manager initialized successfully');
    }

    private async scanForRules(): Promise<void> {
        this.rules.clear();
        
        for (const rulePath of this.config.rulePaths) {
            await this.scanRulePath(rulePath);
        }
        
        this.log(`Loaded ${this.rules.size} rule files`);
        this.emit('rulesUpdated', Array.from(this.rules.values()));
    }

    private async scanRulePath(rulePath: string): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        const absolutePath = path.isAbsolute(rulePath) 
            ? rulePath 
            : path.join(workspaceFolder.uri.fsPath, rulePath);

        if (!fs.existsSync(absolutePath)) return;

        try {
            const stat = await fs.promises.stat(absolutePath);
            
            if (stat.isDirectory()) {
                const files = await fs.promises.readdir(absolutePath);
                for (const file of files) {
                    if (file.endsWith('.md') || file.endsWith('.txt') || file.endsWith('.rules')) {
                        await this.loadRuleFile(path.join(absolutePath, file));
                    }
                }
            } else if (stat.isFile()) {
                await this.loadRuleFile(absolutePath);
            }
        } catch (error) {
            this.log(`Error scanning rule path ${rulePath}: ${error}`, 'error');
        }
    }

    private async loadRuleFile(filePath: string): Promise<void> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const stat = await fs.promises.stat(filePath);
            
            // Extract priority from filename or content
            const priority = this.extractPriority(filePath, content);
            
            // Estimate token count (rough approximation)
            const tokens = Math.ceil(content.length / 4);
            
            const ruleFile: RuleFile = {
                path: filePath,
                content: content.trim(),
                priority,
                tokens,
                lastModified: stat.mtime
            };
            
            this.rules.set(filePath, ruleFile);
            this.log(`Loaded rule file: ${path.basename(filePath)} (${tokens} tokens, priority: ${priority})`);
            
        } catch (error) {
            this.log(`Error loading rule file ${filePath}: ${error}`, 'error');
        }
    }

    private extractPriority(filePath: string, content: string): number {
        // Check filename for priority (e.g., "01-high-priority.md")
        const fileMatch = path.basename(filePath).match(/^(\d+)-/);
        if (fileMatch) {
            return parseInt(fileMatch[1]);
        }
        
        // Check content for priority directive
        const contentMatch = content.match(/^priority:\s*(\d+)/mi);
        if (contentMatch) {
            return parseInt(contentMatch[1]);
        }
        
        // Default priority
        return 50;
    }

    private setupRuleWatchers(): void {
        // Clear existing watchers
        this.watchers.forEach(w => w.dispose());
        this.watchers = [];
        
        for (const rulePath of this.config.rulePaths) {
            const pattern = path.isAbsolute(rulePath) 
                ? `${rulePath}/**/*` 
                : `**/${rulePath}/**/*`;
            
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            
            const reloadRules = debounce(() => this.scanForRules(), 1000);
            
            watcher.onDidCreate(reloadRules);
            watcher.onDidChange(reloadRules);
            watcher.onDidDelete(reloadRules);
            
            this.watchers.push(watcher);
        }
    }

    private setupConversationWatcher(): void {
        // Watch for new Cline conversations
        const pattern = '**/.vscode/**/claude-dev/**/tasks/**/api_conversation_history.json';
        
        this.conversationWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        // Inject rules when new conversation starts
        this.conversationWatcher.onDidCreate(async (uri) => {
            this.log(`New conversation detected: ${uri.fsPath}`);
            await this.injectRulesIntoConversation(uri.fsPath);
        });
        
        // Re-inject rules when conversation updates (if needed)
        this.conversationWatcher.onDidChange(debounce(async (uri: vscode.Uri) => {
            if (this.shouldReinjectRules(uri.fsPath)) {
                await this.injectRulesIntoConversation(uri.fsPath);
            }
        }, 2000));
    }

    private shouldReinjectRules(conversationPath: string): boolean {
        // Check if rules are still present in the conversation
        try {
            const content = fs.readFileSync(conversationPath, 'utf8');
            const conversation = JSON.parse(content);
            
            // Check if our injected rules marker is present
            const hasRules = conversation.messages?.some((msg: any) => 
                msg.role === 'system' && msg.content?.includes('[CLINE-TOKEN-MANAGER-RULES]')
            );
            
            return !hasRules;
        } catch {
            return false;
        }
    }

    /**
     * Core feature: Inject rules directly into Cline's conversation history
     */
    private async injectRulesIntoConversation(conversationPath: string): Promise<void> {
        if (!this.config.enabled || this.rules.size === 0) return;
        
        try {
            // Read current conversation
            const content = await fs.promises.readFile(conversationPath, 'utf8');
            const conversation = JSON.parse(content);
            
            // Prepare rules for injection
            const rulesContent = this.prepareRulesForInjection();
            
            if (!rulesContent) {
                this.log('No rules to inject');
                return;
            }
            
            // Create system message with rules
            const ruleMessage = {
                role: 'system',
                content: `[CLINE-TOKEN-MANAGER-RULES]
IMPORTANT: You MUST read and apply ALL of the following custom rules for this project:

${rulesContent}

[END-CLINE-TOKEN-MANAGER-RULES]
These rules take precedence over default behavior. Apply them to all responses in this conversation.`,
                timestamp: new Date().toISOString()
            };
            
            // Inject based on mode
            if (this.config.injectionMode === 'prepend') {
                conversation.messages = [ruleMessage, ...(conversation.messages || [])];
            } else if (this.config.injectionMode === 'append') {
                conversation.messages = [...(conversation.messages || []), ruleMessage];
            } else { // smart mode
                // Remove old rule injection if present
                conversation.messages = conversation.messages?.filter((msg: any) => 
                    !(msg.role === 'system' && msg.content?.includes('[CLINE-TOKEN-MANAGER-RULES]'))
                ) || [];
                
                // Add at the beginning for maximum visibility
                conversation.messages.unshift(ruleMessage);
            }
            
            // Backup original if configured
            if (this.config.preserveOriginal) {
                const backupPath = conversationPath + '.backup';
                await fs.promises.writeFile(backupPath, content);
            }
            
            // Write modified conversation
            await fs.promises.writeFile(
                conversationPath, 
                JSON.stringify(conversation, null, 2)
            );
            
            this.log(`Successfully injected ${this.rules.size} rules into conversation`);
            this.emit('rulesInjected', conversationPath, rulesContent);
            
            // Show notification
            vscode.window.showInformationMessage(
                `Cline Token Manager: Injected ${this.rules.size} custom rules into conversation`
            );
            
        } catch (error) {
            this.log(`Error injecting rules: ${error}`, 'error');
            vscode.window.showErrorMessage(
                `Failed to inject custom rules: ${error}`
            );
        }
    }

    private prepareRulesForInjection(): string | null {
        if (this.rules.size === 0) return null;
        
        // Sort rules by priority
        const sortedRules = Array.from(this.rules.values())
            .sort((a, b) => a.priority - b.priority);
        
        // Build rules content within token limit
        let rulesContent = '';
        let totalTokens = 0;
        
        for (const rule of sortedRules) {
            if (totalTokens + rule.tokens > this.config.maxRuleTokens) {
                this.log(`Skipping rule ${path.basename(rule.path)} - would exceed token limit`);
                continue;
            }
            
            rulesContent += `\n## Rule: ${path.basename(rule.path)} (Priority: ${rule.priority})\n\n${rule.content}\n`;
            totalTokens += rule.tokens;
        }
        
        return rulesContent || null;
    }

    private registerCommands(): void {
        // Command to manually trigger rule injection
        this.context.subscriptions.push(
            vscode.commands.registerCommand('cline-token-manager.injectRules', async () => {
                const conversationFiles = await vscode.workspace.findFiles(
                    '**/.vscode/**/claude-dev/**/tasks/**/api_conversation_history.json',
                    null,
                    10
                );
                
                if (conversationFiles.length === 0) {
                    vscode.window.showWarningMessage('No active Cline conversations found');
                    return;
                }
                
                // Inject into most recent conversation
                const mostRecent = conversationFiles[0];
                await this.injectRulesIntoConversation(mostRecent.fsPath);
            })
        );
        
        // Command to reload rules
        this.context.subscriptions.push(
            vscode.commands.registerCommand('cline-token-manager.reloadRules', async () => {
                await this.scanForRules();
                vscode.window.showInformationMessage(
                    `Reloaded ${this.rules.size} rule files`
                );
            })
        );
        
        // Command to show rule status
        this.context.subscriptions.push(
            vscode.commands.registerCommand('cline-token-manager.showRuleStatus', () => {
                const quickPick = vscode.window.createQuickPick();
                quickPick.title = 'Custom Rules Status';
                quickPick.items = Array.from(this.rules.values()).map(rule => ({
                    label: path.basename(rule.path),
                    description: `Priority: ${rule.priority}, Tokens: ${rule.tokens}`,
                    detail: rule.content.substring(0, 100) + '...'
                }));
                quickPick.show();
            })
        );
    }

    private log(message: string, level: 'info' | 'error' = 'info'): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        this.outputChannel.appendLine(logMessage);
        
        if (level === 'error') {
            console.error(logMessage);
        }
    }

    public async getRuleStatus(): Promise<{
        enabled: boolean;
        ruleCount: number;
        totalTokens: number;
        rules: RuleFile[];
    }> {
        const rules = Array.from(this.rules.values());
        const totalTokens = rules.reduce((sum, rule) => sum + rule.tokens, 0);
        
        return {
            enabled: this.config.enabled,
            ruleCount: this.rules.size,
            totalTokens,
            rules
        };
    }

    public dispose(): void {
        this.watchers.forEach(w => w.dispose());
        this.conversationWatcher?.dispose();
        this.outputChannel.dispose();
    }
}