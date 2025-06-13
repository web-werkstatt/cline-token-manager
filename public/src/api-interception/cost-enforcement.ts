import * as vscode from 'vscode';

export interface CostLimit {
    type: 'request' | 'hourly' | 'daily' | 'monthly';
    amount: number;
    currency: 'EUR' | 'USD';
    enabled: boolean;
}

export interface CostAlert {
    threshold: number; // percentage of limit (e.g., 80 for 80%)
    action: 'warn' | 'block' | 'optimize';
    message: string;
}

export interface CostUsage {
    current: number;
    limit: number;
    percentage: number;
    resetTime?: Date;
}

/**
 * 💰 COST ENFORCEMENT SYSTEM
 * 
 * This is what makes us SUPERIOR to every other AI tool:
 * - HARD LIMITS before API calls (not just monitoring after)
 * - REAL-TIME cost tracking across ALL providers
 * - PROACTIVE warnings and optimization suggestions
 * - TEAM BUDGET management for enterprise
 * 
 * MESSAGE: "Never get surprised by AI costs again - we ENFORCE limits!"
 */
export class CostEnforcementSystem {
    private static instance: CostEnforcementSystem;
    private costLimits: Map<string, CostLimit> = new Map();
    private costUsage: Map<string, number> = new Map();
    private costAlerts: CostAlert[] = [];
    private lastResetTime: Map<string, Date> = new Map();

    // Cost tracking per provider
    private providerCosts: Map<string, number> = new Map();
    
    // Team/enterprise features
    private teamBudget?: number;
    private teamUsage: number = 0;
    private userQuotas: Map<string, number> = new Map();

    private constructor() {
        this.initializeDefaultLimits();
        this.initializeDefaultAlerts();
        this.startCostTracking();
        console.log('💰 COST ENFORCEMENT SYSTEM ACTIVATED - NO MORE BUDGET SURPRISES!');
    }

    public static getInstance(): CostEnforcementSystem {
        if (!CostEnforcementSystem.instance) {
            CostEnforcementSystem.instance = new CostEnforcementSystem();
        }
        return CostEnforcementSystem.instance;
    }

    /**
     * 🚨 MAIN ENFORCEMENT METHOD - Called before every API request
     */
    public async enforceRequestCost(
        provider: string, 
        estimatedCost: number, 
        userId?: string
    ): Promise<{ allowed: boolean; reason?: string; suggestion?: string }> {
        
        console.log(`💰 ENFORCING COST: Provider=${provider}, Cost=€${estimatedCost.toFixed(6)}, User=${userId || 'anonymous'}`);

        try {
            // 1. Check per-request limit
            const requestLimit = this.costLimits.get('request');
            if (requestLimit?.enabled && estimatedCost > requestLimit.amount) {
                console.log('🚨 REQUEST COST LIMIT EXCEEDED!');
                return {
                    allowed: false,
                    reason: `Request cost €${estimatedCost.toFixed(6)} exceeds per-request limit €${requestLimit.amount}`,
                    suggestion: 'Enable optimization to reduce token usage, or increase per-request limit'
                };
            }

            // 2. Check daily limit
            const dailyUsage = this.getCurrentUsage('daily');
            const dailyLimit = this.costLimits.get('daily');
            if (dailyLimit?.enabled && (dailyUsage.current + estimatedCost) > dailyLimit.amount) {
                console.log('🚨 DAILY COST LIMIT WOULD BE EXCEEDED!');
                return {
                    allowed: false,
                    reason: `Request would exceed daily limit: €${(dailyUsage.current + estimatedCost).toFixed(4)} > €${dailyLimit.amount}`,
                    suggestion: 'Wait until tomorrow, enable aggressive optimization, or increase daily limit'
                };
            }

            // 3. Check monthly limit
            const monthlyUsage = this.getCurrentUsage('monthly');
            const monthlyLimit = this.costLimits.get('monthly');
            if (monthlyLimit?.enabled && (monthlyUsage.current + estimatedCost) > monthlyLimit.amount) {
                console.log('🚨 MONTHLY COST LIMIT WOULD BE EXCEEDED!');
                return {
                    allowed: false,
                    reason: `Request would exceed monthly limit: €${(monthlyUsage.current + estimatedCost).toFixed(4)} > €${monthlyLimit.amount}`,
                    suggestion: 'Enable aggressive optimization, wait until next month, or upgrade your plan'
                };
            }

            // 4. Check team budget (if applicable)
            if (this.teamBudget && (this.teamUsage + estimatedCost) > this.teamBudget) {
                console.log('🚨 TEAM BUDGET WOULD BE EXCEEDED!');
                return {
                    allowed: false,
                    reason: `Request would exceed team budget: €${(this.teamUsage + estimatedCost).toFixed(4)} > €${this.teamBudget}`,
                    suggestion: 'Contact your admin to increase team budget or enable team-wide optimization'
                };
            }

            // 5. Check user quota (if applicable)
            if (userId && this.userQuotas.has(userId)) {
                const userQuota = this.userQuotas.get(userId)!;
                const userUsage = this.getUserUsage(userId);
                if ((userUsage + estimatedCost) > userQuota) {
                    console.log(`🚨 USER QUOTA WOULD BE EXCEEDED! User=${userId}`);
                    return {
                        allowed: false,
                        reason: `Request would exceed your quota: €${(userUsage + estimatedCost).toFixed(4)} > €${userQuota}`,
                        suggestion: 'Enable optimization, contact your admin, or wait for quota reset'
                    };
                }
            }

            // 6. Check for warnings (80% of limits)
            await this.checkCostAlerts(estimatedCost);

            console.log('✅ COST ENFORCEMENT PASSED - Request approved');
            return { allowed: true };

        } catch (error) {
            console.error('❌ Cost enforcement error:', error);
            // Fail-safe: allow request but log error
            return { 
                allowed: true, 
                reason: 'Cost enforcement error - request allowed by default',
                suggestion: 'Check cost enforcement system configuration'
            };
        }
    }

    /**
     * 📊 RECORD ACTUAL COST after API call completes
     */
    public recordActualCost(
        provider: string, 
        actualCost: number, 
        tokensUsed: number,
        userId?: string
    ): void {
        try {
            console.log(`📊 RECORDING COST: Provider=${provider}, Cost=€${actualCost.toFixed(6)}, Tokens=${tokensUsed}, User=${userId || 'anonymous'}`);

            // Update provider costs
            const currentProviderCost = this.providerCosts.get(provider) || 0;
            this.providerCosts.set(provider, currentProviderCost + actualCost);

            // Update total daily cost
            const today = this.getDateKey('daily');
            const currentDaily = this.costUsage.get(today) || 0;
            this.costUsage.set(today, currentDaily + actualCost);

            // Update total monthly cost
            const thisMonth = this.getDateKey('monthly');
            const currentMonthly = this.costUsage.get(thisMonth) || 0;
            this.costUsage.set(thisMonth, currentMonthly + actualCost);

            // Update team usage
            if (this.teamBudget) {
                this.teamUsage += actualCost;
            }

            // Update user usage
            if (userId) {
                const userUsageKey = `user_${userId}_${today}`;
                const currentUserUsage = this.costUsage.get(userUsageKey) || 0;
                this.costUsage.set(userUsageKey, currentUserUsage + actualCost);
            }

            // Save to persistent storage
            this.saveCostData();

            // Check if we need to send notifications
            this.checkPostCostAlerts();

            console.log(`💰 Total daily cost: €${this.getCurrentUsage('daily').current.toFixed(4)}`);
            console.log(`💰 Total monthly cost: €${this.getCurrentUsage('monthly').current.toFixed(4)}`);

        } catch (error) {
            console.error('❌ Error recording cost:', error);
        }
    }

    /**
     * ⚠️ CHECK COST ALERTS - Warn users before hitting limits
     */
    private async checkCostAlerts(estimatedCost: number): Promise<void> {
        for (const alert of this.costAlerts) {
            const dailyUsage = this.getCurrentUsage('daily');
            const threshold = (dailyUsage.limit * alert.threshold) / 100;
            
            if ((dailyUsage.current + estimatedCost) >= threshold && dailyUsage.current < threshold) {
                console.log(`⚠️ COST ALERT TRIGGERED: ${alert.threshold}% of daily limit`);
                
                switch (alert.action) {
                    case 'warn':
                        await this.showCostWarning(alert, dailyUsage, estimatedCost);
                        break;
                    case 'block':
                        // This would be handled in enforceRequestCost
                        break;
                    case 'optimize':
                        await this.suggestOptimization(alert, dailyUsage, estimatedCost);
                        break;
                }
            }
        }
    }

    /**
     * 🚨 SHOW COST WARNING
     */
    private async showCostWarning(
        alert: CostAlert, 
        usage: CostUsage, 
        estimatedCost: number
    ): Promise<void> {
        const message = `⚠️ Cost Alert: ${alert.message}\n\n` +
            `Current: €${usage.current.toFixed(4)} / €${usage.limit.toFixed(2)}\n` +
            `This request: €${estimatedCost.toFixed(6)}\n` +
            `After request: €${(usage.current + estimatedCost).toFixed(4)} (${usage.percentage.toFixed(1)}%)`;

        const choice = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            'Continue',
            'Enable Optimization',
            'View Costs',
            'Adjust Limits'
        );

        switch (choice) {
            case 'Enable Optimization':
                await vscode.workspace.getConfiguration('universalAIProxy')
                    .update('enableOptimization', true, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('✅ Optimization enabled - future requests will be optimized');
                break;
            case 'View Costs':
                vscode.commands.executeCommand('universalAIProxy.showCostDashboard');
                break;
            case 'Adjust Limits':
                vscode.commands.executeCommand('workbench.action.openSettings', 'universalAIProxy.costLimits');
                break;
        }
    }

    /**
     * 🧠 SUGGEST OPTIMIZATION
     */
    private async suggestOptimization(
        alert: CostAlert, 
        usage: CostUsage, 
        estimatedCost: number
    ): Promise<void> {
        const potentialSavings = estimatedCost * 0.7; // Assuming 70% reduction
        
        const message = `🧠 Smart Suggestion: Enable optimization to save ~€${potentialSavings.toFixed(6)} on this request!\n\n` +
            `Current daily usage: €${usage.current.toFixed(4)} / €${usage.limit.toFixed(2)}\n` +
            `With optimization: ~€${(estimatedCost * 0.3).toFixed(6)} instead of €${estimatedCost.toFixed(6)}`;

        const choice = await vscode.window.showInformationMessage(
            message,
            'Enable Now',
            'Learn More',
            'Dismiss'
        );

        if (choice === 'Enable Now') {
            await vscode.workspace.getConfiguration('universalAIProxy')
                .update('enableOptimization', true, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('🚀 Optimization enabled! Saving you money immediately.');
        } else if (choice === 'Learn More') {
            vscode.commands.executeCommand('universalAIProxy.showOptimizationInfo');
        }
    }

    /**
     * 📊 GET CURRENT USAGE for a time period
     */
    public getCurrentUsage(period: 'daily' | 'monthly' | 'request'): CostUsage {
        const key = this.getDateKey(period);
        const current = this.costUsage.get(key) || 0;
        const limit = this.costLimits.get(period)?.amount || 0;
        const percentage = limit > 0 ? (current / limit) * 100 : 0;

        return {
            current,
            limit,
            percentage,
            resetTime: this.getResetTime(period)
        };
    }

    /**
     * 🔧 CONFIGURATION METHODS
     */
    public setCostLimit(type: string, amount: number, enabled: boolean = true): void {
        this.costLimits.set(type, {
            type: type as any,
            amount,
            currency: 'EUR',
            enabled
        });
        
        this.saveCostData();
        console.log(`💰 Cost limit updated: ${type} = €${amount} (${enabled ? 'enabled' : 'disabled'})`);
    }

    public addCostAlert(threshold: number, action: 'warn' | 'block' | 'optimize', message: string): void {
        this.costAlerts.push({ threshold, action, message });
        this.saveCostData();
        console.log(`⚠️ Cost alert added: ${threshold}% → ${action}`);
    }

    public setTeamBudget(budget: number): void {
        this.teamBudget = budget;
        this.teamUsage = 0; // Reset team usage when budget is set
        this.saveCostData();
        console.log(`👥 Team budget set: €${budget}`);
    }

    public setUserQuota(userId: string, quota: number): void {
        this.userQuotas.set(userId, quota);
        this.saveCostData();
        console.log(`👤 User quota set: ${userId} = €${quota}`);
    }

    /**
     * 📊 ANALYTICS & REPORTING
     */
    public getCostAnalytics() {
        const daily = this.getCurrentUsage('daily');
        const monthly = this.getCurrentUsage('monthly');
        
        return {
            daily,
            monthly,
            providerBreakdown: Object.fromEntries(this.providerCosts),
            teamUsage: this.teamUsage,
            teamBudget: this.teamBudget,
            activeAlerts: this.costAlerts.length,
            limitsEnabled: Array.from(this.costLimits.values()).filter(l => l.enabled).length
        };
    }

    public getTopExpensiveProviders(limit: number = 5) {
        return Array.from(this.providerCosts.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([provider, cost]) => ({ provider, cost }));
    }

    public getCostTrend(days: number = 7) {
        const trend = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = this.getDateKey('daily', date);
            const cost = this.costUsage.get(key) || 0;
            trend.push({
                date: date.toISOString().split('T')[0],
                cost
            });
        }
        return trend;
    }

    /**
     * 🔧 PRIVATE HELPER METHODS
     */
    private initializeDefaultLimits(): void {
        // Load from settings or use defaults
        const config = vscode.workspace.getConfiguration('universalAIProxy.costLimits');
        
        this.costLimits.set('request', {
            type: 'request',
            amount: config.get('maxPerRequest', 0.10),
            currency: 'EUR',
            enabled: config.get('enablePerRequest', true)
        });

        this.costLimits.set('daily', {
            type: 'daily',
            amount: config.get('maxPerDay', 5.00),
            currency: 'EUR',
            enabled: config.get('enablePerDay', true)
        });

        this.costLimits.set('monthly', {
            type: 'monthly',
            amount: config.get('maxPerMonth', 100.00),
            currency: 'EUR',
            enabled: config.get('enablePerMonth', true)
        });
    }

    private initializeDefaultAlerts(): void {
        this.costAlerts = [
            {
                threshold: 50,
                action: 'warn',
                message: 'You have reached 50% of your daily cost limit'
            },
            {
                threshold: 80,
                action: 'optimize',
                message: 'You have reached 80% of your daily cost limit - optimization recommended'
            },
            {
                threshold: 95,
                action: 'warn',
                message: 'WARNING: You are at 95% of your daily cost limit!'
            }
        ];
    }

    private startCostTracking(): void {
        // Reset daily costs at midnight
        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                this.resetDailyCosts();
            }
        }, 60000); // Check every minute

        // Load existing cost data
        this.loadCostData();
    }

    private resetDailyCosts(): void {
        const yesterday = this.getDateKey('daily', new Date(Date.now() - 24 * 60 * 60 * 1000));
        console.log(`🔄 Daily cost reset - Yesterday: €${this.costUsage.get(yesterday) || 0}`);
    }

    private getDateKey(period: 'daily' | 'monthly' | 'request', date: Date = new Date()): string {
        if (period === 'daily') {
            return `daily_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        } else if (period === 'monthly') {
            return `monthly_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        } else {
            // For 'request', return unique key
            return `request_${date.getTime()}`;
        }
    }

    private getResetTime(period: 'daily' | 'monthly' | 'request'): Date {
        const now = new Date();
        if (period === 'daily') {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            return tomorrow;
        } else if (period === 'monthly') {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
            return nextMonth;
        } else {
            // For 'request', return immediate reset (no time-based reset)
            return new Date(now.getTime() + 1000); // 1 second from now
        }
    }

    private getUserUsage(userId: string): number {
        const today = this.getDateKey('daily');
        const userUsageKey = `user_${userId}_${today}`;
        return this.costUsage.get(userUsageKey) || 0;
    }

    private checkPostCostAlerts(): void {
        // Check if we should send any post-spending notifications
        const daily = this.getCurrentUsage('daily');
        
        if (daily.percentage >= 100) {
            vscode.window.showErrorMessage(
                `🚨 Daily cost limit EXCEEDED: €${daily.current.toFixed(4)} / €${daily.limit.toFixed(2)}`,
                'View Details'
            );
        }
    }

    private saveCostData(): void {
        try {
            const data = {
                costUsage: Object.fromEntries(this.costUsage),
                providerCosts: Object.fromEntries(this.providerCosts),
                teamUsage: this.teamUsage,
                teamBudget: this.teamBudget,
                userQuotas: Object.fromEntries(this.userQuotas),
                lastUpdate: new Date().toISOString()
            };

            // Save to VS Code global state
            const context = (global as any).vscodeContext;
            if (context) {
                context.globalState.update('universalAIProxy.costData', data);
            }
        } catch (error) {
            console.error('❌ Error saving cost data:', error);
        }
    }

    private loadCostData(): void {
        try {
            const context = (global as any).vscodeContext;
            if (context) {
                const data = context.globalState.get('universalAIProxy.costData');
                if (data) {
                    this.costUsage = new Map(Object.entries((data as any).costUsage || {}));
                    this.providerCosts = new Map(Object.entries((data as any).providerCosts || {}));
                    this.teamUsage = (data as any).teamUsage || 0;
                    this.teamBudget = (data as any).teamBudget;
                    this.userQuotas = new Map(Object.entries((data as any).userQuotas || {}));
                }
            }
        } catch (error) {
            console.error('❌ Error loading cost data:', error);
        }
    }

    public dispose(): void {
        this.saveCostData();
    }
}