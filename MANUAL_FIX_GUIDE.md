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
  
  // Check if response is ok before parsing
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.message || data.error || errorMessage;
    } catch (e) {
      // Response is not JSON (might be HTML error page)
      const text = await response.text();
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        errorMessage = `Backend server error (${response.status}). Is the backend running?`;
      } else {
        errorMessage = text || errorMessage;
      }
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  return data;
}
```

---

## What This Fixes
- **Before**: When the backend wasn't running or returned an HTML error page, the code tried to parse HTML as JSON and crashed with "Unexpected token '<'"
- **After**: Checks if the response is OK first, and if not, tries to parse the error message properly. If it's HTML, shows a helpful message instead of crashing.

## How to Apply Manually
1. Open `discord/generate-code.js` in your code editor
2. Find the `fetchBackend` function (around line 25)
3. Replace the entire function with the "AFTER" code above
4. Save the file

That's it! The error should be fixed.
