# 📦 Installation Guide - Cline Token Manager Beta

> **2-minute installation • Works with existing Cline setup • Zero configuration needed**  
> **Author:** Joseph Kisler - Webwerkstatt

---

## ⚡ **Quick Install (Recommended)**

### **Step 1: Download Extension**
1. Download: [`cline-token-manager-free-1.0.0.vsix`](./releases/beta/cline-token-manager-free-1.0.0.vsix)
2. Save to your Downloads folder

### **Step 2: Install in VS Code**
1. **Open VS Code**
2. **Press `Ctrl+Shift+P`** (Windows/Linux) or `Cmd+Shift+P` (Mac)
3. **Type**: "Extensions: Install from VSIX..."
4. **Select** the downloaded `.vsix` file
5. **Click "Install"**
6. **Reload VS Code** when prompted

### **Step 3: Verify Installation**
✅ Look for **"🎯 Token Manager"** in status bar (bottom right)  
✅ Try **Command Palette** → "Optimize Context"  
✅ Check Extensions panel for "Cline Token Manager"

**That's it! 🎉 You're ready to optimize.**

---

## 🛠️ **Alternative Installation Methods**

### **Method 2: Command Line**
```bash
# Navigate to download location
cd ~/Downloads

# Install via CLI
code --install-extension cline-token-manager-free-1.0.0.vsix
```

### **Method 3: Drag & Drop**
1. Open VS Code
2. Open Extensions panel (`Ctrl+Shift+X`)
3. Drag the `.vsix` file into Extensions panel
4. Confirm installation

---

## ✅ **Verification Checklist**

### **Visual Indicators:**
- [ ] **Status Bar**: Shows "🎯 Token Manager" with current token count
- [ ] **Command Palette**: "Cline Token Manager" commands available
- [ ] **Extensions Panel**: "Cline Token Manager" listed as enabled

### **Test Commands:**
```
1. Ctrl+Shift+P → "Optimize Context"
2. Ctrl+Shift+P → "Generate Optimization Report"  
3. Ctrl+Shift+P → "Show Token Manager Dashboard"
```

### **Expected Behavior:**
- **No VS Code slowdown** (should feel faster!)
- **Status bar updates** when working with files
- **Commands execute** without errors

---

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **❌ "Cannot find extension" error**
**Solution:**
1. Check VS Code version (requires 1.74+)
2. Update VS Code if needed
3. Restart VS Code completely
4. Try installation again

#### **❌ Status bar not showing**
**Solution:**
1. Check if extension is enabled in Extensions panel
2. Reload VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")
3. Check for other extensions conflicts

#### **❌ Commands not appearing**
**Solution:**
1. Wait 30 seconds after installation
2. Reload VS Code window
3. Check Extension Host is running (no errors in Developer Console)

#### **❌ Performance issues**
**Solution:**
1. Check if old polling-based extensions are running
2. Disable conflicting token management extensions
3. Restart VS Code
4. Monitor CPU usage in Task Manager

### **System Requirements:**
- **VS Code**: Version 1.74 or higher
- **Cline Extension**: Any version (compatible with all)
- **Node.js**: Not required (extension is self-contained)
- **Memory**: Minimal impact (<10MB additional)

---

## 🔧 **Configuration (Optional)**

### **Default Settings (Work out of the box):**
```json
{
  "clineTokenManager.autoOptimize": true,
  "clineTokenManager.showStatusBar": true,
  "clineTokenManager.optimizeThreshold": 10000,
  "clineTokenManager.compressionLevel": "smart"
}
```

### **Custom Configuration:**
1. **File** → **Preferences** → **Settings**
2. **Search**: "Cline Token Manager"  
3. **Adjust** settings as needed
4. **Changes apply** immediately (no restart needed)

### **Advanced Settings:**
```json
{
  "clineTokenManager.fileTypes": {
    "typescript": { "enabled": true, "compressionRatio": 0.85 },
    "python": { "enabled": true, "compressionRatio": 0.82 },
    "json": { "enabled": true, "compressionRatio": 0.71 }
  },
  "clineTokenManager.excludePatterns": [
    "**/node_modules/**",
    "**/dist/**", 
    "**/.git/**"
  ]
}
```

---

## 📊 **First Use Guide**

### **Step 1: Open a Cline Project**
1. Open any project with Cline
2. Notice status bar shows current token usage
3. Open several TypeScript/Python files

### **Step 2: Run First Optimization**
1. **Command Palette** (`Ctrl+Shift+P`)
2. Type: **"Optimize Context"**
3. Watch the optimization process
4. See results summary popup

### **Step 3: Analyze Results**
1. **Command Palette** → **"Generate Optimization Report"**
2. Review detailed analysis
3. Check token reduction percentages
4. Explore optimization suggestions

### **Step 4: Normal Usage**
- **Extension works automatically** in background
- **Status bar updates** in real-time
- **Manual optimization** available anytime
- **Reports generated** on-demand

---

## 🎯 **Usage Examples**

### **Scenario 1: Large React Project**
```
Before optimization:
- 5 components: ~12,000 tokens
- 3 services: ~8,000 tokens  
- Config files: ~3,000 tokens
Total: 23,000 tokens (~$0.69)

After optimization (one-click):
- Same files: ~5,500 tokens (~$0.17)
- Savings: 76% reduction, $0.52 saved
- Time: <2 seconds
```

### **Scenario 2: Python Data Science**
```
Before optimization:
- 3 notebook files: ~15,000 tokens
- 2 modules: ~6,000 tokens
- Requirements: ~1,000 tokens  
Total: 22,000 tokens (~$0.66)

After optimization:
- Same files: ~4,800 tokens (~$0.14)
- Savings: 78% reduction, $0.52 saved
- Quality: All signatures preserved
```

---

## 🆘 **Getting Help**

### **Beta Support Channels:**
- **GitHub Issues**: [Report bugs/features](https://github.com/web-werkstatt/ai-context-optimizer/issues)
- **Discord**: #cline-token-manager channel
- **Email**: support@web-werkstatt.at
- **Direct Message**: Contact beta team directly

### **What to Include in Bug Reports:**
1. **VS Code version**: Help → About
2. **Extension version**: Check Extensions panel
3. **Error messages**: Copy exact text
4. **Steps to reproduce**: What you did
5. **Expected vs actual**: What should vs did happen

### **Response Times:**
- **Critical bugs**: <4 hours
- **General issues**: <24 hours  
- **Feature requests**: Reviewed weekly
- **Performance issues**: <12 hours

---

## 🚀 **Next Steps**

### **After Installation:**
1. **Join our Discord** for beta updates
2. **Star our GitHub** to stay informed
3. **Share feedback** on your experience
4. **Invite teammates** to beta test

### **Beta Program Benefits:**
- **Free Professional tier** for 6 months
- **Direct developer access** for questions
- **Feature voting rights** on roadmap
- **Early access** to multi-tool support

---

**🎉 Welcome to optimized AI coding! Your token bills will thank you.**

*Installation complete. Ready to revolutionize your Cline experience.*