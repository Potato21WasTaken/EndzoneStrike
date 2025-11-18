# Manual Fix for Discord Code Generation Error

## File to Change
`discord/generate-code.js`

## What Changed
The `fetchBackend` function (around line 25) was updated to fix the JSON parsing error.

---

## BEFORE (Old Code - Lines 25-34):
```javascript
async function fetchBackend(endpoint, options = {}) {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}: ${data.error}`);
  }
  
  return data;
}
```

---

## AFTER (New Code - Replace with this):
```javascript
async function fetchBackend(endpoint, options = {}) {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, options);
  
  // Read response body as text first (can only read once)
  const responseText = await response.text();
  
  // Check if response is ok before parsing
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    
    // Try to parse as JSON first
    try {
      const data = JSON.parse(responseText);
      errorMessage = data.message || data.error || errorMessage;
    } catch (e) {
      // Response is not JSON (might be HTML error page)
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        errorMessage = `Backend server error (${response.status}). Is the backend running?`;
      } else if (responseText) {
        errorMessage = responseText;
      }
    }
    throw new Error(errorMessage);
  }
  
  // Parse successful response
  const data = JSON.parse(responseText);
  return data;
}
```

---

## What This Fixes
- **Before**: When the backend wasn't running or returned an HTML error page, the code tried to parse HTML as JSON and crashed with "Unexpected token '<'"
- **After**: Reads the response body once as text, then parses it appropriately. If it's HTML, shows a helpful message instead of crashing.
- **Also fixes**: "Body has already been read" error that occurred when trying to read the response multiple times

## How to Apply Manually
1. Open `discord/generate-code.js` in your code editor
2. Find the `fetchBackend` function (around line 25)
3. Replace the entire function with the "AFTER" code above
4. Save the file

That's it! The error should be fixed.
