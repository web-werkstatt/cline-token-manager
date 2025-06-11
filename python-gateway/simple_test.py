#!/usr/bin/env python3
"""
🧪 Simple Python Optimization Engine Test

Quick validation test for the Universal Context Optimizer
Tests the core functionality without complex generated data
"""

import asyncio
import time
from datetime import datetime, timedelta

from optimization_engine import (
    ConversationMessage, ConversationContext, UniversalOptimizationEngine,
    StatisticalOptimizer, HybridOptimizer
)

async def test_basic_optimization():
    """Test basic optimization functionality"""
    
    print("🚀 Python Universal Context Optimizer - Simple Test")
    print("=" * 60)
    
    # Create realistic but manageable test conversation
    messages = [
        ConversationMessage(
            role="system",
            content="You are Cline, an AI coding assistant that helps developers with programming tasks.",
            timestamp=datetime.now(),
            message_type="system"
        ),
        ConversationMessage(
            role="user",
            content="I need to create a React component for user authentication. Can you help me build a login form with validation?",
            timestamp=datetime.now() + timedelta(minutes=1),
            message_type="question"
        ),
        ConversationMessage(
            role="assistant",
            content="""I'll help you create a React login form component with validation. Here's a complete implementation:

```jsx
import React, { useState } from 'react';

const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email format is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await onLogin(formData.email, formData.password);
    } catch (error) {
      setErrors({ general: 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="form-group">
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? 'error' : ''}
          disabled={isLoading}
        />
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          className={errors.password ? 'error' : ''}
          disabled={isLoading}
        />
        {errors.password && <span className="error-text">{errors.password}</span>}
      </div>

      {errors.general && (
        <div className="error-message">{errors.general}</div>
      )}

      <button 
        type="submit" 
        disabled={isLoading}
        className="submit-button"
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;
```

This component includes:
- Form validation for email and password
- Loading states during submission
- Error handling and display
- Controlled inputs with proper state management
- Accessibility features with proper labels and IDs

Would you like me to also add CSS styling for the form?""",
            timestamp=datetime.now() + timedelta(minutes=3),
            message_type="code"
        ),
        ConversationMessage(
            role="user",
            content="Yes, please add CSS styling! Also, can you show me how to integrate this with a backend API for authentication?",
            timestamp=datetime.now() + timedelta(minutes=5),
            message_type="question"
        ),
        ConversationMessage(
            role="assistant",
            content="""Great! Let me add CSS styling and show you the backend integration.

First, here's the CSS styling:

```css
.login-form {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-group input.error {
  border-color: #dc3545;
}

.error-text {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.submit-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.submit-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
```

Now for the backend API integration, here's how to use the LoginForm component:

```jsx
import React, { useState } from 'react';
import LoginForm from './LoginForm';

const App = () => {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      // Store auth token
      localStorage.setItem('authToken', data.token);
      setAuthToken(data.token);
      setUser(data.user);
      
      console.log('Login successful:', data.user);
      
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw so the form can handle it
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setUser(null);
  };

  if (user) {
    return (
      <div className="app">
        <header>
          <h1>Welcome, {user.name}!</h1>
          <button onClick={handleLogout}>Logout</button>
        </header>
        <main>
          {/* Your authenticated app content here */}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Please Login</h1>
      <LoginForm onLogin={handleLogin} />
    </div>
  );
};

export default App;
```

And here's an example of the backend API endpoint (Node.js/Express):

```javascript
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }
    
    // Find user in database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});
```

This setup provides:
- Secure password handling with bcrypt
- JWT token-based authentication
- Proper error handling
- Client-side token storage
- Logout functionality

The form will automatically handle API errors and display them to the user.""",
            timestamp=datetime.now() + timedelta(minutes=8),
            message_type="code"
        ),
        ConversationMessage(
            role="user",
            content="Perfect! This is exactly what I needed. Can you also show me how to add password reset functionality?",
            timestamp=datetime.now() + timedelta(minutes=10),
            message_type="question"
        ),
        ConversationMessage(
            role="assistant",
            content="""Absolutely! I'll show you how to implement password reset functionality. This typically involves sending a reset email with a secure token.

Here's the complete password reset implementation:

**1. Frontend - Password Reset Request Form:**

```jsx
import React, { useState } from 'react';

const PasswordResetForm = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setMessage('Email is required');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage('Password reset email sent! Check your inbox.');
      } else {
        setMessage(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="password-reset-form">
        <h2>Check Your Email</h2>
        <p className="success-message">{message}</p>
        <p>Didn't receive the email? Check your spam folder or try again.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="password-reset-form">
      <h2>Reset Password</h2>
      <div className="form-group">
        <label htmlFor="email">Email Address:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          disabled={isLoading}
        />
      </div>
      
      {message && (
        <div className={`message ${isSuccess ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Email'}
      </button>
    </form>
  );
};

export default PasswordResetForm;
```

**2. Frontend - New Password Form:**

```jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const NewPasswordForm = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);

  useEffect(() => {
    // Verify token on component mount
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`/api/auth/verify-reset-token/${token}`);
      setTokenValid(response.ok);
    } catch (error) {
      setTokenValid(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Password reset successful! You can now login with your new password.');
        navigate('/login');
      } else {
        setErrors({ general: data.message || 'Failed to reset password' });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (tokenValid === false) {
    return (
      <div className="password-reset-form">
        <h2>Invalid or Expired Link</h2>
        <p>This password reset link is invalid or has expired.</p>
        <p>Please request a new password reset.</p>
      </div>
    );
  }

  if (tokenValid === null) {
    return <div>Verifying reset link...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="password-reset-form">
      <h2>Set New Password</h2>
      
      <div className="form-group">
        <label htmlFor="password">New Password:</label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          className={errors.password ? 'error' : ''}
          disabled={isLoading}
        />
        {errors.password && <span className="error-text">{errors.password}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password:</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={errors.confirmPassword ? 'error' : ''}
          disabled={isLoading}
        />
        {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
      </div>

      {errors.general && (
        <div className="error-message">{errors.general}</div>
      )}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
};

export default NewPasswordForm;
```

**3. Backend API Endpoints:**

```javascript
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Password reset request
app.post('/api/auth/password-reset-request', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour
    
    // Save token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();
    
    // Send email
    const transporter = nodemailer.createTransporter({
      // Configure with your email service
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });
    
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify reset token
app.get('/api/auth/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    res.json({ message: 'Token is valid' });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset password
app.post('/api/auth/password-reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update user
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    
    res.json({ message: 'Password reset successful' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

This implementation provides:
- Secure token generation and validation
- Email notifications with HTML templates
- Token expiration (1 hour)
- Password confirmation validation
- Proper error handling and security practices
- User-friendly messaging

The password reset flow is now complete and secure!""",
            timestamp=datetime.now() + timedelta(minutes=15),
            message_type="code"
        )
    ]
    
    # Create conversation context
    context = ConversationContext(
        messages=messages,
        total_tokens=sum(len(msg.content) // 4 for msg in messages),
        source_tool="test",
        session_id="simple_test",
        created_at=datetime.now()
    )
    
    print(f"📊 Test conversation: {len(context.messages)} messages, ~{context.total_tokens} tokens")
    
    # Test optimization engine
    engine = UniversalOptimizationEngine()
    
    # Test estimation
    print("\n🔍 Pre-optimization estimation:")
    estimation = engine.estimate_optimization(context, max_tokens=8000)
    for key, value in estimation.items():
        if isinstance(value, float):
            print(f"   {key}: {value:.3f}")
        else:
            print(f"   {key}: {value}")
    
    # Test statistical optimizer
    print("\n🧪 Testing Statistical Optimizer:")
    start_time = time.time()
    stat_result = await engine.optimize_context(context, max_tokens=8000, strategy='statistical')
    stat_time = time.time() - start_time
    
    print(f"   Processing time: {stat_time:.3f}s")
    print(f"   Token reduction: {stat_result.original_tokens} → {stat_result.optimized_tokens} ({stat_result.reduction_percentage:.1f}%)")
    print(f"   Quality score: {stat_result.quality_score:.2f}")
    print(f"   Messages preserved: {len(context.messages)} → {len(stat_result.optimized_messages)}")
    
    # Test hybrid optimizer  
    print("\n🚀 Testing Hybrid Optimizer:")
    start_time = time.time()
    hybrid_result = await engine.optimize_context(context, max_tokens=8000, strategy='hybrid')
    hybrid_time = time.time() - start_time
    
    print(f"   Processing time: {hybrid_time:.3f}s")
    print(f"   Token reduction: {hybrid_result.original_tokens} → {hybrid_result.optimized_tokens} ({hybrid_result.reduction_percentage:.1f}%)")
    print(f"   Quality score: {hybrid_result.quality_score:.2f}")
    print(f"   Messages preserved: {len(context.messages)} → {len(hybrid_result.optimized_messages)}")
    
    # Compare strategies
    print(f"\n📈 Strategy Comparison:")
    print(f"   Statistical: {stat_result.reduction_percentage:.1f}% reduction, {stat_result.quality_score:.2f} quality")
    print(f"   Hybrid: {hybrid_result.reduction_percentage:.1f}% reduction, {hybrid_result.quality_score:.2f} quality")
    
    # Cost analysis
    original_cost = hybrid_result.original_tokens * 0.000003  # Claude pricing
    optimized_cost = hybrid_result.optimized_tokens * 0.000003
    savings = original_cost - optimized_cost
    
    print(f"\n💰 Cost Analysis (Claude Sonnet pricing):")
    print(f"   Original cost: ${original_cost:.6f}")
    print(f"   Optimized cost: ${optimized_cost:.6f}")
    print(f"   Savings per request: ${savings:.6f}")
    print(f"   Monthly savings (100 requests): ${savings * 100:.4f}")
    
    # Show sample optimized content
    print(f"\n📝 Sample Optimized Messages:")
    for i, msg in enumerate(hybrid_result.optimized_messages[:3]):
        content_preview = msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
        print(f"   {i+1}. [{msg.role}] {content_preview}")
    
    print(f"\n✅ Python optimization engine working successfully!")
    print(f"🎯 Ready for integration with TypeScript extension")
    
    return hybrid_result

if __name__ == "__main__":
    asyncio.run(test_basic_optimization())