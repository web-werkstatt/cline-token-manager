/**
 * 🚧 ENTERPRISE FEATURE GATING SYSTEM
 * 
 * Enforces license restrictions and drives enterprise sales
 * Community limitations create strong upgrade incentive
 * 
 * Business Strategy: Severe community limits → Enterprise conversions
 */

import * as vscode from 'vscode';
import { licenseMgr, FeaturePermissions } from './license-manager';

export class FeatureGate {
    private static instance: FeatureGate;
    private permissions?: FeaturePermissions;
    private lastCheck: number = 0;
    private checkInterval: number = 60 * 60 * 1000; // Check every hour

    private constructor() {}

    public static getInstance(): FeatureGate {
        if (!FeatureGate.instance) {
            FeatureGate.instance = new FeatureGate();
        }
        return FeatureGate.instance;
    }

    public async getPermissions(): Promise<FeaturePermissions> {
        const now = Date.now();
        
        // Cache permissions for performance
        if (this.permissions && (now - this.lastCheck) < this.checkInterval) {
            return this.permissions;
        }

        try {
            this.permissions = await licenseMgr.getFeaturePermissions();
            this.lastCheck = now;
            return this.permissions;
        } catch (error) {
            console.error('Failed to get feature permissions:', error);
            
            // Fallback to community restrictions
            return this.getCommunityPermissions();
        }
    }

    // Universal AI Platform Feature Gates

    public async canUseCursorKiller(): Promise<boolean> {
        const permissions = await this.getPermissions();
        
        if (!permissions.cursorKiller) {
            this.showUpgradePrompt('Cursor Killer', 
                '🎯 Cursor Killer requires Enterprise license.\n\n' +
                'Save €220/year by hijacking Cursor API calls with 70% optimization!\n\n' +
                'Enterprise: €499/year for full team\n' +
                'Your ROI: €220 savings + optimization benefits');
            return false;
        }
        
        return true;
    }

    public async canUseCopilotBypass(): Promise<boolean> {
        const permissions = await this.getPermissions();
        
        if (!permissions.copilotBypass) {
            this.showUpgradePrompt('Copilot Bypass',
                '🤖 Copilot Bypass requires Enterprise license.\n\n' +
                'Get transparency into Microsoft\'s hidden Copilot costs!\n\n' +
                'Enterprise: €499/year for full platform\n' +
                'Benefit: Cost transparency + optimization');
            return false;
        }
        
        return true;
    }

    public async canUseLocalModels(): Promise<boolean> {
        const permissions = await this.getPermissions();
        
        if (!permissions.localModels) {
            this.showUpgradePrompt('Local Models',
                '🏠 Local Models support requires Enterprise license.\n\n' +
                'Connect to Ollama, LM Studio, and other local AI for FREE usage!\n\n' +
                'Enterprise: €499/year\n' +
                'Benefit: Zero API costs with local models');
            return false;
        }
        
        return true;
    }

    public async canUseUniversalProxy(): Promise<boolean> {
        const permissions = await this.getPermissions();
        
        if (!permissions.universalProxy) {
            this.showUpgradePrompt('Universal AI Proxy',
                '🚀 Universal AI Proxy requires Enterprise license.\n\n' +
                'Intercept and optimize ALL AI tools (Cline, Cursor, Copilot, etc.)!\n\n' +
                'Enterprise: €499/year\n' +
                'Your savings: €220+ on Cursor alone + optimization benefits');
            return false;
        }
        
        return true;
    }

    public async getOptimizationLevel(): Promise<number> {
        const permissions = await this.getPermissions();
        return permissions.optimizationLevel;
    }

    public async canUseTeamAnalytics(): Promise<boolean> {
        const permissions = await this.getPermissions();
        
        if (!permissions.teamAnalytics) {
            this.showUpgradePrompt('Team Analytics',
                '📊 Team Analytics requires Enterprise license.\n\n' +
                'Get detailed insights into team AI usage and costs!\n\n' +
                'Enterprise: €499/year for up to 25 team members\n' +
                'Enterprise Plus: €1,999/year for unlimited members');
            return false;
        }
        
        return true;
    }

    public async canUseCostEnforcement(): Promise<boolean> {
        const permissions = await this.getPermissions();
        
        if (!permissions.costEnforcement) {
            this.showUpgradePrompt('Cost Enforcement',
                '💰 Cost Enforcement requires Enterprise license.\n\n' +
                'Set hard limits to prevent budget surprises!\n\n' +
                'Enterprise: €499/year\n' +
                'Benefit: Complete budget control + cost transparency');
            return false;
        }
        
        return true;
    }

    // Daily Request Limiting (Community Restriction)
    public async checkRequestLimit(): Promise<boolean> {
        const permissions = await this.getPermissions();
        
        if (permissions.unlimitedRequests) {
            return true; // Enterprise has unlimited requests
        }

        // Community users have daily limits
        const today = new Date().toDateString();
        const storageKey = `universalAI.dailyRequests.${today}`;
        const currentRequests = parseInt(vscode.workspace.getConfiguration().get(storageKey) || '0');
        
        if (currentRequests >= permissions.maxProxyRequestsPerDay) {
            this.showUpgradePrompt('Daily Request Limit Reached',
                `🚨 Community limit: ${permissions.maxProxyRequestsPerDay} requests/day reached!\n\n` +
                '• Enterprise: UNLIMITED requests\n' +
                '• Enterprise: 70% optimization\n' +
                '• Enterprise: All AI tools supported\n\n' +
                'Upgrade for €499/year to remove all limits!');
            return false;
        }

        // Increment request counter
        await vscode.workspace.getConfiguration().update(storageKey, currentRequests + 1, vscode.ConfigurationTarget.Global);
        
        // Show warning at 80% limit
        if (currentRequests >= permissions.maxProxyRequestsPerDay * 0.8) {
            const remaining = permissions.maxProxyRequestsPerDay - currentRequests;
            vscode.window.showWarningMessage(
                `⚠️ Community limit: ${remaining} requests remaining today. Upgrade to Enterprise for unlimited access!`,
                'Upgrade Now'
            ).then(action => {
                if (action === 'Upgrade Now') {
                    vscode.env.openExternal(vscode.Uri.parse('https://universalai.platform/enterprise'));
                }
            });
        }
        
        return true;
    }

    // Optimization Quality Gating
    public async getOptimizationQuality(): Promise<'basic' | 'standard' | 'premium' | 'maximum'> {
        const level = await this.getOptimizationLevel();
        
        if (level >= 80) return 'maximum';    // Custom
        if (level >= 75) return 'premium';    // Enterprise Plus
        if (level >= 70) return 'standard';   // Enterprise
        return 'basic';                       // Community (30%)
    }

    public async shouldShowOptimizationWatermark(): Promise<boolean> {
        const permissions = await this.getPermissions();
        return permissions.optimizationLevel <= 30; // Show watermark for community
    }

    // Enterprise Feature Checks
    public async canUseSSO(): Promise<boolean> {
        const permissions = await this.getPermissions();
        return permissions.ssoIntegration;
    }

    public async canUseWhiteLabel(): Promise<boolean> {
        const permissions = await this.getPermissions();
        return permissions.whiteLabel;
    }

    public async canUseOnPremise(): Promise<boolean> {
        const permissions = await this.getPermissions();
        return permissions.onPremise;
    }

    public async hasPrioritySupport(): Promise<boolean> {
        const permissions = await this.getPermissions();
        return permissions.prioritySupport;
    }

    public async hasDedicatedCSM(): Promise<boolean> {
        const permissions = await this.getPermissions();
        return permissions.dedicatedCSM;
    }

    // Team Management
    public async getMaxTeamMembers(): Promise<number> {
        const permissions = await this.getPermissions();
        return permissions.maxTeamMembers;
    }

    public async canAddTeamMember(currentTeamSize: number): Promise<boolean> {
        const maxMembers = await this.getMaxTeamMembers();
        
        if (currentTeamSize >= maxMembers) {
            const permissions = await this.getPermissions();
            
            if (permissions.maxTeamMembers === 1) {
                this.showUpgradePrompt('Team Size Limit',
                    '👥 Community license is single-user only.\n\n' +
                    'Enterprise: Up to 25 team members (€499/year)\n' +
                    'Enterprise Plus: Unlimited team members (€1,999/year)\n\n' +
                    'Cost per user: As low as €20/year vs €240/year for Cursor!');
            } else {
                this.showUpgradePrompt('Team Size Limit',
                    `👥 Your license supports up to ${maxMembers} team members.\n\n` +
                    'Enterprise Plus: Unlimited team members (€1,999/year)\n' +
                    'Custom: Enterprise features + dedicated support (€10k+/year)');
            }
            
            return false;
        }
        
        return true;
    }

    // UI Watermarks and Restrictions
    public async addCommunityWatermark(element: any): Promise<void> {
        if (await this.shouldShowOptimizationWatermark()) {
            // Add watermark to UI elements
            const watermarkText = '🏢 Upgrade to Enterprise for full optimization';
            // Implementation depends on specific UI framework
        }
    }

    public async showCommunityLimitations(): Promise<void> {
        const permissions = await this.getPermissions();
        
        if (permissions.optimizationLevel <= 30) {
            const message = 
                '🆓 Community License Limitations:\n\n' +
                '• 30% optimization only (vs 70%+ Enterprise)\n' +
                '• 100 requests/day limit\n' +
                '• Single user only\n' +
                '• No Cursor Killer\n' +
                '• No Copilot Bypass\n' +
                '• No team features\n' +
                '• No cost enforcement\n' +
                '• Community support only\n\n' +
                '💼 Enterprise: €499/year for full platform\n' +
                '💰 ROI: Save €220/year on Cursor alone!';
            
            vscode.window.showInformationMessage(
                message,
                'Upgrade to Enterprise',
                'Learn More',
                'Maybe Later'
            ).then(action => {
                if (action === 'Upgrade to Enterprise') {
                    vscode.env.openExternal(vscode.Uri.parse('https://universalai.platform/enterprise'));
                } else if (action === 'Learn More') {
                    vscode.env.openExternal(vscode.Uri.parse('https://universalai.platform/pricing'));
                }
            });
        }
    }

    // Private helper methods
    private getCommunityPermissions(): FeaturePermissions {
        return {
            // AI Tools Access (all disabled for community)
            cursorKiller: false,
            copilotBypass: false,
            localModels: false,
            universalProxy: false,
            
            // Severe optimization restriction
            optimizationLevel: 30,
            
            // Team Features (all disabled)
            maxTeamMembers: 1,
            teamAnalytics: false,
            costEnforcement: false,
            
            // Enterprise Features (all disabled)
            ssoIntegration: false,
            whiteLabel: false,
            onPremise: false,
            
            // Support (community only)
            prioritySupport: false,
            dedicatedCSM: false,
            
            // Severe limits to drive upgrades
            maxProxyRequestsPerDay: 100,
            unlimitedRequests: false
        };
    }

    private showUpgradePrompt(feature: string, message: string): void {
        vscode.window.showWarningMessage(
            message,
            'Upgrade Now',
            'Enter License Key',
            'Learn More'
        ).then(action => {
            if (action === 'Upgrade Now') {
                vscode.env.openExternal(vscode.Uri.parse('https://universalai.platform/enterprise'));
            } else if (action === 'Enter License Key') {
                vscode.commands.executeCommand('universalAI.enterLicenseKey');
            } else if (action === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://universalai.platform/pricing'));
            }
        });
        
        // Log feature restriction for analytics
        console.log(`FEATURE_RESTRICTION: ${feature} blocked for community user`);
    }
}

// Export singleton
export const featureGate = FeatureGate.getInstance();

// Helper functions for easy access
export async function requiresEnterprise(feature: string): Promise<boolean> {
    const gate = FeatureGate.getInstance();
    
    switch (feature) {
        case 'cursor-killer': return await gate.canUseCursorKiller();
        case 'copilot-bypass': return await gate.canUseCopilotBypass();
        case 'local-models': return await gate.canUseLocalModels();
        case 'universal-proxy': return await gate.canUseUniversalProxy();
        case 'team-analytics': return await gate.canUseTeamAnalytics();
        case 'cost-enforcement': return await gate.canUseCostEnforcement();
        default: return true;
    }
}

export async function checkDailyLimit(): Promise<boolean> {
    const gate = FeatureGate.getInstance();
    return await gate.checkRequestLimit();
}

export async function getOptimizationLevel(): Promise<number> {
    const gate = FeatureGate.getInstance();
    return await gate.getOptimizationLevel();
}

export async function isEnterpriseTier(): Promise<boolean> {
    const permissions = await FeatureGate.getInstance().getPermissions();
    return permissions.optimizationLevel > 30;
}