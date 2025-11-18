# Error Logging Implementation Summary

## Overview
This document summarizes the comprehensive error logging implementation that ensures every error in the EndzoneStrike bot is logged to a designated Discord channel and tracks when the bot goes down.

## Changes Made

### 1. Enhanced Error Reporter (`utils/error-reporter.js`)

#### New Features:
- **Process Lifecycle Tracking**
  - `SIGINT` handler: Tracks graceful shutdowns (Ctrl+C)
  - `SIGTERM` handler: Tracks process manager shutdowns
  - `exit` handler: Logs process exits with exit codes

- **Discord Connection Tracking**
  - `client.disconnect`: Tracks Discord gateway disconnections
  - `client.warn`: Captures Discord client warnings
  - `client.shardDisconnect`: Tracks shard disconnections with event details
  - `client.shardReconnecting`: Tracks shard reconnection attempts

- **Existing Features Retained**
  - `uncaughtException`: Catches unhandled exceptions
  - `unhandledRejection`: Catches unhandled promise rejections
  - `client.error`: Catches Discord client errors
  - `client.shardError`: Catches shard-specific errors
  - `process.warning`: Captures Node.js process warnings

### 2. Main Bot File (`index.js`)

#### Enhanced Error Reporting:
- **Bot Startup**: Reports successful bot startup with user tag
- **Command Execution Errors**: All command errors now include:
  - Command name
  - User information (tag and ID)
  - Guild information (name and ID)
  - Channel information (name and ID)
  - Full error stack trace

- **MongoDB Connection Monitoring**:
  - `connected`: Logs successful connections
  - `error`: Reports connection errors to error log channel
  - `disconnected`: Tracks when MongoDB connection is lost
  - `reconnected`: Reports when MongoDB connection is restored

- **Interaction Handler Errors**:
  - Shop purchase button errors with context
  - Shop confirmation button errors with context
  - Suggestion button errors with context
  - Modal submission errors with context

- **NoPing Protection Errors**: Message handling errors are caught and reported with:
  - Message content (truncated to 100 chars)
  - Author information
  - Guild information
  - Full error details

### 3. Backend API (`backend/index.js`)

#### New Error Handling:
- **Global Express Error Handler**: Catches all unhandled errors in routes
- **Uncaught Exception Handler**: Logs uncaught exceptions
- **Unhandled Rejection Handler**: Logs unhandled promise rejections
- **Process Signals**:
  - `SIGINT`: Graceful shutdown on Ctrl+C
  - `SIGTERM`: Graceful shutdown on process manager termination
- **Server Error Handler**: Handles server startup errors (e.g., port in use)

### 4. RSS Monitor (`rssMonitorRapidAPI.js`)

#### Enhanced Error Reporting:
- Detailed error logging for each social media platform (TikTok, Instagram, Twitter)
- Reports to error log channel when available, including:
  - Platform name
  - Username being monitored
  - Full error stack trace
  - API response data (if available)

## Configuration Required

### Environment Variables
To enable error logging, set the following in your `.env` file:

```env
# Required: Discord channel ID where errors will be logged
ERROR_LOG_CHANNEL_ID=your_channel_id_here

# Optional: Custom bot name in error messages (defaults to "EndzoneStrike Errors")
ERROR_REPORTER_NAME=EndzoneStrike Errors
```

### Setting Up Error Log Channel
1. Create a dedicated channel in your Discord server (e.g., `#error-logs`)
2. Right-click the channel and copy its ID
3. Add the ID to your `.env` file as `ERROR_LOG_CHANNEL_ID`
4. Ensure the bot has permissions to send messages in that channel

## What Gets Logged

### Critical Events
- ✅ Bot startup
- ❌ Bot shutdown (SIGINT, SIGTERM)
- ❌ Uncaught exceptions
- ❌ Unhandled promise rejections
- ❌ Discord client errors and disconnections
- ❌ MongoDB connection issues

### Command & Interaction Errors
- ❌ Slash command execution errors
- ❌ Button interaction errors (shop, suggestions)
- ❌ Modal submission errors
- ❌ Message handling errors

### External Service Errors
- ❌ RSS feed monitoring errors (social media APIs)
- ❌ Backend API errors
- ❌ Database operation errors

## Error Message Format

All error messages include:
- 🔴 Error indicator
- Timestamp
- System information (uptime, Node version, platform, memory usage)
- Event type
- Error details with stack trace
- Contextual information (user, guild, channel when applicable)

For errors with long messages, the details are sent as an attached text file.

## Rate Limiting

The error reporter includes rate limiting (default: 5 seconds) to prevent spam if multiple errors occur rapidly. Errors that are rate-limited are still logged to the console.

## Testing

To test the error logging system:

1. **Test Bot Startup**: Start the bot and check the error log channel for the startup message
2. **Test Command Error**: Intentionally trigger an error in a command
3. **Test Shutdown**: Stop the bot with Ctrl+C and verify the shutdown is logged
4. **Test Database Error**: Disconnect MongoDB and verify the error is logged

## Maintenance

### Reviewing Logs
- Check the error log channel regularly for issues
- Pay attention to recurring errors that may indicate systemic problems
- Use error context (user, guild, command) to identify patterns

### Adjusting Rate Limiting
If you need to adjust the rate limit, modify the `rateLimitMs` parameter in `index.js`:

```javascript
reporter = initErrorReporter({
  client,
  channelId: process.env.ERROR_LOG_CHANNEL_ID,
  botName: process.env.ERROR_REPORTER_NAME || 'EndzoneStrike Errors',
  rateLimitMs: 5000  // Change this value (in milliseconds)
});
```

## Benefits

1. **Complete Visibility**: Every error is logged, no more mystery crashes
2. **Downtime Tracking**: Know when and why the bot goes offline
3. **Context-Rich Errors**: Each error includes relevant context for debugging
4. **Proactive Monitoring**: Catch issues before users report them
5. **Centralized Logging**: All errors in one Discord channel for easy monitoring
6. **Performance Insights**: System information helps identify resource issues

## Notes

- The error reporter is fail-safe: if reporting fails, errors are still logged to console
- The bot continues running even if the error reporter fails to initialize
- Error messages longer than 1900 characters are sent as file attachments
- The error reporter caches the channel after the first fetch for better performance
