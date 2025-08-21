# 🔄 Claude Agent State Flow

## **Corrected State Flow Understanding**

### **State Definitions:**
- ⚪ **idle** - Agent ready for input
- 🔵 **busy** - Agent processing user prompt  
- 🟢 **done** - Prompt completed, ready for next input
- ❌ **error** - Error during prompt processing
- ❓ **unknown** - State unclear
- 🛑 **terminated** - Session ended

### **State Transitions:**

```
Launch → ⚪ idle
        ↓ (user gives input)
       🔵 busy 
        ↓ (Stop hook: prompt completed)
       🟢 done
        ↓ (ready for next input)
       ⚪ idle
        ↓ (session exits)
       🛑 terminated
```

## **Hook Integration:**

### **Stop Hook (claude_stop_hook.sh):**
- **Triggers:** When Claude finishes processing current prompt
- **State Change:** `busy` → `done` (or `error` if failed)
- **Means:** Agent ready for next input

### **Session Termination Monitor:**
- **Triggers:** When tmux session actually ends
- **State Change:** Any state → `terminated`  
- **Means:** Session no longer exists

## **Detection Methods:**

### **1. Input Detection (User → Busy):**
Currently missing - need to detect when user starts typing/sends prompt

**Potential Solutions:**
- Monitor tmux pane activity
- Hook into terminal input events
- Watch for prompt patterns in session logs

### **2. Stop Hook (Busy → Done):**
✅ **Implemented** - Claude Code Stop hook

### **3. Termination Detection (Any → Terminated):**
✅ **Implemented** - tmux session monitoring

## **Implementation Status:**

| Transition | Status | Method |
|------------|--------|--------|
| Launch → Idle | ✅ | Extension spawn logic |
| Idle → Busy | ⚠️ Missing | Need input detection |
| Busy → Done/Error | ✅ | Claude Code Stop hook |
| Done → Idle | ✅ | Automatic after Stop hook |
| Any → Terminated | ✅ | tmux session monitor |

## **Next Steps:**

1. **Add input detection** to catch `idle` → `busy` transition
2. **Auto-reset to idle** after `done` state (brief delay)
3. **Test complete flow** with real Claude Code sessions

## **Visual Flow Example:**

```
🏭 ⚪ FA-S-TC-001  (just launched, ready)
     ↓ (user types prompt)
🏭 🔵 FA-S-TC-001  (processing your request)
     ↓ (Claude finishes, Stop hook triggers)  
🏭 🟢 FA-S-TC-001  (response complete, ready for next)
     ↓ (auto-reset after 3 seconds)
🏭 ⚪ FA-S-TC-001  (ready for next prompt)
     ↓ (user exits session)
🏭 🛑 FA-S-TC-001  (session terminated)
```

This gives you **real-time visual feedback** of exactly what your agents are doing! 🎯