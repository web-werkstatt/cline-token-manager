/**
 * 🔐 ENTERPRISE LICENSE MANAGER
 * 
 * TypeScript wrapper for C++ license validation core
 * Integrates with Universal AI Platform for enterprise B2B strategy
 * 
 * Business Model: €499-€1999/year enterprise tiers
 * Security: RSA-2048 + hardware fingerprinting
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export interface EnterpriseLicense {
    isValid: boolean;
    tier: 'community' | 'enterprise' | 'enterprise-plus' | 'custom';
    teamSize: number;
    features: string[];
    expiryDate: Date;
    daysRemaining: number;
    hardwareId?: string;
    organizationName?: string;
    upgradeUrl?: string;
    error?: string;
}

export interface FeaturePermissions {
    // AI Tools Access
    cursorKiller: boolean;
    copilotBypass: boolean;
    localModels: boolean;
    universalProxy: boolean;
    
    // Optimization Levels
    optimizationLevel: number; // 30% community, 70%+ enterprise
    
    // Team Features
    maxTeamMembers: number;
    teamAnalytics: boolean;
    costEnforcement: boolean;
    
    // Enterprise Features
    ssoIntegration: boolean;
    whiteLabel: boolean;
    onPremise: boolean;
    
    // Support
    prioritySupport: boolean;
    dedicatedCSM: boolean;
    
    // Limits
    maxProxyRequestsPerDay: number;
    unlimitedRequests: boolean;
}

export class EnterpriseLicenseManager {
    private static instance: EnterpriseLicenseManager;
    private licenseValidatorPath: string;
    private lastValidation?: EnterpriseLicense;
    private validationCache: Map<string, EnterpriseLicense> = new Map();
    private cacheExpiry: number = 60 * 60 * 1000; // 1 hour cache

    constructor() {
        // Path to compiled C++ license validator binary
        const platform = process.platform;
        const arch = process.arch;
        const binaryName = platform === 'win32' ? 'license-validator.exe' : 'license-validator';
        
        // Try multiple possible locations
        const possiblePaths = [
            path.join(__dirname, '..', '..', 'enterprise-license-core', 'build', binaryName),
            path.join(__dirname, '..', 'bin', platform, binaryName),
            path.join(__dirname, '..', 'bin', `${platform}-${arch}`, binaryName),
            path.join(process.env.HOME || process.env.USERPROFILE || '', '.universalai', 'bin', binaryName)
        ];
        
        // Find first existing binary
        this.licenseValidatorPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
    }

    public static getInstance(): EnterpriseLicenseManager {
        if (!EnterpriseLicenseManager.instance) {
            EnterpriseLicenseManager.instance = new EnterpriseLicenseManager();
        }
        return EnterpriseLicenseManager.instance;
    }

    public async validateEnterpriseLicense(licenseKey?: string): Promise<EnterpriseLicense> {
        try {
            // Check cache first
            const cacheKey = licenseKey || 'default';
            const cached = this.validationCache.get(cacheKey);
            if (cached && Date.now() - cached.expiryDate.getTime() < this.cacheExpiry) {
                return cached;
            }

            // Ensure binary exists
            if (!fs.existsSync(this.licenseValidatorPath)) {
                return this.getCommunityLicense(`License validator not found at: ${this.licenseValidatorPath}`);
            }

            // Call C++ binary for secure license validation
            const command = licenseKey 
                ? `\"${this.licenseValidatorPath}\" --validate-key \"${licenseKey}\"`
                : `\"${this.licenseValidatorPath}\" --validate`;

            const result = execSync(command, {
                encoding: 'utf8',
                timeout: 10000,
                windowsHide: true
            });

            const licenseData = JSON.parse(result.trim());
            
            if (licenseData.is_valid) {
                const license: EnterpriseLicense = {
                    isValid: true,
                    tier: this.mapTierFromNumber(licenseData.tier),
                    teamSize: licenseData.team_size || 1,
                    features: this.extractFeatures(licenseData.features),
                    expiryDate: new Date(parseInt(licenseData.expiry_date) * 1000),
                    daysRemaining: licenseData.days_remaining || 0,
                    hardwareId: licenseData.hardware_id,
                    organizationName: licenseData.organization_name
                };
                
                // Cache successful validation
                this.validationCache.set(cacheKey, license);
                this.lastValidation = license;
                this.logLicenseEvent('VALID', license);
                
                return license;
            } else {
                return this.getCommunityLicense(licenseData.error_message);
            }

        } catch (error) {
            console.warn('Enterprise license validation failed, falling back to community mode:', error);
            return this.getCommunityLicense(error instanceof Error ? error.message : String(error));
        }
    }

    public async installLicense(licenseKey: string): Promise<boolean> {
        try {
            const result = execSync(`\"${this.licenseValidatorPath}\" --install \"${licenseKey}\"`, {
                encoding: 'utf8',
                timeout: 15000,
                windowsHide: true
            });

            const success = !result.toLowerCase().includes('failed');
            if (success) {
                // Clear cache to force revalidation
                this.validationCache.clear();
                this.logLicenseEvent('INSTALLED', { licenseKey: licenseKey.substring(0, 20) + '...' });
            }
            
            return success;
            
        } catch (error) {
            console.error('License installation failed:', error);
            return false;
        }
    }

    public async removeLicense(): Promise<boolean> {
        try {
            const result = execSync(`\"${this.licenseValidatorPath}\" --remove`, {
                encoding: 'utf8',
                timeout: 10000,
                windowsHide: true
            });

            const success = !result.toLowerCase().includes('failed');
            if (success) {
                // Clear cache
                this.validationCache.clear();
                this.lastValidation = undefined;
                this.logLicenseEvent('REMOVED', {});
            }
            
            return success;
            
        } catch (error) {
            console.error('License removal failed:', error);
            return false;
        }
    }

    public async getFeaturePermissions(): Promise<FeaturePermissions> {
        const license = await this.validateEnterpriseLicense();
        
        return {
            // AI Tools Access
            cursorKiller: license.tier !== 'community',
            copilotBypass: license.tier !== 'community',
            localModels: license.tier !== 'community',
            universalProxy: license.tier !== 'community',
            
            // Optimization Levels
            optimizationLevel: this.getOptimizationLevel(license.tier),
            
            // Team Features
            maxTeamMembers: license.teamSize,
            teamAnalytics: license.tier !== 'community',
            costEnforcement: license.tier !== 'community',
            
            // Enterprise Features
            ssoIntegration: license.tier === 'enterprise-plus' || license.tier === 'custom',
            whiteLabel: license.tier === 'enterprise-plus' || license.tier === 'custom',
            onPremise: license.tier === 'enterprise-plus' || license.tier === 'custom',
            
            // Support
            prioritySupport: license.tier !== 'community',
            dedicatedCSM: license.tier === 'custom',
            
            // Limits
            maxProxyRequestsPerDay: license.tier === 'community' ? 100 : 0, // 0 = unlimited
            unlimitedRequests: license.tier !== 'community'
        };
    }

    public async getHardwareFingerprint(): Promise<string> {
        try {
            const result = execSync(`\"${this.licenseValidatorPath}\" --hardware`, {
                encoding: 'utf8',
                timeout: 5000,
                windowsHide: true
            });
            
            return result.trim();
            
        } catch (error) {
            console.error('Failed to get hardware fingerprint:', error);
            return 'UNKNOWN';
        }
    }

    public async getSystemInfo(): Promise<any> {
        try {
            const result = execSync(`\"${this.licenseValidatorPath}\" --system`, {
                encoding: 'utf8',
                timeout: 5000,
                windowsHide: true
            });
            
            return JSON.parse(result.trim());
            
        } catch (error) {
            console.error('Failed to get system info:', error);
            return { error: error instanceof Error ? error.message : String(error) };
        }
    }

    public async performIntegrityCheck(): Promise<boolean> {
        try {
            const result = execSync(`\"${this.licenseValidatorPath}\" --integrity`, {
                encoding: 'utf8',
                timeout: 10000,
                windowsHide: true
            });
            
            return result.toLowerCase().includes('passed');
            
        } catch (error) {
            console.error('Integrity check failed:', error);
            return false;
        }
    }

    public isLicenseValidatorAvailable(): boolean {
        return fs.existsSync(this.licenseValidatorPath);
    }

    public async showLicenseDialog(): Promise<void> {
        const license = await this.validateEnterpriseLicense();
        
        if (license.isValid && license.tier !== 'community') {
            // Show enterprise license info
            const message = `✅ Enterprise License Active\n\n` +
                          `Tier: ${license.tier.charAt(0).toUpperCase() + license.tier.slice(1)}\n` +
                          `Team Size: ${license.teamSize}\n` +
                          `Days Remaining: ${license.daysRemaining}\n` +
                          `Organization: ${license.organizationName || 'Not specified'}`;
            
            vscode.window.showInformationMessage(message);
        } else {
            // Show upgrade dialog
            const message = `🆓 Community License Active\n\n` +
                          `• Limited to 30% optimization\n` +
                          `• Single user only\n` +
                          `• 100 requests/day limit\n` +
                          `• No enterprise features\n\n` +
                          `Upgrade to Enterprise for full platform access!`;
            
            const action = await vscode.window.showInformationMessage(
                message,
                'Upgrade to Enterprise',
                'Learn More',
                'Enter License Key'
            );
            
            if (action === 'Upgrade to Enterprise') {
                vscode.env.openExternal(vscode.Uri.parse('https://universalai.platform/enterprise'));
            } else if (action === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://universalai.platform/pricing'));
            } else if (action === 'Enter License Key') {
                await this.showLicenseKeyInput();
            }
        }
    }

    public async showLicenseKeyInput(): Promise<void> {
        const licenseKey = await vscode.window.showInputBox({
            prompt: 'Enter your Enterprise License Key',
            placeHolder: 'UNVAI2024-ENT-PLUS-...',
            password: true,
            validateInput: (value) => {
                if (!value || value.length < 10) {
                    return 'License key too short';
                }
                if (!value.startsWith('UNVAI')) {
                    return 'Invalid license key format';
                }
                return null;
            }
        });
        
        if (licenseKey) {
            const installing = vscode.window.setStatusBarMessage('$(sync~spin) Installing enterprise license...');
            
            try {
                const success = await this.installLicense(licenseKey);
                
                if (success) {
                    vscode.window.showInformationMessage('✅ Enterprise license installed successfully!');
                    // Trigger UI refresh
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                } else {
                    vscode.window.showErrorMessage('❌ License installation failed. Please check your license key.');
                }
            } finally {
                installing.dispose();
            }
        }
    }

    // Private helper methods
    private getCommunityLicense(error?: string): EnterpriseLicense {
        return {
            isValid: false,
            tier: 'community',
            teamSize: 1,
            features: ['basic-optimization', 'cline-only'],
            expiryDate: new Date('2099-12-31'),
            daysRemaining: 0,
            upgradeUrl: 'https://universalai.platform/enterprise',
            error: error
        };
    }

    private mapTierFromNumber(tierNumber: number): EnterpriseLicense['tier'] {
        switch (tierNumber) {
            case 1: return 'enterprise';
            case 2: return 'enterprise-plus';
            case 3: return 'custom';
            default: return 'community';
        }
    }

    private extractFeatures(featuresObj: any): string[] {
        if (!featuresObj) return [];
        
        const features: string[] = [];
        
        if (featuresObj.cursor_killer) features.push('cursor-killer');
        if (featuresObj.copilot_bypass) features.push('copilot-bypass');
        if (featuresObj.local_models) features.push('local-models');
        if (featuresObj.universal_proxy) features.push('universal-proxy');
        if (featuresObj.team_analytics) features.push('team-analytics');
        if (featuresObj.cost_enforcement) features.push('cost-enforcement');
        if (featuresObj.sso_integration) features.push('sso-integration');
        if (featuresObj.white_label) features.push('white-label');
        if (featuresObj.on_premise) features.push('on-premise');
        if (featuresObj.priority_support) features.push('priority-support');
        if (featuresObj.dedicated_csm) features.push('dedicated-csm');
        
        return features;
    }

    private getOptimizationLevel(tier: EnterpriseLicense['tier']): number {
        switch (tier) {
            case 'community': return 30;
            case 'enterprise': return 70;
            case 'enterprise-plus': return 75;
            case 'custom': return 80;
            default: return 30;
        }
    }

    private logLicenseEvent(event: string, data: any): void {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ENTERPRISE_LICENSE_${event}:`, data);
    }
}

// Export singleton instance
export const licenseMgr = EnterpriseLicenseManager.getInstance();

// Export for VS Code commands
export function registerLicenseCommands(context: vscode.ExtensionContext) {
    // Show license info command
    const showLicenseCmd = vscode.commands.registerCommand('universalAI.showLicense', async () => {
        await licenseMgr.showLicenseDialog();
    });

    // Enter license key command  
    const enterLicenseCmd = vscode.commands.registerCommand('universalAI.enterLicenseKey', async () => {
        await licenseMgr.showLicenseKeyInput();
    });

    // Remove license command
    const removeLicenseCmd = vscode.commands.registerCommand('universalAI.removeLicense', async () => {
        const confirm = await vscode.window.showWarningMessage(
            'Remove enterprise license? This will revert to community mode.',
            'Remove License',
            'Cancel'
        );
        
        if (confirm === 'Remove License') {
            const success = await licenseMgr.removeLicense();
            if (success) {
                vscode.window.showInformationMessage('Enterprise license removed successfully.');
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            } else {
                vscode.window.showErrorMessage('Failed to remove license.');
            }
        }
    });

    // Hardware fingerprint command
    const hardwareCmd = vscode.commands.registerCommand('universalAI.showHardwareFingerprint', async () => {
        const fingerprint = await licenseMgr.getHardwareFingerprint();
        const message = `Hardware Fingerprint: ${fingerprint}\n\nThis unique identifier is used for license binding. Include this when purchasing an enterprise license.`;
        
        vscode.window.showInformationMessage(message, 'Copy to Clipboard').then(action => {
            if (action === 'Copy to Clipboard') {
                vscode.env.clipboard.writeText(fingerprint);
            }
        });
    });

    context.subscriptions.push(showLicenseCmd, enterLicenseCmd, removeLicenseCmd, hardwareCmd);
}