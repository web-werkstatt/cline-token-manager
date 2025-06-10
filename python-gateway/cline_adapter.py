#!/usr/bin/env python3
"""
🚀 Cline Adapter - Universal Context Gateway

CRITICAL INTEGRATION: Parse Cline's api_conversation_history.json format
Implements real-world solution for 165k+ token cache explosion problem

Based on research from:
- Cline storage location: ~/.vscode/extensions/.../tasks/*/api_conversation_history.json
- Cache explosion pattern: 2k → 24k → 165k tokens per session
- Real user reports: 4-5M tokens in single sessions

Technical Implementation:
- Parses Cline's specific conversation format
- Extracts Claude API request/response patterns  
- Preserves conversation threading and context
- Integrates with UniversalOptimizationEngine

Business Impact: Direct solution for Cline's #1 user pain point
"""

import json
import os
import glob
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
import re
from pathlib import Path

from optimization_engine import ConversationMessage, ConversationContext, UniversalOptimizationEngine

@dataclass
class ClineTask:
    """Represents a Cline task with conversation history"""
    task_id: str
    task_path: str
    conversation_history: List[Dict[str, Any]]
    total_tokens: int
    created_at: Optional[datetime] = None
    last_modified: Optional[datetime] = None

class ClineStorageLocator:
    """
    Locates Cline storage across different platforms and configurations
    Handles the complexity of VS Code extension storage locations
    """
    
    @staticmethod
    def find_cline_storage_paths() -> List[str]:
        """Find all possible Cline storage locations on current system"""
        
        possible_paths = []
        home = Path.home()
        
        # Windows paths
        if os.name == 'nt':
            possible_paths.extend([
                home / "AppData" / "Roaming" / "Code" / "User" / "globalStorage" / "saoudrizwan.claude-dev",
                home / "AppData" / "Roaming" / "Code - Insiders" / "User" / "globalStorage" / "saoudrizwan.claude-dev",
                home / ".vscode" / "extensions" / "saoudrizwan.claude-dev-*",
            ])
        
        # macOS paths  
        elif os.name == 'posix' and 'Darwin' in os.uname().sysname:
            possible_paths.extend([
                home / "Library" / "Application Support" / "Code" / "User" / "globalStorage" / "saoudrizwan.claude-dev",
                home / "Library" / "Application Support" / "Code - Insiders" / "User" / "globalStorage" / "saoudrizwan.claude-dev",
                home / ".vscode" / "extensions" / "saoudrizwan.claude-dev-*",
            ])
        
        # Linux paths
        else:
            possible_paths.extend([
                home / ".config" / "Code" / "User" / "globalStorage" / "saoudrizwan.claude-dev",
                home / ".config" / "Code - Insiders" / "User" / "globalStorage" / "saoudrizwan.claude-dev", 
                home / ".vscode" / "extensions" / "saoudrizwan.claude-dev-*",
            ])
        
        # Check which paths actually exist
        existing_paths = []
        for path in possible_paths:
            if '*' in str(path):
                # Handle glob patterns
                matching_paths = glob.glob(str(path))
                existing_paths.extend([p for p in matching_paths if os.path.isdir(p)])
            elif path.exists() and path.is_dir():
                existing_paths.append(str(path))
        
        return existing_paths
    
    @staticmethod
    def find_task_directories(storage_paths: List[str]) -> List[str]:
        """Find all task directories containing conversation history"""
        
        task_dirs = []
        
        for storage_path in storage_paths:
            # Look for tasks subdirectory
            tasks_path = Path(storage_path) / "tasks"
            if tasks_path.exists():
                # Find all task directories (typically UUID-named)
                for task_dir in tasks_path.iterdir():
                    if task_dir.is_dir():
                        # Check if it contains api_conversation_history.json
                        history_file = task_dir / "api_conversation_history.json"
                        if history_file.exists():
                            task_dirs.append(str(task_dir))
        
        return task_dirs

class ClineConversationParser:
    """
    Parses Cline's specific conversation format from api_conversation_history.json
    Handles the complexity of Claude API request/response structure
    """
    
    def __init__(self):
        self.known_system_prompts = [
            "You are Cline",
            "You are Claude",
            "Assistant is Claude",
            "system instructions",
            "You are an AI assistant"
        ]
    
    def parse_conversation_file(self, file_path: str) -> Optional[ClineTask]:
        """Parse a single api_conversation_history.json file"""
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract task information
            task_dir = Path(file_path).parent
            task_id = task_dir.name
            
            # Parse conversation history
            conversation_history = data if isinstance(data, list) else []
            
            # Calculate total tokens
            total_tokens = self._estimate_total_tokens(conversation_history)
            
            # Get file timestamps
            file_stat = os.stat(file_path)
            created_at = datetime.fromtimestamp(file_stat.st_ctime)
            last_modified = datetime.fromtimestamp(file_stat.st_mtime)
            
            return ClineTask(
                task_id=task_id,
                task_path=str(task_dir),
                conversation_history=conversation_history,
                total_tokens=total_tokens,
                created_at=created_at,
                last_modified=last_modified
            )
            
        except Exception as e:
            print(f"⚠️ Error parsing {file_path}: {e}")
            return None
    
    def _estimate_total_tokens(self, conversation_history: List[Dict[str, Any]]) -> int:
        """Estimate total token count for conversation"""
        
        total_chars = 0
        
        for message in conversation_history:
            if isinstance(message, dict) and 'content' in message:
                content = message['content']
                if isinstance(content, str):
                    total_chars += len(content)
                elif isinstance(content, list):
                    # Handle multi-part content (text + images)
                    for part in content:
                        if isinstance(part, dict) and 'text' in part:
                            total_chars += len(part['text'])
        
        # Rough estimation: 4 characters per token
        return total_chars // 4
    
    def convert_to_universal_format(self, cline_task: ClineTask) -> ConversationContext:
        """Convert Cline task to universal conversation format"""
        
        messages = []
        
        for i, message in enumerate(cline_task.conversation_history):
            # Parse message based on Cline's format
            if not isinstance(message, dict):
                continue
            
            # Extract role (user, assistant, system)
            role = self._extract_role(message)
            
            # Extract content (handling multi-part content)
            content = self._extract_content(message)
            
            # Skip empty messages
            if not content.strip():
                continue
            
            # Estimate tokens for this message
            tokens = len(content) // 4
            
            # Detect message type
            message_type = self._detect_message_type(content, role)
            
            # Create universal message
            universal_message = ConversationMessage(
                role=role,
                content=content,
                timestamp=cline_task.last_modified,  # Use task timestamp for all messages
                tokens=tokens,
                relevance_score=None,  # Will be calculated during optimization
                message_type=message_type
            )
            
            messages.append(universal_message)
        
        return ConversationContext(
            messages=messages,
            total_tokens=sum(msg.tokens or 0 for msg in messages),
            source_tool="cline",
            session_id=cline_task.task_id,
            created_at=cline_task.created_at,
            last_modified=cline_task.last_modified,
            metadata={
                "task_path": cline_task.task_path,
                "original_message_count": len(cline_task.conversation_history),
                "cline_format_version": self._detect_format_version(cline_task.conversation_history)
            }
        )
    
    def _extract_role(self, message: Dict[str, Any]) -> str:
        """Extract role from Cline message format"""
        
        if 'role' in message:
            role = message['role'].lower()
            if role in ['user', 'assistant', 'system']:
                return role
        
        # Fallback: detect based on content patterns
        content = self._extract_content(message)
        if any(prompt in content for prompt in self.known_system_prompts):
            return 'system'
        
        # Default to assistant if unclear
        return 'assistant'
    
    def _extract_content(self, message: Dict[str, Any]) -> str:
        """Extract content from Cline message format (handles multi-part content)"""
        
        if 'content' not in message:
            return ""
        
        content = message['content']
        
        # Simple string content
        if isinstance(content, str):
            return content
        
        # Multi-part content (text + images/files)
        elif isinstance(content, list):
            text_parts = []
            
            for part in content:
                if isinstance(part, dict):
                    if 'text' in part:
                        text_parts.append(part['text'])
                    elif 'type' in part and part['type'] == 'text' and 'text' in part:
                        text_parts.append(part['text'])
                    elif 'type' in part and part['type'] == 'image':
                        text_parts.append("[Image content]")
                    elif 'type' in part and part['type'] == 'tool_use':
                        tool_name = part.get('name', 'unknown_tool')
                        text_parts.append(f"[Tool: {tool_name}]")
                    elif 'type' in part and part['type'] == 'tool_result':
                        text_parts.append("[Tool result]")
                elif isinstance(part, str):
                    text_parts.append(part)
            
            return '\n'.join(text_parts)
        
        # Fallback: convert to string
        return str(content)
    
    def _detect_message_type(self, content: str, role: str) -> str:
        """Detect message type based on content analysis"""
        
        content_lower = content.lower()
        
        # System prompts
        if role == 'system':
            return 'system'
        
        # Code-related content
        if ('```' in content or 
            any(keyword in content_lower for keyword in ['function', 'def ', 'class ', 'import ', 'const ', 'let ', 'var '])):
            return 'code'
        
        # User questions
        if role == 'user' and ('?' in content or 
            any(content_lower.startswith(q) for q in ['how', 'what', 'why', 'when', 'where', 'can you', 'could you'])):
            return 'question'
        
        # Tool usage
        if '[Tool:' in content or 'tool_use' in content_lower:
            return 'tool'
        
        # Default response
        return 'response'
    
    def _detect_format_version(self, conversation_history: List[Dict[str, Any]]) -> str:
        """Detect Cline conversation format version"""
        
        if not conversation_history:
            return "unknown"
        
        sample_message = conversation_history[0]
        
        # Check for new format features
        if isinstance(sample_message.get('content'), list):
            return "v2.0+"  # Multi-part content support
        elif 'role' in sample_message and 'content' in sample_message:
            return "v1.0+"  # Basic format
        else:
            return "legacy"

class ClineIntegration:
    """
    Main integration class that combines Cline parsing with universal optimization
    Provides the complete solution for Cline's cache explosion problem
    """
    
    def __init__(self):
        self.storage_locator = ClineStorageLocator()
        self.parser = ClineConversationParser()
        self.optimizer = UniversalOptimizationEngine()
    
    def discover_cline_tasks(self) -> List[ClineTask]:
        """Discover all Cline tasks on the current system"""
        
        print("🔍 Discovering Cline storage locations...")
        storage_paths = self.storage_locator.find_cline_storage_paths()
        
        if not storage_paths:
            print("❌ No Cline storage locations found. Is Cline installed?")
            return []
        
        print(f"✅ Found {len(storage_paths)} storage location(s):")
        for path in storage_paths:
            print(f"  📁 {path}")
        
        print("\n🔍 Discovering task directories...")
        task_dirs = self.storage_locator.find_task_directories(storage_paths)
        
        if not task_dirs:
            print("❌ No task directories found. No active Cline conversations?")
            return []
        
        print(f"✅ Found {len(task_dirs)} task director(ies)")
        
        # Parse all tasks
        tasks = []
        for task_dir in task_dirs:
            history_file = Path(task_dir) / "api_conversation_history.json"
            task = self.parser.parse_conversation_file(str(history_file))
            if task:
                tasks.append(task)
        
        # Sort by last modified (most recent first)
        tasks.sort(key=lambda t: t.last_modified or datetime.min, reverse=True)
        
        return tasks
    
    async def optimize_cline_task(self, task: ClineTask, max_tokens: int = 20000, strategy: str = 'hybrid') -> Dict[str, Any]:
        """Optimize a specific Cline task conversation"""
        
        print(f"🚀 Optimizing Cline task: {task.task_id}")
        print(f"📊 Original: {len(task.conversation_history)} messages, ~{task.total_tokens} tokens")
        
        # Convert to universal format
        context = self.parser.convert_to_universal_format(task)
        
        # Perform optimization
        result = await self.optimizer.optimize_context(context, max_tokens, strategy)
        
        print(f"✅ Optimized: {len(result.optimized_messages)} messages, {result.optimized_tokens} tokens")
        print(f"💰 Reduction: {result.reduction_percentage:.1f}% ({result.original_tokens - result.optimized_tokens} tokens saved)")
        
        # Calculate cost savings (Claude Sonnet pricing)
        original_cost = result.original_tokens * 0.000003  # $3 per 1M input tokens
        optimized_cost = result.optimized_tokens * 0.000003
        cost_savings = original_cost - optimized_cost
        
        return {
            'task': task,
            'optimization_result': result,
            'cost_savings': {
                'original_cost': original_cost,
                'optimized_cost': optimized_cost, 
                'savings_amount': cost_savings,
                'savings_percentage': (cost_savings / original_cost * 100) if original_cost > 0 else 0
            },
            'performance_metrics': {
                'processing_time': result.processing_time,
                'quality_score': result.quality_score,
                'strategy_used': result.strategy_used
            }
        }
    
    async def optimize_all_tasks(self, max_tokens: int = 20000, strategy: str = 'hybrid') -> Dict[str, Any]:
        """Optimize all discovered Cline tasks"""
        
        tasks = self.discover_cline_tasks()
        
        if not tasks:
            return {'error': 'No Cline tasks found'}
        
        print(f"\n🚀 Optimizing {len(tasks)} Cline task(s)...")
        
        results = []
        total_original_tokens = 0
        total_optimized_tokens = 0
        total_cost_savings = 0
        
        for task in tasks:
            optimization_result = await self.optimize_cline_task(task, max_tokens, strategy)
            results.append(optimization_result)
            
            total_original_tokens += optimization_result['optimization_result'].original_tokens
            total_optimized_tokens += optimization_result['optimization_result'].optimized_tokens
            total_cost_savings += optimization_result['cost_savings']['savings_amount']
        
        overall_reduction = ((total_original_tokens - total_optimized_tokens) / total_original_tokens * 100) if total_original_tokens > 0 else 0
        
        summary = {
            'total_tasks': len(tasks),
            'individual_results': results,
            'overall_metrics': {
                'total_original_tokens': total_original_tokens,
                'total_optimized_tokens': total_optimized_tokens,
                'overall_reduction_percentage': overall_reduction,
                'total_cost_savings': total_cost_savings,
                'monthly_projected_savings': total_cost_savings * 30  # Assuming daily usage
            }
        }
        
        print(f"\n📈 Overall Results:")
        print(f"💾 Total tokens: {total_original_tokens} → {total_optimized_tokens} ({overall_reduction:.1f}% reduction)")
        print(f"💰 Cost savings: ${total_cost_savings:.4f} per session")
        print(f"📅 Monthly projected savings: ${total_cost_savings * 30:.2f}")
        
        return summary
    
    def export_optimized_conversation(self, optimization_result: Dict[str, Any], output_path: str):
        """Export optimized conversation back to Cline format"""
        
        optimized_messages = optimization_result['optimization_result'].optimized_messages
        
        # Convert back to Cline format
        cline_format = []
        for msg in optimized_messages:
            cline_message = {
                'role': msg.role,
                'content': msg.content
            }
            # Add timestamp if available
            if msg.timestamp:
                cline_message['timestamp'] = msg.timestamp.isoformat()
            
            cline_format.append(cline_message)
        
        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(cline_format, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Optimized conversation exported to: {output_path}")

# Example usage and testing
if __name__ == "__main__":
    async def main():
        print("🚀 Cline Universal Context Optimizer - Testing")
        print("=" * 60)
        
        # Initialize integration
        integration = ClineIntegration()
        
        # Discover and optimize all tasks
        try:
            results = await integration.optimize_all_tasks(max_tokens=15000, strategy='hybrid')
            
            if 'error' in results:
                print(f"❌ {results['error']}")
                return
            
            # Display detailed results
            print(f"\n📊 Detailed Results:")
            for i, result in enumerate(results['individual_results']):
                task = result['task']
                opt_result = result['optimization_result']
                cost_savings = result['cost_savings']
                
                print(f"\n📁 Task {i+1}: {task.task_id}")
                print(f"   📅 Last modified: {task.last_modified}")
                print(f"   📊 Messages: {len(task.conversation_history)} → {len(opt_result.optimized_messages)}")
                print(f"   🎯 Tokens: {opt_result.original_tokens} → {opt_result.optimized_tokens} ({opt_result.reduction_percentage:.1f}%)")
                print(f"   💰 Cost: ${cost_savings['original_cost']:.4f} → ${cost_savings['optimized_cost']:.4f} (${cost_savings['savings_amount']:.4f} saved)")
                print(f"   ⭐ Quality: {opt_result.quality_score:.2f}/1.0")
            
            # Export sample optimized conversation
            if results['individual_results']:
                sample_result = results['individual_results'][0]
                export_path = "optimized_conversation_sample.json"
                integration.export_optimized_conversation(sample_result, export_path)
        
        except Exception as e:
            print(f"❌ Error during optimization: {e}")
            import traceback
            traceback.print_exc()
    
    # Run the test
    import asyncio
    asyncio.run(main())