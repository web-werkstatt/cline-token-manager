import * as vscode from 'vscode';
import * as path from 'path';

interface CondensedFile {
    path: string;
    originalSize: number;
    condensedSize: number;
    content: string;
    compressionRatio: number;
    extractionMethod: string;
}

interface FileAnalysis {
    fileType: string;
    language: string;
    complexity: number;
    relevanceScore: number;
    shouldCondense: boolean;
    estimatedTokens: number;
}

export class SmartFileCondenser {
    private static instance: SmartFileCondenser;
    
    // File size thresholds
    private readonly LARGE_FILE_THRESHOLD = 10000; // 10KB
    private readonly HUGE_FILE_THRESHOLD = 50000;  // 50KB
    
    // Token estimation (rough)
    private readonly CHARS_PER_TOKEN = 4;
    
    private constructor() {}
    
    public static getInstance(): SmartFileCondenser {
        if (!SmartFileCondenser.instance) {
            SmartFileCondenser.instance = new SmartFileCondenser();
        }
        return SmartFileCondenser.instance;
    }
    
    /**
     * Condense file content for optimal context usage
     * This is the main entry point for file optimization
     */
    public async condenseFile(filePath: string, content: string, context?: string): Promise<CondensedFile> {
        const analysis = this.analyzeFile(filePath, content);
        
        if (!analysis.shouldCondense) {
            return {
                path: filePath,
                originalSize: content.length,
                condensedSize: content.length,
                content: content,
                compressionRatio: 1.0,
                extractionMethod: 'no_compression'
            };
        }
        
        let condensedContent: string;
        let method: string;
        
        // Choose condensation strategy based on file analysis
        switch (analysis.fileType) {
            case 'typescript':
            case 'javascript':
                condensedContent = this.condenseJavaScriptFile(content, context);
                method = 'js_structure_extraction';
                break;
                
            case 'python':
                condensedContent = this.condensePythonFile(content, context);
                method = 'python_structure_extraction';
                break;
                
            case 'json':
                condensedContent = this.condenseJsonFile(content);
                method = 'json_optimization';
                break;
                
            case 'markdown':
                condensedContent = this.condenseMarkdownFile(content, context);
                method = 'markdown_summarization';
                break;
                
            case 'config':
                condensedContent = this.condenseConfigFile(content);
                method = 'config_optimization';
                break;
                
            default:
                condensedContent = this.condenseGenericFile(content);
                method = 'generic_sampling';
        }
        
        const compressionRatio = condensedContent.length / content.length;
        
        console.log(`🔧 SmartFileCondenser: Condensed ${filePath} from ${content.length} to ${condensedContent.length} chars (${(compressionRatio * 100).toFixed(1)}% of original)`);
        
        return {
            path: filePath,
            originalSize: content.length,
            condensedSize: condensedContent.length,
            content: condensedContent,
            compressionRatio,
            extractionMethod: method
        };
    }
    
    /**
     * Analyze file to determine if and how it should be condensed
     */
    private analyzeFile(filePath: string, content: string): FileAnalysis {
        const extension = path.extname(filePath).toLowerCase();
        const basename = path.basename(filePath).toLowerCase();
        
        // Determine file type and language
        let fileType = 'unknown';
        let language = 'plaintext';
        
        // Map extensions to types
        const typeMap: { [key: string]: { type: string; language: string } } = {
            '.ts': { type: 'typescript', language: 'typescript' },
            '.js': { type: 'javascript', language: 'javascript' },
            '.jsx': { type: 'javascript', language: 'javascript' },
            '.tsx': { type: 'typescript', language: 'typescript' },
            '.py': { type: 'python', language: 'python' },
            '.json': { type: 'json', language: 'json' },
            '.md': { type: 'markdown', language: 'markdown' },
            '.yml': { type: 'config', language: 'yaml' },
            '.yaml': { type: 'config', language: 'yaml' },
            '.toml': { type: 'config', language: 'toml' },
            '.env': { type: 'config', language: 'properties' }
        };
        
        const mapping = typeMap[extension];
        if (mapping) {
            fileType = mapping.type;
            language = mapping.language;
        }
        
        // Calculate complexity (lines, nesting, etc.)
        const lines = content.split('\n');
        const complexity = this.calculateComplexity(content, fileType);
        
        // Calculate relevance score (higher = more relevant to current context)
        const relevanceScore = this.calculateRelevance(filePath, content);
        
        // Determine if file should be condensed
        const shouldCondense = content.length > this.LARGE_FILE_THRESHOLD && 
                              complexity > 0.3 && 
                              fileType !== 'unknown';
        
        // Estimate tokens
        const estimatedTokens = Math.ceil(content.length / this.CHARS_PER_TOKEN);
        
        return {
            fileType,
            language,
            complexity,
            relevanceScore,
            shouldCondense,
            estimatedTokens
        };
    }
    
    /**
     * Condense JavaScript/TypeScript files by extracting structure
     */
    private condenseJavaScriptFile(content: string, context?: string): string {
        const lines = content.split('\n');
        const condensed: string[] = [];
        
        // Always include imports/exports
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('import ') || 
                trimmed.startsWith('export ') ||
                trimmed.startsWith('from ') ||
                trimmed.includes('require(')) {
                condensed.push(line);
            }
        });
        
        // Extract function signatures and class definitions
        let inFunction = false;
        let braceLevel = 0;
        let currentFunction = '';
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Function declarations
            if (trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+/) ||
                trimmed.match(/^\w+\s*[:=]\s*(async\s+)?\([^)]*\)\s*=>/) ||
                trimmed.match(/^(public|private|protected)?\s+\w+\s*\([^)]*\)/)) {
                
                condensed.push(line);
                inFunction = true;
                currentFunction = line;
                braceLevel = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
                
                // If it's a one-liner, we're done
                if (braceLevel === 0 && trimmed.endsWith(';')) {
                    inFunction = false;
                }
                return;
            }
            
            // Class declarations
            if (trimmed.match(/^(export\s+)?(abstract\s+)?class\s+\w+/)) {
                condensed.push(line);
                return;
            }
            
            // Interface/type definitions
            if (trimmed.match(/^(export\s+)?(interface|type)\s+\w+/)) {
                condensed.push(line);
                // Include the full interface/type definition
                let interfaceBraces = 0;
                for (let i = index; i < lines.length; i++) {
                    const interfaceLine = lines[i];
                    condensed.push(interfaceLine);
                    interfaceBraces += (interfaceLine.match(/{/g) || []).length;
                    interfaceBraces -= (interfaceLine.match(/}/g) || []).length;
                    if (interfaceBraces === 0 && i > index) break;
                }
                return;
            }
            
            // Comments and JSDoc
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
                condensed.push(line);
                return;
            }
            
            // Track function body
            if (inFunction) {
                braceLevel += (line.match(/{/g) || []).length;
                braceLevel -= (line.match(/}/g) || []).length;
                
                // Add important lines from function body
                if (trimmed.includes('return ') || 
                    trimmed.includes('throw ') ||
                    trimmed.includes('console.') ||
                    trimmed.startsWith('//') ||
                    trimmed.length > 0 && braceLevel === 1) {
                    condensed.push('    ' + trimmed); // Indent to show it's from function body
                }
                
                if (braceLevel === 0) {
                    condensed.push(line); // Closing brace
                    inFunction = false;
                }
            }
        });
        
        // Add file summary comment
        const summary = `// File: ${content.split('\n').length} lines condensed to ${condensed.length} lines\n// Extraction: Function signatures, imports, exports, types\n`;
        
        return summary + condensed.join('\n');
    }
    
    /**
     * Condense Python files by extracting structure  
     */
    private condensePythonFile(content: string, context?: string): string {
        const lines = content.split('\n');
        const condensed: string[] = [];
        
        // Always include imports
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('import ') || 
                trimmed.startsWith('from ') ||
                trimmed.startsWith('__')) {
                condensed.push(line);
            }
        });
        
        // Extract function and class definitions
        let currentIndent = 0;
        lines.forEach(line => {
            const trimmed = line.trim();
            const indent = line.length - line.trimStart().length;
            
            // Class definitions
            if (trimmed.startsWith('class ')) {
                condensed.push(line);
                currentIndent = indent;
                return;
            }
            
            // Function definitions  
            if (trimmed.startsWith('def ')) {
                condensed.push(line);
                currentIndent = indent;
                return;
            }
            
            // Docstrings
            if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
                condensed.push(line);
                return;
            }
            
            // Comments
            if (trimmed.startsWith('#')) {
                condensed.push(line);
                return;
            }
        });
        
        const summary = `# File: ${content.split('\n').length} lines condensed to ${condensed.length} lines\n# Extraction: Function/class signatures, imports, docstrings\n`;
        
        return summary + condensed.join('\n');
    }
    
    /**
     * Condense JSON files by removing unnecessary whitespace and limiting depth
     */
    private condenseJsonFile(content: string): string {
        try {
            const parsed = JSON.parse(content);
            
            // For large objects, limit depth or sample keys
            const condensed = this.limitJsonDepth(parsed, 3);
            
            return JSON.stringify(condensed, null, 2);
        } catch (error) {
            // If parsing fails, return truncated version
            return content.substring(0, Math.min(content.length, 2000)) + '\n// ... (truncated due to parse error)';
        }
    }
    
    /**
     * Condense markdown by keeping headers and first paragraph of each section
     */
    private condenseMarkdownFile(content: string, context?: string): string {
        const lines = content.split('\n');
        const condensed: string[] = [];
        
        let inCodeBlock = false;
        let currentSection = '';
        
        lines.forEach(line => {
            const trimmed = line.trim();
            
            // Code blocks
            if (trimmed.startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                condensed.push(line);
                return;
            }
            
            if (inCodeBlock) {
                condensed.push(line);
                return;
            }
            
            // Headers
            if (trimmed.startsWith('#')) {
                condensed.push(line);
                currentSection = trimmed;
                return;
            }
            
            // Keep first non-empty line after header
            if (currentSection && trimmed.length > 0 && !trimmed.startsWith('#')) {
                condensed.push(line);
                currentSection = ''; // Only keep first paragraph
                return;
            }
            
            // Keep empty lines for structure
            if (trimmed.length === 0) {
                condensed.push(line);
            }
        });
        
        return condensed.join('\n');
    }
    
    /**
     * Condense config files by keeping structure and removing comments
     */
    private condenseConfigFile(content: string): string {
        const lines = content.split('\n');
        const condensed: string[] = [];
        
        lines.forEach(line => {
            const trimmed = line.trim();
            
            // Skip empty lines and comments (but keep important comments)
            if (trimmed.length === 0) return;
            if (trimmed.startsWith('#') && !trimmed.includes('TODO') && !trimmed.includes('IMPORTANT')) return;
            
            condensed.push(line);
        });
        
        return condensed.join('\n');
    }
    
    /**
     * Generic file condensation - sample content intelligently
     */
    private condenseGenericFile(content: string): string {
        const lines = content.split('\n');
        
        if (lines.length <= 100) {
            return content; // Small enough, don't condense
        }
        
        const condensed: string[] = [];
        
        // Take first 20 lines
        condensed.push(...lines.slice(0, 20));
        condensed.push('// ... (content condensed) ...');
        
        // Take middle sample
        const midStart = Math.floor(lines.length / 2) - 10;
        condensed.push(...lines.slice(midStart, midStart + 20));
        condensed.push('// ... (content condensed) ...');
        
        // Take last 20 lines
        condensed.push(...lines.slice(-20));
        
        return condensed.join('\n');
    }
    
    /**
     * Calculate file complexity score (0-1)
     */
    private calculateComplexity(content: string, fileType: string): number {
        const lines = content.split('\n');
        let complexity = 0;
        
        // Base complexity on lines
        complexity += Math.min(lines.length / 1000, 0.5);
        
        // Add complexity for nesting
        const maxIndent = Math.max(...lines.map(line => line.length - line.trimStart().length));
        complexity += Math.min(maxIndent / 40, 0.3);
        
        // Add complexity for special patterns
        const patterns = ['function', 'class', 'if', 'for', 'while', 'switch'];
        patterns.forEach(pattern => {
            const matches = (content.match(new RegExp(pattern, 'g')) || []).length;
            complexity += Math.min(matches / 50, 0.1);
        });
        
        return Math.min(complexity, 1.0);
    }
    
    /**
     * Calculate relevance score based on file path and content
     */
    private calculateRelevance(filePath: string, content: string): number {
        let relevance = 0.5; // Base relevance
        
        const filename = path.basename(filePath).toLowerCase();
        const dirname = path.dirname(filePath).toLowerCase();
        
        // Higher relevance for certain file types
        const importantFiles = ['index', 'main', 'app', 'config', 'types', 'utils'];
        if (importantFiles.some(name => filename.includes(name))) {
            relevance += 0.2;
        }
        
        // Lower relevance for test files, docs, etc.
        const lessImportantPaths = ['test', 'spec', 'docs', 'node_modules', '__pycache__'];
        if (lessImportantPaths.some(path => dirname.includes(path) || filename.includes(path))) {
            relevance -= 0.3;
        }
        
        // Content-based relevance could be added here
        // (e.g., presence of TODOs, recent changes, etc.)
        
        return Math.max(0, Math.min(1, relevance));
    }
    
    /**
     * Limit JSON object depth for condensation
     */
    private limitJsonDepth(obj: any, maxDepth: number, currentDepth = 0): any {
        if (currentDepth >= maxDepth) {
            return typeof obj === 'object' ? '...(truncated)' : obj;
        }
        
        if (Array.isArray(obj)) {
            // For arrays, limit to first few items
            const limited = obj.slice(0, 10).map(item => 
                this.limitJsonDepth(item, maxDepth, currentDepth + 1)
            );
            if (obj.length > 10) {
                limited.push(`...(${obj.length - 10} more items)`);
            }
            return limited;
        }
        
        if (typeof obj === 'object' && obj !== null) {
            const limited: any = {};
            const keys = Object.keys(obj);
            
            // Limit object keys
            keys.slice(0, 20).forEach(key => {
                limited[key] = this.limitJsonDepth(obj[key], maxDepth, currentDepth + 1);
            });
            
            if (keys.length > 20) {
                limited['...(more keys)'] = `${keys.length - 20} additional properties`;
            }
            
            return limited;
        }
        
        return obj;
    }
    
    /**
     * Estimate token savings from condensation
     */
    public estimateTokenSavings(originalContent: string, condensedContent: string): {
        originalTokens: number;
        condensedTokens: number;
        savedTokens: number;
        savingsPercentage: number;
    } {
        const originalTokens = Math.ceil(originalContent.length / this.CHARS_PER_TOKEN);
        const condensedTokens = Math.ceil(condensedContent.length / this.CHARS_PER_TOKEN);
        const savedTokens = originalTokens - condensedTokens;
        const savingsPercentage = (savedTokens / originalTokens) * 100;
        
        return {
            originalTokens,
            condensedTokens,
            savedTokens,
            savingsPercentage
        };
    }
}