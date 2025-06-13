import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ClineConfig, ExtensionConfig } from '../shared/types';

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: ExtensionConfig | null = null;
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private onConfigChangeEmitter = new vscode.EventEmitter<ExtensionConfig>();
  
  public readonly onConfigChange = this.onConfigChangeEmitter.event;

  private constructor() {}

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  public async loadConfig(): Promise<ExtensionConfig> {
    console.log('🔧 ConfigLoader: Loading configuration...');
    const workspaceConfig = vscode.workspace.getConfiguration('clineEnhanced');
    
    // Start with VS Code settings
    let config: ExtensionConfig = {
      apiProvider: workspaceConfig.get('apiProvider', 'anthropic'),
      apiKey: workspaceConfig.get('apiKey', ''),
      maxTokens: workspaceConfig.get('maxTokens', 4096),
      contextWindowSize: workspaceConfig.get('contextWindowSize', 100000),
      customConfigPath: workspaceConfig.get('customConfigPath', ''),
      enableTokenTracking: workspaceConfig.get('enableTokenTracking', true)
    };

    // Load custom config if specified
    const customConfigPath = config.customConfigPath;
    if (customConfigPath) {
      const customConfig = await this.loadCustomConfig(customConfigPath);
      if (customConfig) {
        config = { ...config, ...customConfig };
      }
    } else {
      // Look for .clineconfig.js in workspace root
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      console.log('🔧 ConfigLoader: Workspace root:', workspaceRoot);
      if (workspaceRoot) {
        const defaultConfigPath = path.join(workspaceRoot, '.clineconfig.js');
        console.log('🔧 ConfigLoader: Looking for config at:', defaultConfigPath);
        if (fs.existsSync(defaultConfigPath)) {
          console.log('🔧 ConfigLoader: Found .clineconfig.js, loading...');
          const customConfig = await this.loadCustomConfig(defaultConfigPath);
          if (customConfig) {
            console.log('🔧 ConfigLoader: Merging custom config:', customConfig);
            config = { ...config, ...customConfig };
          }
          this.watchConfigFile(defaultConfigPath);
        } else {
          console.log('🔧 ConfigLoader: .clineconfig.js not found');
        }
      }
    }

    this.config = config;
    return config;
  }

  private async loadCustomConfig(configPath: string): Promise<Partial<ClineConfig> | null> {
    try {
      console.log('🔧 ConfigLoader: Attempting to load config from:', configPath);
      
      // Check if file exists first
      if (!fs.existsSync(configPath)) {
        console.log('🔧 ConfigLoader: Config file does not exist:', configPath);
        return null;
      }

      // Read file content directly
      const configContent = fs.readFileSync(configPath, 'utf8');
      console.log('🔧 ConfigLoader: File content read successfully');
      
      // Create a minimal module evaluation environment
      let customConfig;
      
      try {
        // Create a safe evaluation context
        const moduleObj = { exports: {} };
        const exportsObj = {};
        
        // Create a function that simulates module loading
        const configFunction = new Function(
          'module', 
          'exports', 
          '__filename', 
          '__dirname', 
          'require',
          'console',
          configContent
        );
        
        // Execute the config file
        configFunction(
          moduleObj,
          exportsObj,
          configPath,
          path.dirname(configPath),
          require, // This won't work for external modules, but basic require should work
          console
        );
        
        // Get the exported configuration
        customConfig = moduleObj.exports;
        
        // Fallback to exports if module.exports is empty
        if (!customConfig || Object.keys(customConfig).length === 0) {
          customConfig = exportsObj;
        }
        
      } catch (evalError) {
        console.log('🔧 ConfigLoader: Function evaluation failed, trying simple JSON parse...');
        
        // Try to parse as a simple JavaScript object (if it's just a return statement)
        try {
          // Remove module.exports = and just evaluate the object
          let cleanContent = configContent
            .replace(/^\s*module\.exports\s*=\s*/, '')
            .replace(/;\s*$/, '');
          
          // If it's a function call like module.exports = { ... }
          if (cleanContent.includes('module.exports')) {
            cleanContent = cleanContent.replace(/module\.exports\s*=\s*/, '');
          }
          
          // Try to evaluate as a simple object
          customConfig = eval('(' + cleanContent + ')');
          
        } catch (parseError: any) {
          console.error('🔧 ConfigLoader: All parsing methods failed:', parseError);
          throw new Error(`Cannot parse config file: ${parseError?.message || 'Unknown error'}`);
        }
      }
      
      console.log('🔧 ConfigLoader: Raw config loaded:', customConfig);
      
      // Handle different export formats
      if (customConfig && typeof customConfig === 'object') {
        if (customConfig.default) {
          customConfig = customConfig.default;
        }
      }
      
      // Validate config
      if (!customConfig || typeof customConfig !== 'object') {
        vscode.window.showWarningMessage(`Invalid config file: ${configPath} - Expected object, got ${typeof customConfig}`);
        return null;
      }

      console.log('🔧 ConfigLoader: Config validated successfully');
      return customConfig as Partial<ClineConfig>;
      
    } catch (error) {
      console.error('🔧 ConfigLoader: Error loading config:', error);
      vscode.window.showErrorMessage(`Failed to load config from ${configPath}: ${error}`);
      return null;
    }
  }

  private watchConfigFile(configPath: string): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(configPath);
    
    this.fileWatcher.onDidChange(async () => {
      const newConfig = await this.loadConfig();
      this.onConfigChangeEmitter.fire(newConfig);
    });
  }

  public getConfig(): ExtensionConfig {
    if (!this.config) {
      console.log('🔧 ConfigLoader: Config not loaded, returning defaults');
      // Return default config instead of throwing error
      return {
        apiProvider: 'anthropic',
        apiKey: '',
        maxTokens: 4096,
        contextWindowSize: 100000,
        customConfigPath: '',
        enableTokenTracking: true
      };
    }
    return this.config;
  }

  public async updateConfig(updates: Partial<ExtensionConfig>): Promise<void> {
    const config = vscode.workspace.getConfiguration('clineEnhanced');
    
    for (const [key, value] of Object.entries(updates)) {
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

    // Reload config
    await this.loadConfig();
  }

  public dispose(): void {
    this.fileWatcher?.dispose();
    this.onConfigChangeEmitter.dispose();
  }
}