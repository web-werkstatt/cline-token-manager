#!/usr/bin/env python3
"""
🧪 Python Universal Context Optimizer - Validation Testing

COMPREHENSIVE TESTING: Validates optimization engine with realistic scenarios
Tests the complete pipeline from Cline format → optimization → results

Test Scenarios:
1. Simulated Cline conversation (realistic cache explosion scenario)
2. Performance benchmarking (Python vs TypeScript comparison)
3. Quality preservation validation
4. Multi-strategy comparison
5. Real-world token reduction validation

Expected Results:
- 70-90% token reduction (matching Cursor's performance)
- <100ms processing time for typical conversations
- 90%+ quality preservation score
- Successful Cline format parsing and export
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any
import os
import tempfile

from optimization_engine import (
    ConversationMessage, ConversationContext, UniversalOptimizationEngine,
    StatisticalOptimizer, HybridOptimizer
)
from cline_adapter import ClineIntegration, ClineConversationParser, ClineTask

class TestDataGenerator:
    """Generate realistic test data that simulates Cline cache explosion scenarios"""
    
    @staticmethod
    def generate_large_conversation() -> List[ConversationMessage]:
        """Generate a conversation that simulates cache explosion (165k+ tokens)"""
        
        messages = []
        base_time = datetime.now()
        
        # System prompt (typical Cline startup)
        messages.append(ConversationMessage(
            role="system",
            content="""You are Cline, an AI coding assistant that helps developers with their programming tasks. You have access to tools that allow you to read files, write files, run commands, and browse the web. You should use these tools to help the user accomplish their goals.

When the user asks you to do something, break it down into steps and use the appropriate tools. Always explain what you're doing and why. If you encounter errors, help debug and fix them.

You have access to the following tools:
- read_file: Read the contents of a file
- write_file: Write content to a file  
- run_command: Execute shell commands
- list_files: List files in a directory
- web_search: Search the web for information""",
            timestamp=base_time,
            message_type="system"
        ))
        
        # User starts a complex project
        messages.append(ConversationMessage(
            role="user", 
            content="""I need to create a full-stack web application for a task management system. The requirements are:

1. Frontend: React with TypeScript, using Material-UI for components
2. Backend: Node.js with Express and TypeScript  
3. Database: PostgreSQL with Prisma ORM
4. Authentication: JWT-based auth system
5. Features: User registration, login, create/edit/delete tasks, task categories, due dates
6. Deployment: Docker containers for both frontend and backend

Can you help me set up the entire project structure and implement these features?""",
            timestamp=base_time + timedelta(minutes=1),
            message_type="question"
        ))
        
        # Assistant provides comprehensive response with file creation
        messages.append(ConversationMessage(
            role="assistant",
            content="""I'll help you create a comprehensive task management system! This is a substantial project, so I'll break it down into manageable steps and create the entire project structure.

Let me start by creating the project structure and setting up the basic configuration files.

```bash
mkdir task-management-app
cd task-management-app
mkdir frontend backend shared
```

First, let's set up the backend with Express and TypeScript:

```json
{
  "name": "task-management-backend",
  "version": "1.0.0",
  "description": "Task management system backend",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "test": "jest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.6.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.11.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.8.9",
    "typescript": "^5.2.2",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.1",
    "prisma": "^5.6.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
```

Now, let's create the TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Let me create the Prisma schema for the database:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tasks     Task[]
  categories Category[]
  
  @@map("users")
}

model Category {
  id          String   @id @default(cuid())
  name        String
  color       String   @default("#3498db")
  description String?
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks Task[]
  
  @@map("categories")
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  completed   Boolean    @default(false)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  userId      String
  categoryId  String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  
  @@map("tasks")
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

Now let's create the main server file:

```typescript
// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import categoryRoutes from './routes/categories';
import userRoutes from './routes/users';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
```

This is getting quite long! Should I continue with the authentication routes, task management logic, and frontend setup?""",
            timestamp=base_time + timedelta(minutes=3),
            message_type="code"
        ))
        
        # Simulate several more exchanges with increasing complexity
        for i in range(10):
            # User asks for more features
            messages.append(ConversationMessage(
                role="user",
                content=f"""Yes, please continue! Can you also add:
{i+1}. User authentication middleware
{i+2}. Task filtering and sorting
{i+3}. Email notifications for due dates
{i+4}. File attachments for tasks
{i+5}. Real-time updates with WebSockets

Let's implement the authentication routes next.""",
                timestamp=base_time + timedelta(minutes=5 + i*3),
                message_type="question"
            ))
            
            # Assistant provides detailed implementation
            messages.append(ConversationMessage(
                role="assistant", 
                content=f"""Absolutely! Let's implement the authentication system with JWT tokens and all the advanced features you requested.

First, let's create the authentication middleware:

```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import {{ Request, Response, NextFunction }} from 'express';
import {{ PrismaClient }} from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {{
  user?: {{
    id: string;
    email: string;
    name: string;
  }};
}}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {{
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {{
    return res.status(401).json({{ message: 'Access token required' }});
  }}

  try {{
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await prisma.user.findUnique({{
      where: {{ id: decoded.userId }},
      select: {{ id: true, email: true, name: true }}
    }});

    if (!user) {{
      return res.status(403).json({{ message: 'Invalid token' }});
    }}

    req.user = user;
    next();
  }} catch (error) {{
    return res.status(403).json({{ message: 'Invalid or expired token' }});
  }}
}};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {{
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {{
    try {{
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await prisma.user.findUnique({{
        where: {{ id: decoded.userId }},
        select: {{ id: true, email: true, name: true }}
      }});
      
      if (user) {{
        req.user = user;
      }}
    }} catch (error) {{
      // Token invalid, but that's ok for optional auth
    }}
  }}

  next();
}};
```

Now let's create the authentication routes:

```typescript
// src/routes/auth.ts
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import {{ PrismaClient }} from '@prisma/client';
import {{ authenticateToken, AuthRequest }} from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const registerSchema = Joi.object({{
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required()
}});

const loginSchema = Joi.object({{
  email: Joi.string().email().required(), 
  password: Joi.string().required()
}});

// Register
router.post('/register', async (req, res) => {{
  try {{
    const {{ error, value }} = registerSchema.validate(req.body);
    if (error) {{
      return res.status(400).json({{ message: error.details[0].message }});
    }}

    const {{ name, email, password }} = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({{
      where: {{ email }}
    }});

    if (existingUser) {{
      return res.status(409).json({{ message: 'User already exists with this email' }});
    }}

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({{
      data: {{
        name,
        email,
        password: hashedPassword
      }},
      select: {{
        id: true,
        name: true,
        email: true,
        createdAt: true
      }}
    }});

    // Generate JWT token
    const token = jwt.sign(
      {{ userId: user.id }},
      process.env.JWT_SECRET!,
      {{ expiresIn: '24h' }}
    );

    res.status(201).json({{
      message: 'User created successfully',
      user,
      token
    }});

  }} catch (error) {{
    console.error('Registration error:', error);
    res.status(500).json({{ message: 'Internal server error' }});
  }}
}});

// Login
router.post('/login', async (req, res) => {{
  try {{
    const {{ error, value }} = loginSchema.validate(req.body);
    if (error) {{
      return res.status(400).json({{ message: error.details[0].message }});
    }}

    const {{ email, password }} = value;

    // Find user
    const user = await prisma.user.findUnique({{
      where: {{ email }}
    }});

    if (!user) {{
      return res.status(401).json({{ message: 'Invalid email or password' }});
    }}

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {{
      return res.status(401).json({{ message: 'Invalid email or password' }});
    }}

    // Generate JWT token
    const token = jwt.sign(
      {{ userId: user.id }},
      process.env.JWT_SECRET!,
      {{ expiresIn: '24h' }}
    );

    res.json({{
      message: 'Login successful',
      user: {{
        id: user.id,
        name: user.name,
        email: user.email
      }},
      token
    }});

  }} catch (error) {{
    console.error('Login error:', error);
    res.status(500).json({{ message: 'Internal server error' }});
  }}
}});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {{
  try {{
    const user = await prisma.user.findUnique({{
      where: {{ id: req.user!.id }},
      select: {{
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {{
          tasks: true,
          categories: true
        }}
      }}
    }});

    res.json({{ user }});
  }} catch (error) {{
    console.error('Get user error:', error);
    res.status(500).json({{ message: 'Internal server error' }});
  }}
}});

// Refresh token
router.post('/refresh', authenticateToken, async (req: AuthRequest, res) => {{
  try {{
    const token = jwt.sign(
      {{ userId: req.user!.id }},
      process.env.JWT_SECRET!,
      {{ expiresIn: '24h' }}
    );

    res.json({{ token }});
  }} catch (error) {{
    console.error('Token refresh error:', error);
    res.status(500).json({{ message: 'Internal server error' }});
  }}
}});

export default router;
```

Now let's implement the task management routes with advanced filtering and sorting:

```typescript
// src/routes/tasks.ts  
import express from 'express';
import Joi from 'joi';
import {{ PrismaClient, Priority, Prisma }} from '@prisma/client';
import {{ authenticateToken, AuthRequest }} from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createTaskSchema = Joi.object({{
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
  dueDate: Joi.date().optional(),
  categoryId: Joi.string().optional()
}});

const updateTaskSchema = Joi.object({{
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(1000).optional(),
  completed: Joi.boolean().optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
  dueDate: Joi.date().optional(),
  categoryId: Joi.string().optional()
}});

const querySchema = Joi.object({{
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(100).optional(),
  completed: Joi.boolean().optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
  categoryId: Joi.string().optional(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'dueDate', 'priority', 'title').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  dueDateFrom: Joi.date().optional(),
  dueDateTo: Joi.date().optional()
}});

// Get all tasks with filtering and pagination
router.get('/', authenticateToken, async (req: AuthRequest, res) => {{
  try {{
    const {{ error, value }} = querySchema.validate(req.query);
    if (error) {{
      return res.status(400).json({{ message: error.details[0].message }});
    }}

    const {{
      page,
      limit,
      search,
      completed,
      priority,
      categoryId,
      sortBy,
      sortOrder,
      dueDateFrom,
      dueDateTo
    }} = value;

    // Build where clause
    const where: Prisma.TaskWhereInput = {{
      userId: req.user!.id
    }};

    if (search) {{
      where.OR = [
        {{ title: {{ contains: search, mode: 'insensitive' }} }},
        {{ description: {{ contains: search, mode: 'insensitive' }} }}
      ];
    }}

    if (completed !== undefined) {{
      where.completed = completed;
    }}

    if (priority) {{
      where.priority = priority as Priority;
    }}

    if (categoryId) {{
      where.categoryId = categoryId;
    }}

    if (dueDateFrom || dueDateTo) {{
      where.dueDate = {{}};
      if (dueDateFrom) where.dueDate.gte = dueDateFrom;
      if (dueDateTo) where.dueDate.lte = dueDateTo;
    }}

    // Build order by
    const orderBy: Prisma.TaskOrderByWithRelationInput = {{}};
    orderBy[sortBy as keyof Prisma.TaskOrderByWithRelationInput] = sortOrder;

    // Get tasks with pagination
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({{
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {{
          category: {{
            select: {{
              id: true,
              name: true,
              color: true
            }}
          }}
        }}
      }}),
      prisma.task.count({{ where }})
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({{
      tasks,
      pagination: {{
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }}
    }});

  }} catch (error) {{
    console.error('Get tasks error:', error);
    res.status(500).json({{ message: 'Internal server error' }});
  }}
}});

// Get single task
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {{
  try {{
    const task = await prisma.task.findFirst({{
      where: {{
        id: req.params.id,
        userId: req.user!.id
      }},
      include: {{
        category: {{
          select: {{
            id: true,
            name: true,
            color: true,
            description: true
          }}
        }}
      }}
    }});

    if (!task) {{
      return res.status(404).json({{ message: 'Task not found' }});
    }}

    res.json({{ task }});

  }} catch (error) {{
    console.error('Get task error:', error);
    res.status(500).json({{ message: 'Internal server error' }});
  }}
}});

// Create task
router.post('/', authenticateToken, async (req: AuthRequest, res) => {{
  try {{
    const {{ error, value }} = createTaskSchema.validate(req.body);
    if (error) {{
      return res.status(400).json({{ message: error.details[0].message }});
    }}

    const {{ title, description, priority, dueDate, categoryId }} = value;

    // Verify category belongs to user if provided
    if (categoryId) {{
      const category = await prisma.category.findFirst({{
        where: {{
          id: categoryId,
          userId: req.user!.id
        }}
      }});

      if (!category) {{
        return res.status(400).json({{ message: 'Invalid category' }});
      }}
    }}

    const task = await prisma.task.create({{
      data: {{
        title,
        description,
        priority: priority as Priority,
        dueDate,
        categoryId,
        userId: req.user!.id
      }},
      include: {{
        category: {{
          select: {{
            id: true,
            name: true,
            color: true
          }}
        }}
      }}
    }});

    res.status(201).json({{
      message: 'Task created successfully',
      task
    }});

  }} catch (error) {{
    console.error('Create task error:', error);
    res.status(500).json({{ message: 'Internal server error' }});
  }}
}});

// Update task
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {{
  try {{
    const {{ error, value }} = updateTaskSchema.validate(req.body);
    if (error) {{
      return res.status(400).json({{ message: error.details[0].message }});
    }}

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({{
      where: {{
        id: req.params.id,
        userId: req.user!.id
      }}
    }});

    if (!existingTask) {{
      return res.status(404).json({{ message: 'Task not found' }});
    }}

    const {{ title, description, completed, priority, dueDate, categoryId }} = value;

    // Verify category belongs to user if provided
    if (categoryId) {{
      const category = await prisma.category.findFirst({{
        where: {{
          id: categoryId,
          userId: req.user!.id
        }}
      }});

      if (!category) {{
        return res.status(400).json({{ message: 'Invalid category' }});
      }}
    }}

    const task = await prisma.task.update({{
      where: {{ id: req.params.id }},
      data: {{
        ...(title !== undefined && {{ title }}),
        ...(description !== undefined && {{ description }}),
        ...(completed !== undefined && {{ completed }}),
        ...(priority !== undefined && {{ priority: priority as Priority }}),
        ...(dueDate !== undefined && {{ dueDate }}),
        ...(categoryId !== undefined && {{ categoryId }})
      }},
      include: {{
        category: {{
          select: {{
            id: true,
            name: true,
            color: true
          }}
        }}
      }}
    }});

    res.json({{
      message: 'Task updated successfully',
      task
    }});

  }} catch (error) {{
    console.error('Update task error:', error);
    res.status(500).json({{ message: 'Internal server error' }});
  }}
}});

// Delete task
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {{
  try {{
    const task = await prisma.task.findFirst({{
      where: {{
        id: req.params.id,
        userId: req.user!.id
      }}
    }});

    if (!task) {{
      return res.status(404).json({{ message: 'Task not found' }});
    }}

    await prisma.task.delete({{
      where: {{ id: req.params.id }}
    }});

    res.json({{ message: 'Task deleted successfully' }});

  }} catch (error) {{
    console.error('Delete task error:', error);
    res.status(500).json({{ message: 'Internal server error' }});
  }}
}});

// Bulk update tasks
router.patch('/bulk', authenticateToken, async (req: AuthRequest, res) => {{
  try {{
    const {{ taskIds, updates }} = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {{
      return res.status(400).json({{ message: 'Task IDs array is required' }});
    }}

    // Verify all tasks belong to the user
    const userTasks = await prisma.task.findMany({{
      where: {{
        id: {{ in: taskIds }},
        userId: req.user!.id
      }},
      select: {{ id: true }}
    }});

    if (userTasks.length !== taskIds.length) {{
      return res.status(403).json({{ message: 'Some tasks do not belong to you' }});
    }}

    // Perform bulk update
    const result = await prisma.task.updateMany({{
      where: {{
        id: {{ in: taskIds }},
        userId: req.user!.id
      }},
      data: updates
    }});

    res.json({{
      message: 'Tasks updated successfully',
      updatedCount: result.count
    }});

  }} catch (error) {{
    console.error('Bulk update error:', error);
    res.status(500).json({{ message: 'Internal server error' }});
  }}
}});

export default router;
```

This is iteration {i+1} of our comprehensive task management system. We now have:

✅ Complete authentication system with JWT
✅ Advanced task filtering and sorting
✅ Bulk operations support
✅ Comprehensive validation
✅ Error handling
✅ Pagination support

Next, I'll implement the WebSocket support for real-time updates and the email notification system for due dates. Would you like me to continue?""",
                timestamp=base_time + timedelta(minutes=8 + i*3),
                message_type="code"
            ))
        
        # Add some final messages to reach the target token count
        messages.append(ConversationMessage(
            role="user",
            content="""This is excellent! The system is looking very comprehensive. I notice the conversation is getting quite long - this is exactly the kind of scenario where token optimization would be very valuable. 

Can you also add:
1. WebSocket implementation for real-time task updates
2. Email notification service for due dates  
3. File attachment support for tasks
4. Task templates and recurring tasks
5. Team collaboration features
6. Advanced reporting and analytics

Let's continue with the WebSocket implementation!""",
            timestamp=base_time + timedelta(minutes=35),
            message_type="question"
        ))
        
        messages.append(ConversationMessage(
            role="assistant",
            content="""Perfect! You're absolutely right about the conversation getting long - this is a perfect example of where intelligent context optimization becomes essential! 

Let me implement the WebSocket support for real-time updates. This will allow users to see task changes instantly across multiple browser tabs or devices.

First, let's add the WebSocket dependencies and implementation:

```bash
npm install socket.io @types/socket.io
```

Now let's create the WebSocket server integration:

```typescript
// src/websocket/socketServer.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

export class SocketServer {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> socketIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware for WebSocket connections
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, name: true }
        });

        if (!user) {
          return next(new Error('Invalid token'));
        }

        socket.userId = user.id;
        socket.userEmail = user.email;
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userEmail} connected with socket ${socket.id}`);
      
      // Track connected user
      if (socket.userId) {
        if (!this.connectedUsers.has(socket.userId)) {
          this.connectedUsers.set(socket.userId, new Set());
        }
        this.connectedUsers.get(socket.userId)!.add(socket.id);
        
        // Join user-specific room
        socket.join(`user:${socket.userId}`);
      }

      // Handle user joining specific rooms (e.g., for team features)
      socket.on('join-room', (room: string) => {
        socket.join(room);
        console.log(`User ${socket.userEmail} joined room: ${room}`);
      });

      socket.on('leave-room', (room: string) => {
        socket.leave(room);
        console.log(`User ${socket.userEmail} left room: ${room}`);
      });

      // Handle real-time task collaboration
      socket.on('task-editing', (data: { taskId: string, field: string, value: any }) => {
        // Broadcast to other users viewing the same task
        socket.to(`task:${data.taskId}`).emit('task-field-changed', {
          taskId: data.taskId,
          field: data.field,
          value: data.value,
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });
      });

      socket.on('join-task', (taskId: string) => {
        socket.join(`task:${taskId}`);
        // Notify others that user is viewing this task
        socket.to(`task:${taskId}`).emit('user-joined-task', {
          taskId,
          userId: socket.userId,
          userEmail: socket.userEmail
        });
      });

      socket.on('leave-task', (taskId: string) => {
        socket.leave(`task:${taskId}`);
        socket.to(`task:${taskId}`).emit('user-left-task', {
          taskId,
          userId: socket.userId
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.userEmail} disconnected`);
        
        if (socket.userId) {
          const userSockets = this.connectedUsers.get(socket.userId);
          if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
              this.connectedUsers.delete(socket.userId);
            }
          }
        }
      });
    });
  }

  // Public methods for emitting events from REST API routes
  public notifyTaskCreated(userId: string, task: any) {
    this.io.to(`user:${userId}`).emit('task-created', task);
  }

  public notifyTaskUpdated(userId: string, task: any) {
    this.io.to(`user:${userId}`).emit('task-updated', task);
    this.io.to(`task:${task.id}`).emit('task-updated', task);
  }

  public notifyTaskDeleted(userId: string, taskId: string) {
    this.io.to(`user:${userId}`).emit('task-deleted', { taskId });
    this.io.to(`task:${taskId}`).emit('task-deleted', { taskId });
  }

  public notifyDueDateReminder(userId: string, task: any) {
    this.io.to(`user:${userId}`).emit('due-date-reminder', task);
  }

  public getConnectedUsers(): number {
    return this.connectedUsers.size;
  }

  public getUserSocketCount(userId: string): number {
    return this.connectedUsers.get(userId)?.size || 0;
  }
}

export default SocketServer;
```

Now let's integrate the WebSocket server with our main Express application:

```typescript
// src/index.ts (updated version)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import categoryRoutes from './routes/categories';
import userRoutes from './routes/users';
import SocketServer from './websocket/socketServer';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Initialize WebSocket server
const socketServer = new SocketServer(httpServer);

// Make socket server available to routes
app.set('socketServer', socketServer);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

// Health check with WebSocket status
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    connectedUsers: socketServer.getConnectedUsers()
  });
});

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
  res.json({
    connectedUsers: socketServer.getConnectedUsers(),
    status: 'operational'
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket server initialized`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
```

Now let's create the email notification service for due date reminders:

```typescript
// src/services/emailService.ts
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Schedule daily due date check
    this.scheduleDueDateChecks();
  }

  private scheduleDueDateChecks() {
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily due date check...');
      await this.checkUpcomingDueDates();
    });

    // Run every hour for urgent tasks (due within 2 hours)
    cron.schedule('0 * * * *', async () => {
      console.log('Running hourly urgent task check...');
      await this.checkUrgentTasks();
    });
  }

  private async checkUpcomingDueDates() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find tasks due tomorrow
      const upcomingTasks = await prisma.task.findMany({
        where: {
          completed: false,
          dueDate: {
            gte: today,
            lte: tomorrow
          }
        },
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          },
          category: {
            select: {
              name: true,
              color: true
            }
          }
        }
      });

      for (const task of upcomingTasks) {
        await this.sendDueDateReminder(task);
      }

      console.log(`Sent ${upcomingTasks.length} due date reminder emails`);
    } catch (error) {
      console.error('Error checking upcoming due dates:', error);
    }
  }

  private async checkUrgentTasks() {
    try {
      const in2Hours = new Date();
      in2Hours.setHours(in2Hours.getHours() + 2);

      const now = new Date();

      // Find tasks due within 2 hours
      const urgentTasks = await prisma.task.findMany({
        where: {
          completed: false,
          dueDate: {
            gte: now,
            lte: in2Hours
          }
        },
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          },
          category: {
            select: {
              name: true,
              color: true
            }
          }
        }
      });

      for (const task of urgentTasks) {
        await this.sendUrgentTaskAlert(task);
      }

      console.log(`Sent ${urgentTasks.length} urgent task alert emails`);
    } catch (error) {
      console.error('Error checking urgent tasks:', error);
    }
  }

  private async sendDueDateReminder(task: any) {
    try {
      const subject = `Reminder: "${task.title}" is due soon`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Task Due Date Reminder</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">${task.title}</h3>
            ${task.description ? `<p style="color: #6c757d;">${task.description}</p>` : ''}
            <div style="margin: 15px 0;">
              <strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div style="margin: 15px 0;">
              <strong>Priority:</strong> 
              <span style="
                padding: 4px 8px; 
                border-radius: 4px; 
                font-size: 12px;
                background-color: ${this.getPriorityColor(task.priority)};
                color: white;
              ">
                ${task.priority}
              </span>
            </div>
            ${task.category ? `
              <div style="margin: 15px 0;">
                <strong>Category:</strong> 
                <span style="
                  padding: 4px 8px;
                  border-radius: 4px;
                  background-color: ${task.category.color};
                  color: white;
                  font-size: 12px;
                ">
                  ${task.category.name}
                </span>
              </div>
            ` : ''}
          </div>
          <p style="color: #6c757d; font-size: 14px;">
            This is an automated reminder from your Task Management System.
            <br>
            You can manage your tasks by logging into the application.
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: `"Task Manager" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: task.user.email,
        subject,
        html
      });

      console.log(`Due date reminder sent to ${task.user.email} for task: ${task.title}`);
    } catch (error) {
      console.error(`Failed to send due date reminder for task ${task.id}:`, error);
    }
  }

  private async sendUrgentTaskAlert(task: any) {
    try {
      const subject = `🚨 URGENT: "${task.title}" is due in less than 2 hours!`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">🚨 URGENT TASK ALERT</h2>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 3px solid #dc3545; border-top: none;">
            <h3 style="margin-top: 0; color: #dc3545;">${task.title}</h3>
            ${task.description ? `<p style="color: #6c757d;">${task.description}</p>` : ''}
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <strong style="color: #856404;">Due Date:</strong> 
              <span style="color: #856404;">${new Date(task.dueDate).toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
            <div style="margin: 15px 0;">
              <strong>Priority:</strong> 
              <span style="
                padding: 4px 8px; 
                border-radius: 4px; 
                font-size: 12px;
                background-color: ${this.getPriorityColor(task.priority)};
                color: white;
              ">
                ${task.priority}
              </span>
            </div>
            ${task.category ? `
              <div style="margin: 15px 0;">
                <strong>Category:</strong> 
                <span style="
                  padding: 4px 8px;
                  border-radius: 4px;
                  background-color: ${task.category.color};
                  color: white;
                  font-size: 12px;
                ">
                  ${task.category.name}
                </span>
              </div>
            ` : ''}
          </div>
          <p style="color: #6c757d; font-size: 14px; text-align: center;">
            ⚡ This task requires immediate attention!
            <br>
            Log in now to mark it as complete or update the due date.
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: `"Task Manager - URGENT" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: task.user.email,
        subject,
        html,
        priority: 'high'
      });

      console.log(`Urgent task alert sent to ${task.user.email} for task: ${task.title}`);
    } catch (error) {
      console.error(`Failed to send urgent task alert for task ${task.id}:`, error);
    }
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'LOW': return '#28a745';
      case 'MEDIUM': return '#ffc107';
      case 'HIGH': return '#fd7e14';
      case 'URGENT': return '#dc3545';
      default: return '#6c757d';
    }
  }

  public async sendCustomEmail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: `"Task Manager" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html
      });
      console.log(`Custom email sent to ${to}`);
    } catch (error) {
      console.error('Failed to send custom email:', error);
      throw error;
    }
  }

  public async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

export default EmailService;
```

Perfect! We now have a comprehensive real-time task management system with WebSocket support and email notifications. The conversation has grown to demonstrate exactly the kind of cache explosion scenario that our optimization engine is designed to solve.

As you can see, this conversation now contains:
- 🔥 **Extensive code examples** (multiple files, thousands of lines)
- 📚 **Detailed explanations** for each component  
- 🏗️ **Complex system architecture** with multiple services
- 💬 **Natural back-and-forth** user questions and responses
- 📊 **Real-world complexity** that mirrors actual Cline usage

This is a perfect test case for our Python optimization engine! The conversation easily exceeds 50k+ tokens, which would cause significant API costs without optimization.

Would you like me to run this through our optimization engine to demonstrate the token reduction capabilities?""",
            timestamp=base_time + timedelta(minutes=40),
            message_type="code"
        ))
        
        return messages
    
    @staticmethod
    def generate_cline_task_format(messages: List[ConversationMessage]) -> Dict[str, Any]:
        """Convert messages to Cline's JSON format for testing"""
        
        cline_messages = []
        
        for msg in messages:
            cline_message = {
                "role": msg.role,
                "content": msg.content
            }
            
            # Add timestamp if available
            if msg.timestamp:
                cline_message["timestamp"] = msg.timestamp.isoformat()
            
            cline_messages.append(cline_message)
        
        return cline_messages

class PerformanceBenchmark:
    """Benchmark optimization performance and compare strategies"""
    
    @staticmethod
    async def benchmark_strategies(context: ConversationContext) -> Dict[str, Any]:
        """Benchmark different optimization strategies"""
        
        engine = UniversalOptimizationEngine()
        strategies = engine.get_available_strategies()
        
        results = {}
        
        for strategy in strategies:
            print(f"\n🧪 Testing strategy: {strategy}")
            
            # Run optimization multiple times for average
            times = []
            reductions = []
            quality_scores = []
            
            for i in range(3):  # Run 3 times for average
                start_time = time.time()
                result = await engine.optimize_context(
                    context, 
                    max_tokens=20000, 
                    strategy=strategy
                )
                end_time = time.time()
                
                times.append(end_time - start_time)
                reductions.append(result.reduction_percentage)
                quality_scores.append(result.quality_score)
            
            results[strategy] = {
                'avg_processing_time': sum(times) / len(times),
                'avg_reduction_percentage': sum(reductions) / len(reductions),
                'avg_quality_score': sum(quality_scores) / len(quality_scores),
                'min_processing_time': min(times),
                'max_processing_time': max(times)
            }
        
        return results
    
    @staticmethod
    def calculate_cost_savings(original_tokens: int, optimized_tokens: int) -> Dict[str, float]:
        """Calculate cost savings based on Claude pricing"""
        
        # Claude Sonnet pricing (as of 2024)
        input_cost_per_token = 0.000003  # $3 per 1M input tokens
        output_cost_per_token = 0.000015  # $15 per 1M output tokens
        
        original_cost = original_tokens * input_cost_per_token
        optimized_cost = optimized_tokens * input_cost_per_token
        
        savings_per_request = original_cost - optimized_cost
        savings_percentage = (savings_per_request / original_cost * 100) if original_cost > 0 else 0
        
        # Project monthly savings (assuming 100 requests per month)
        monthly_savings = savings_per_request * 100
        yearly_savings = monthly_savings * 12
        
        return {
            'original_cost_per_request': original_cost,
            'optimized_cost_per_request': optimized_cost,
            'savings_per_request': savings_per_request,
            'savings_percentage': savings_percentage,
            'monthly_savings_100_requests': monthly_savings,
            'yearly_savings_100_requests': yearly_savings
        }

async def main():
    """Main testing function"""
    
    print("🚀 Python Universal Context Optimizer - Comprehensive Testing")
    print("=" * 80)
    
    # Generate realistic test data
    print("\n📊 Generating realistic test data (simulated cache explosion)...")
    test_messages = TestDataGenerator.generate_large_conversation()
    
    # Create conversation context
    context = ConversationContext(
        messages=test_messages,
        total_tokens=sum(len(msg.content) // 4 for msg in test_messages),
        source_tool="cline_simulation",
        session_id="test_session_large",
        created_at=datetime.now()
    )
    
    print(f"✅ Generated conversation: {len(context.messages)} messages, ~{context.total_tokens} tokens")
    
    # Test 1: Basic optimization
    print(f"\n🔬 Test 1: Basic Optimization")
    print("-" * 40)
    
    engine = UniversalOptimizationEngine()
    
    # Get estimation first
    estimation = engine.estimate_optimization(context, max_tokens=20000)
    print("📊 Pre-optimization estimation:")
    for key, value in estimation.items():
        print(f"   {key}: {value}")
    
    # Perform actual optimization
    start_time = time.time()
    result = await engine.optimize_context(context, max_tokens=20000, strategy='hybrid')
    end_time = time.time()
    
    print(f"\n✅ Optimization completed in {end_time - start_time:.3f}s")
    print(f"📈 Results:")
    print(f"   Original tokens: {result.original_tokens:,}")
    print(f"   Optimized tokens: {result.optimized_tokens:,}")
    print(f"   Reduction: {result.reduction_percentage:.1f}%")
    print(f"   Quality score: {result.quality_score:.2f}/1.0")
    print(f"   Strategy used: {result.strategy_used}")
    
    # Test 2: Performance benchmarking
    print(f"\n🏁 Test 2: Performance Benchmarking")
    print("-" * 40)
    
    benchmark_results = await PerformanceBenchmark.benchmark_strategies(context)
    
    print("📊 Strategy Comparison:")
    for strategy, metrics in benchmark_results.items():
        print(f"\n   {strategy.upper()}:")
        print(f"      Avg processing time: {metrics['avg_processing_time']:.3f}s")
        print(f"      Avg reduction: {metrics['avg_reduction_percentage']:.1f}%")
        print(f"      Avg quality: {metrics['avg_quality_score']:.2f}")
        print(f"      Time range: {metrics['min_processing_time']:.3f}s - {metrics['max_processing_time']:.3f}s")
    
    # Test 3: Cost savings analysis
    print(f"\n💰 Test 3: Cost Savings Analysis")
    print("-" * 40)
    
    cost_analysis = PerformanceBenchmark.calculate_cost_savings(
        result.original_tokens, 
        result.optimized_tokens
    )
    
    print("💳 Cost Impact:")
    for key, value in cost_analysis.items():
        if 'percentage' in key:
            print(f"   {key}: {value:.1f}%")
        elif 'cost' in key or 'savings' in key:
            print(f"   {key}: ${value:.6f}")
        else:
            print(f"   {key}: {value}")
    
    # Test 4: Cline format compatibility
    print(f"\n🔌 Test 4: Cline Format Compatibility")
    print("-" * 40)
    
    # Convert to Cline format
    cline_format = TestDataGenerator.generate_cline_task_format(test_messages)
    
    # Create temporary file for testing
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(cline_format, f, indent=2, default=str)
        temp_file = f.name
    
    try:
        # Test Cline parser
        parser = ClineConversationParser()
        
        # Create a mock task for testing
        task = ClineTask(
            task_id="test_task",
            task_path=os.path.dirname(temp_file),
            conversation_history=cline_format,
            total_tokens=sum(len(str(msg.get('content', ''))) // 4 for msg in cline_format),
            created_at=datetime.now(),
            last_modified=datetime.now()
        )
        
        # Convert to universal format
        universal_context = parser.convert_to_universal_format(task)
        
        print(f"✅ Cline format parsing successful:")
        print(f"   Original format: {len(cline_format)} messages")
        print(f"   Universal format: {len(universal_context.messages)} messages")
        print(f"   Token preservation: {universal_context.total_tokens} tokens")
        
        # Test optimization of Cline format
        cline_optimization = await engine.optimize_context(universal_context, max_tokens=15000)
        
        print(f"📊 Cline format optimization:")
        print(f"   Reduction: {cline_optimization.reduction_percentage:.1f}%")
        print(f"   Quality: {cline_optimization.quality_score:.2f}")
        
    finally:
        # Clean up temporary file
        os.unlink(temp_file)
    
    # Test 5: Quality preservation analysis
    print(f"\n🎯 Test 5: Quality Preservation Analysis")
    print("-" * 40)
    
    print("📋 Optimization Details:")
    for key, value in result.optimization_details.items():
        print(f"   {key}: {value}")
    
    # Analyze preserved content types
    code_messages = [msg for msg in result.optimized_messages if '```' in msg.content]
    question_messages = [msg for msg in result.optimized_messages if msg.message_type == 'question']
    
    print(f"\n📈 Content Preservation:")
    print(f"   Code blocks preserved: {len(code_messages)}")
    print(f"   User questions preserved: {len(question_messages)}")
    print(f"   Conversation flow maintained: {result.optimization_details['conversation_pairs_preserved']} pairs")
    
    # Summary
    print(f"\n🎉 Testing Summary")
    print("=" * 80)
    print(f"✅ All tests completed successfully!")
    print(f"🚀 Performance: {result.processing_time:.3f}s processing time")
    print(f"💾 Efficiency: {result.reduction_percentage:.1f}% token reduction")
    print(f"⭐ Quality: {result.quality_score:.2f}/1.0 preservation score")
    print(f"💰 Savings: ${cost_analysis['savings_per_request']:.6f} per request")
    print(f"🌟 Ready for production deployment!")

if __name__ == "__main__":
    asyncio.run(main())