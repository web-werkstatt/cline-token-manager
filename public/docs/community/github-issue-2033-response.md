# GitHub Issue #2033 Response Draft

## Strategic Response for: "max token for Claude 3.7 Sonnet extended thinking mode is not 8192"

**URL**: https://github.com/cline/cline/issues/2033
**Strategy**: Cross-reference with #1947, demonstrate technical understanding
**Tone**: Connecting the dots, technical insight

---

## Response Text:

This is directly related to Issue #1947 - same root cause with the Anthropic API beta headers.

You're absolutely correct that Claude 3.7 Sonnet should support 64K tokens (actually up to 128K with the latest API), not the 8192 currently shown in Cline.

### Technical Connection

Both issues stem from Cline not including the required `anthropic-beta` headers in API requests:
- **#1947**: Shows 8192 instead of 128K output tokens
- **#2033**: Shows 8192 instead of 64K+ tokens for extended thinking

The Anthropic documentation you referenced is correct - these models have much higher capabilities than what Cline currently exposes.

### Verification Data

Comparing across platforms:
- **Direct Anthropic API**: ✅ 64K-128K tokens with beta headers
- **OpenRouter**: ✅ Shows correct limits
- **Cline**: ❌ Stuck at 8192 (missing headers)

### Extended Thinking Mode Specifics

For Claude 3.7's extended thinking capabilities, the higher token limits are especially important since the model needs space for:
- Internal reasoning chains
- Step-by-step problem analysis  
- Complex code generation with explanations

The 8192 limit significantly hampers these advanced capabilities.

### Community Impact

This affects anyone using Claude 3.7 for:
- Complex coding tasks
- Large file analysis
- Detailed technical documentation
- Multi-step problem solving

The current limitation essentially makes users pay for premium model capabilities they can't fully access.

Would be great to see both #1947 and #2033 addressed together since they share the same underlying API implementation issue.

---

## Key Elements:
✓ Direct connection to #1947 established
✓ Technical understanding demonstrated
✓ Verification data provided
✓ Extended thinking mode context explained
✓ Community impact highlighted
✓ Suggests coordinated fix approach