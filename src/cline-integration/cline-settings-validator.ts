import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../config/config-loader';

interface ClineSettingsStatus {
    configFileExists: boolean;
    configFileValid: boolean;
    settingsApplied: boolean;
    clineExtensionActive: boolean;
    lastValidationTime: number;
    errors: string[];
    recommendations: string[];
}

export class ClineSettingsValidator {
    private static instance: ClineSettingsValidator;
    private configLoader: ConfigLoader;
    private validationInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.configLoader = ConfigLoader.getInstance();
    }

    public static getInstance(): ClineSettingsValidator {
        if (!ClineSettingsValidator.instance) {
            ClineSettingsValidator.instance = new ClineSettingsValidator();
        }
        return ClineSettingsValidator.instance;
    }

    public async validateClineIntegration(): Promise<ClineSettingsStatus> {
        const status: ClineSettingsStatus = {
            configFileExists: false,
            configFileValid: false,
            settingsApplied: false,
            clineExtensionActive: false,
            lastValidationTime: Date.now(),
            errors: [],
            recommendations: []
        };

        try {
            // 1. Check if Cline extension is installed and active
            status.clineExtensionActive = await this.checkClineExtensionStatus();

            // 2. Check if .clineconfig.js exists and is valid
            const configValidation = await this.validateConfigFile();
            status.configFileExists = configValidation.exists;
            status.configFileValid = configValidation.valid;
            status.errors.push(...configValidation.errors);

            // 3. Check if our settings are being applied by Cline
            const settingsValidation = await this.validateSettingsApplication();
            status.settingsApplied = settingsValidation.applied;
            status.errors.push(...settingsValidation.errors);
            status.recommendations.push(...settingsValidation.recommendations);

            // 4. Generate recommendations
            this.generateRecommendations(status);

            console.log('🔧 ClineSettingsValidator: Validation completed:', status);
            return status;

        } catch (error) {
            status.errors.push(`Validation failed: ${error}`);
            console.error('🔧 ClineSettingsValidator: Validation error:', error);
            return status;
        }
    }

    private async checkClineExtensionStatus(): Promise<boolean> {
        try {
            // Check if Cline extension is installed
            const extension = vscode.extensions.getExtension('saoudrizwan.claude-dev');
            
            if (!extension) {
                console.log('🔧 ClineSettingsValidator: Cline extension not found');
                return false;
            }

            // Check if extension is active
            if (!extension.isActive) {
                console.log('🔧 ClineSettingsValidator: Cline extension not active, trying to activate...');
                try {
                    await extension.activate();
                    console.log('🔧 ClineSettingsValidator: Cline extension activated successfully');
                } catch (activationError) {
                    console.error('🔧 ClineSettingsValidator: Failed to activate Cline:', activationError);
                    return false;
                }
            }

            console.log('🔧 ClineSettingsValidator: Cline extension is active');
            return true;
        } catch (error) {
            console.error('🔧 ClineSettingsValidator: Error checking Cline status:', error);
            return false;
        }
    }

    private async validateConfigFile(): Promise<{ exists: boolean; valid: boolean; errors: string[] }> {
        const result = { exists: false, valid: false, errors: [] as string[] };

        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                result.errors.push('No workspace folder found');
                return result;
            }

            const configPath = path.join(workspaceRoot, '.clineconfig.js');
            
            // Check if file exists
            if (fs.existsSync(configPath)) {
                result.exists = true;
                console.log('🔧 ClineSettingsValidator: .clineconfig.js found at:', configPath);

                // Try to load and validate the config
                try {
                    const config = await this.configLoader.loadConfig();
                    if (config) {
                        result.valid = true;
                        console.log('🔧 ClineSettingsValidator: Config loaded successfully:', config);
                    } else {
                        result.errors.push('Config file exists but could not be loaded');
                    }
                } catch (loadError) {
                    result.errors.push(`Config file invalid: ${loadError}`);
                }
            } else {
                result.errors.push('No .clineconfig.js file found in workspace root');
                console.log('🔧 ClineSettingsValidator: .clineconfig.js not found at:', configPath);
            }

            return result;
        } catch (error) {
            result.errors.push(`Error validating config file: ${error}`);
            return result;
        }
    }

    private async validateSettingsApplication(): Promise<{ applied: boolean; errors: string[]; recommendations: string[] }> {
        const result = { applied: false, errors: [] as string[], recommendations: [] as string[] };

        try {
            // Get our config
            const ourConfig = this.configLoader.getConfig();
            
            // Check if Cline is reading our config by looking at its storage
            const clineStorageValidation = await this.checkClineStorageForOurSettings(ourConfig);
            
            if (clineStorageValidation.found) {
                result.applied = true;
                console.log('🔧 ClineSettingsValidator: Our settings found in Cline storage');
            } else {
                result.errors.push('Settings not found in Cline storage');
                result.recommendations.push('Try restarting VS Code to reload Cline configuration');
                result.recommendations.push('Ensure .clineconfig.js is in the workspace root directory');
            }

            // Check VS Code settings that might conflict
            const vscodeSettings = vscode.workspace.getConfiguration();
            const conflictingSettings = this.checkForConflictingSettings(vscodeSettings, ourConfig);
            
            if (conflictingSettings.length > 0) {
                result.recommendations.push(`Consider updating VS Code settings: ${conflictingSettings.join(', ')}`);
            }

            return result;
        } catch (error) {
            result.errors.push(`Error validating settings application: ${error}`);
            return result;
        }
    }

    private async checkClineStorageForOurSettings(ourConfig: any): Promise<{ found: boolean; matches: boolean }> {
        try {
            // Get Cline's global storage path
            const os = require('os');
            let clineStorageBase = '';
            
            if (process.platform === 'win32') {
                clineStorageBase = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
            } else if (process.platform === 'darwin') {
                clineStorageBase = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
            } else {
                clineStorageBase = path.join(os.homedir(), '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev');
            }

            // Check if recent tasks are using our settings
            const tasksPath = path.join(clineStorageBase, 'tasks');
            
            if (fs.existsSync(tasksPath)) {
                const taskDirs = fs.readdirSync(tasksPath)
                    .filter((dir: string) => fs.statSync(path.join(tasksPath, dir)).isDirectory())
                    .sort()
                    .reverse()
                    .slice(0, 3); // Check last 3 tasks

                for (const taskDir of taskDirs) {
                    const metadataPath = path.join(tasksPath, taskDir, 'task_metadata.json');
                    
                    if (fs.existsSync(metadataPath)) {
                        try {
                            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                            
                            // Check if the model matches our config
                            if (metadata.model && ourConfig.model && metadata.model === ourConfig.model) {
                                console.log('🔧 ClineSettingsValidator: Found matching model in task:', taskDir);
                                return { found: true, matches: true };
                            }

                            // Check for other matching settings
                            if (metadata.maxTokens === ourConfig.maxTokens) {
                                console.log('🔧 ClineSettingsValidator: Found matching maxTokens in task:', taskDir);
                                return { found: true, matches: true };
                            }
                        } catch (parseError) {
                            console.warn('🔧 ClineSettingsValidator: Could not parse task metadata:', parseError);
                        }
                    }
                }
            }

            return { found: false, matches: false };
        } catch (error) {
            console.error('🔧 ClineSettingsValidator: Error checking Cline storage:', error);
            return { found: false, matches: false };
        }
    }

    private checkForConflictingSettings(vscodeSettings: vscode.WorkspaceConfiguration, ourConfig: any): string[] {
        const conflicts: string[] = [];

        try {
            // Check for conflicting VS Code settings
            const potentialConflicts = [
                'cline.apiProvider',
                'cline.model',
                'cline.maxTokens',
                'claude-dev.apiProvider',
                'claude-dev.model'
            ];

            for (const setting of potentialConflicts) {
                const vscodeValue = vscodeSettings.get(setting);
                if (vscodeValue && typeof vscodeValue !== 'undefined') {
                    const settingKey = setting.split('.')[1];
                    if (ourConfig[settingKey] && ourConfig[settingKey] !== vscodeValue) {
                        conflicts.push(`${setting}: VS Code (${vscodeValue}) vs Config (${ourConfig[settingKey]})`);
                    }
                }
            }

            return conflicts;
        } catch (error) {
            console.error('🔧 ClineSettingsValidator: Error checking conflicts:', error);
            return [];
        }
    }

    private generateRecommendations(status: ClineSettingsStatus): void {
        if (!status.clineExtensionActive) {
            status.recommendations.push('Install and activate the Cline extension (saoudrizwan.claude-dev)');
        }

        if (!status.configFileExists) {
            status.recommendations.push('Create a .clineconfig.js file in your workspace root');
            status.recommendations.push('Use the Token Manager Settings tab to generate the config file');
        }

        if (status.configFileExists && !status.configFileValid) {
            status.recommendations.push('Fix syntax errors in .clineconfig.js');
            status.recommendations.push('Use "Token Manager: Reload Config" to test the configuration');
        }

        if (!status.settingsApplied) {
            status.recommendations.push('Restart VS Code to ensure Cline picks up the new configuration');
            status.recommendations.push('Check that .clineconfig.js is in the correct workspace folder');
            status.recommendations.push('Verify Cline extension version supports .clineconfig.js files');
        }
    }

    public startPeriodicValidation(): void {
        console.log('🔧 ClineSettingsValidator: Starting periodic validation');
        
        // Validate every 30 seconds
        this.validationInterval = setInterval(async () => {
            const status = await this.validateClineIntegration();
            
            // Show warnings for critical issues
            if (!status.clineExtensionActive) {
                vscode.window.showWarningMessage(
                    '🔧 Cline extension not active - Token Manager integration limited',
                    'Install Cline'
                ).then(selection => {
                    if (selection === 'Install Cline') {
                        vscode.env.openExternal(vscode.Uri.parse('vscode:extension/saoudrizwan.claude-dev'));
                    }
                });
            }

            if (status.configFileExists && !status.settingsApplied) {
                vscode.window.showInformationMessage(
                    '🔧 Settings may not be applied by Cline. Consider restarting VS Code.',
                    'Restart Now'
                ).then(selection => {
                    if (selection === 'Restart Now') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
            }
        }, 30000);
    }

    public stopPeriodicValidation(): void {
        if (this.validationInterval) {
            clearInterval(this.validationInterval);
            this.validationInterval = null;
        }
    }

    public async generateDiagnosticReport(): Promise<string> {
        const status = await this.validateClineIntegration();
        
        const report = `
# Cline Token Manager - Integration Diagnostic Report

## Status Overview
- **Cline Extension Active**: ${status.clineExtensionActive ? '✅' : '❌'}
- **Config File Exists**: ${status.configFileExists ? '✅' : '❌'}
- **Config File Valid**: ${status.configFileValid ? '✅' : '❌'}
- **Settings Applied**: ${status.settingsApplied ? '✅' : '❌'}

## Errors
${status.errors.length > 0 ? status.errors.map(error => `- ❌ ${error}`).join('\n') : '- ✅ No errors detected'}

## Recommendations
${status.recommendations.length > 0 ? status.recommendations.map(rec => `- 💡 ${rec}`).join('\n') : '- ✅ No recommendations needed'}

## Generated
${new Date(status.lastValidationTime).toLocaleString()}
        `;

        return report.trim();
    }

    public dispose(): void {
        this.stopPeriodicValidation();
    }
}