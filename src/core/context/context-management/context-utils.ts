import { ContextMessage, ExtensionConfig } from '../../../shared/types';
import { TokenManager } from './token-manager';

export class ContextUtils {
  private static tokenManager = TokenManager.getInstance();

  /**
   * Prepares messages for API request, ensuring they fit within token limits
   */
  public static prepareContext(
    messages: ContextMessage[], 
    maxTokens: number,
    config: ExtensionConfig
  ): ContextMessage[] {
    const preserveSystem = config.tokenManagement?.preserveSystemPrompt ?? true;
    
    // Separate system and non-system messages
    const systemMessages = preserveSystem 
      ? messages.filter(m => m.role === 'system')
      : [];
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    
    // Calculate available tokens for non-system messages
    const systemTokens = systemMessages.reduce((sum, m) => sum + m.tokens, 0);
    const availableTokens = maxTokens - systemTokens;
    
    // Select messages that fit within token limit
    const selectedMessages: ContextMessage[] = [];
    let usedTokens = 0;
    
    // Iterate from newest to oldest
    for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
      const message = nonSystemMessages[i];
      if (usedTokens + message.tokens <= availableTokens) {
        selectedMessages.unshift(message);
        usedTokens += message.tokens;
      }
    }
    
    return [...systemMessages, ...selectedMessages];
  }

  /**
   * Truncates a message to fit within token limit
   */
  public static truncateMessage(
    message: ContextMessage, 
    maxTokens: number
  ): ContextMessage {
    if (message.tokens <= maxTokens) {
      return message;
    }
    
    // Simple character-based truncation (approximate)
    const ratio = maxTokens / message.tokens;
    const truncatedLength = Math.floor(message.content.length * ratio * 0.9); // 90% to be safe
    
    return {
      ...message,
      content: message.content.substring(0, truncatedLength) + '...[truncated]',
      tokens: maxTokens
    };
  }

  /**
   * Merges consecutive messages from the same role
   */
  public static mergeConsecutiveMessages(messages: ContextMessage[]): ContextMessage[] {
    if (messages.length === 0) return [];
    
    const merged: ContextMessage[] = [];
    let current = { ...messages[0] };
    
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === current.role) {
        current.content += '\n\n' + messages[i].content;
        current.tokens += messages[i].tokens;
      } else {
        merged.push(current);
        current = { ...messages[i] };
      }
    }
    
    merged.push(current);
    return merged;
  }

  /**
   * Estimates token count for a message (simplified)
   */
  public static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Creates a context summary for display
   */
  public static createContextSummary(messages: ContextMessage[]): string {
    const totalTokens = messages.reduce((sum, m) => sum + m.tokens, 0);
    const messageCount = messages.length;
    const roles = messages.reduce((acc, m) => {
      acc[m.role] = (acc[m.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return `Context: ${messageCount} messages, ${totalTokens} tokens\n` +
           `Breakdown: ${JSON.stringify(roles)}`;
  }

  /**
   * Formats messages for export
   */
  public static formatMessagesForExport(messages: ContextMessage[]): string {
    return messages.map(m => 
      `[${new Date(m.timestamp).toISOString()}] ${m.role.toUpperCase()}:\n${m.content}\n`
    ).join('\n---\n');
  }

  /**
   * Validates context window constraints
   */
  public static validateContextWindow(
    messages: ContextMessage[], 
    maxTokens: number
  ): { isValid: boolean; totalTokens: number; overflow: number } {
    const totalTokens = messages.reduce((sum, m) => sum + m.tokens, 0);
    
    return {
      isValid: totalTokens <= maxTokens,
      totalTokens,
      overflow: Math.max(0, totalTokens - maxTokens)
    };
  }
}