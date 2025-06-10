#!/usr/bin/env python3
"""
🔗 Bridge Optimizer - TypeScript ↔ Python Integration

Vereinfachtes Interface für die TypeScript Extension
Standardisierte Ein-/Ausgabe für Cross-Language Communication
"""

import json
import sys
import asyncio
import traceback
from datetime import datetime
from typing import Dict, List, Any, Optional

# Import our optimization engine
from optimization_engine import (
    UniversalOptimizationEngine, 
    ConversationMessage, 
    ConversationContext
)

class BridgeOptimizer:
    """
    Wrapper für UniversalOptimizationEngine mit standardisierter Bridge-API
    """
    
    def __init__(self):
        self.engine = UniversalOptimizationEngine()
    
    def parse_request(self, request_data: Dict[str, Any]) -> ConversationContext:
        """Parse TypeScript request format to Python format"""
        
        messages = []
        for msg_data in request_data.get('messages', []):
            # Parse timestamp
            timestamp = None
            if 'timestamp' in msg_data and msg_data['timestamp']:
                try:
                    # Handle ISO format from TypeScript
                    timestamp_str = msg_data['timestamp']
                    if timestamp_str.endswith('Z'):
                        timestamp_str = timestamp_str[:-1] + '+00:00'
                    timestamp = datetime.fromisoformat(timestamp_str)
                except Exception:
                    timestamp = datetime.now()
            
            message = ConversationMessage(
                role=msg_data.get('role', 'user'),
                content=msg_data.get('content', ''),
                timestamp=timestamp,
                message_type=msg_data.get('message_type', 'response')
            )
            messages.append(message)
        
        return ConversationContext(
            messages=messages,
            total_tokens=sum(len(msg.content) // 4 for msg in messages),
            source_tool="typescript_bridge",
            session_id=request_data.get('session_id', 'bridge_session'),
            created_at=datetime.now()
        )
    
    def format_response(self, result, success: bool = True, error: str = None) -> Dict[str, Any]:
        """Format Python result to TypeScript-compatible format"""
        
        if not success:
            return {
                "success": False,
                "error": error or "Unknown error",
                "original_tokens": 0,
                "optimized_tokens": 0,
                "reduction_percentage": 0,
                "quality_score": 0,
                "processing_time": 0,
                "strategy_used": "error",
                "optimized_messages": []
            }
        
        return {
            "success": True,
            "original_tokens": result.original_tokens,
            "optimized_tokens": result.optimized_tokens,
            "reduction_percentage": result.reduction_percentage,
            "quality_score": result.quality_score,
            "processing_time": result.processing_time * 1000,  # Convert to ms
            "strategy_used": result.strategy_used,
            "optimization_details": result.optimization_details,
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
    
    async def optimize(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Main optimization method"""
        
        try:
            # Parse request
            context = self.parse_request(request_data)
            
            # Extract parameters
            max_tokens = request_data.get('max_tokens', 20000)
            strategy = request_data.get('strategy', 'hybrid')
            preserve_quality = request_data.get('preserve_quality', True)
            
            # Run optimization
            result = await self.engine.optimize_context(
                context=context,
                max_tokens=max_tokens,
                strategy=strategy,
                preserve_quality=preserve_quality
            )
            
            return self.format_response(result, success=True)
            
        except Exception as e:
            error_msg = f"Optimization failed: {str(e)}"
            traceback.print_exc()
            return self.format_response(None, success=False, error=error_msg)
    
    def get_engine_info(self) -> Dict[str, Any]:
        """Get information about the optimization engine"""
        
        try:
            strategies = self.engine.get_available_strategies()
            
            return {
                "success": True,
                "available_strategies": strategies,
                "default_strategy": self.engine.default_strategy,
                "version": "1.0.0",
                "capabilities": [
                    "statistical_optimization",
                    "hybrid_optimization", 
                    "conversation_flow_preservation",
                    "code_context_intelligence",
                    "multi_language_support"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get engine info: {str(e)}"
            }

# CLI Interface für TypeScript Bridge
async def main():
    """Main CLI interface for TypeScript integration"""
    
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python bridge_optimizer.py <command> [args]"
        }))
        return
    
    command = sys.argv[1]
    bridge = BridgeOptimizer()
    
    try:
        if command == "info":
            # Get engine information
            result = bridge.get_engine_info()
            print(json.dumps(result))
            
        elif command == "optimize":
            # Optimization request
            if len(sys.argv) < 3:
                print(json.dumps({
                    "success": False,
                    "error": "Usage: python bridge_optimizer.py optimize <json_request>"
                }))
                return
            
            # Parse JSON request from command line
            request_json = sys.argv[2]
            request_data = json.loads(request_json)
            
            # Run optimization
            result = await bridge.optimize(request_data)
            print(json.dumps(result))
            
        elif command == "test":
            # Test optimization with sample data
            test_request = {
                "messages": [
                    {
                        "role": "user",
                        "content": "Can you help me create a React component?",
                        "timestamp": datetime.now().isoformat(),
                        "message_type": "question"
                    },
                    {
                        "role": "assistant",
                        "content": """I'll help you create a React component. Here's a basic example:

```jsx
import React, { useState } from 'react';

const ExampleComponent = ({ title }) => {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
};

export default ExampleComponent;
```

This component demonstrates:
- Props usage with title
- State management with useState hook
- Event handling with onClick
- JSX rendering

Would you like me to explain any specific part or add more features?""",
                        "timestamp": datetime.now().isoformat(),
                        "message_type": "code"
                    }
                ],
                "max_tokens": 1000,
                "strategy": "hybrid",
                "preserve_quality": True
            }
            
            result = await bridge.optimize(test_request)
            print(json.dumps(result, indent=2))
            
        else:
            print(json.dumps({
                "success": False,
                "error": f"Unknown command: {command}. Available: info, optimize, test"
            }))
            
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Bridge error: {str(e)}"
        }))
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())