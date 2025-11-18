// utils/error-reporter.js
// Lightweight global error reporter for a Discord bot (CommonJS).
// Usage: const initErrorReporter = require('./utils/error-reporter');
// initErrorReporter({ client, channelId: process.env.ERROR_LOG_CHANNEL_ID });

const os = require('os');

module.exports = function initErrorReporter({
  client,
  channelId,
  botName = 'ErrorReporter',
  rateLimitMs = 5000, // avoid spamming the channel
} = {}) {
  if (!client) throw new Error('client is required for initErrorReporter');
  if (!channelId) throw new Error('channelId is required for initErrorReporter');

  let lastSent = 0;
  let cachedChannel = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function shortSystemInfo() {
    return [
      `Time: ${nowIso()}`,
      `Uptime: ${Math.floor(process.uptime())}s`,
      `Node: ${process.version}`,
      `Platform: ${process.platform} ${os.type()} ${os.release()}`,
      `Memory (rss/heapUsed): ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB / ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`,
    ].join('\n');
  }

  function normalizeReason(reason) {
    if (reason instanceof Error) return reason.stack || reason.message;
    try {
      return typeof reason === 'string' ? reason : JSON.stringify(reason, null, 2);
    } catch {
      return String(reason);
    }
  }

  // Cache the channel after the client is ready so fetch won't fail at startup
  if (typeof client.once === 'function') {
    client.once('ready', async () => {
      try {
        cachedChannel = await client.channels.fetch(channelId).catch(() => null);
      } catch {
        cachedChannel = null;
      }
    });
  }

  async function sendToChannel(body, filename = 'error.txt') {
    try {
      const now = Date.now();
      if (rateLimitMs > 0 && now - lastSent < rateLimitMs) {
        // Skip sending to avoid spam, but still log locally
        console.warn('[error-reporter] rate limited error (skipped sending to channel)');
        console.warn(body);
        return;
      }
      lastSent = now;

      // Use cached channel when available, otherwise fetch live
      const channel = cachedChannel || (await client.channels.fetch(channelId).catch(() => null));
      if (!channel || typeof channel.send !== 'function') {
        console.error('[error-reporter] Could not fetch channel with ID', channelId);
        console.error(body);
        return;
      }

      // Discord message length limit ~2000 chars. If too long, send as a file.
      if (body.length > 1900) {
        await channel.send({
          content: `🔴 **${botName} — Error captured**\n\`\`\`text\n${shortSystemInfo()}\n\`\`\``,
          files: [{ attachment: Buffer.from(body, 'utf8'), name: filename }],
        });
      } else {
        // Wrap in code block for readability
        await channel.send({
          content: `🔴 **${botName} — Error captured**\n\`\`\`text\n${shortSystemInfo()}\n\n${body}\n\`\`\``,
        });
      }
    } catch (err) {
      // If sending to Discord fails, log to console so at least it's somewhere
      console.error('[error-reporter] Failed to send error to channel:', err);
      console.error(body);
    }
  }

  // Handlers
  process.on('unhandledRejection', async (reason, promise) => {
    const body = [
      'Event: unhandledRejection',
      'Reason:',
      normalizeReason(reason),
    ].join('\n\n');
    await sendToChannel(body, 'unhandledRejection.txt');
  });

  process.on('uncaughtException', async (err) => {
    const body = [
      'Event: uncaughtException',
      'Error:',
      err && err.stack ? err.stack : String(err),
    ].join('\n\n');
    await sendToChannel(body, 'uncaughtException.txt');
    // NOTE: consider process.exit(1) here in production after reporting
  });

  // Track process exit/shutdown
  process.on('exit', async (code) => {
    const body = [
      'Event: process.exit',
      `Exit Code: ${code}`,
      `Uptime: ${Math.floor(process.uptime())}s`,
    ].join('\n\n');
    // Note: async operations may not complete in exit handler
    console.log('[error-reporter] Bot process exiting with code:', code);
  });

  // Track graceful shutdowns
  process.on('SIGINT', async () => {
    const body = [
      'Event: SIGINT (Graceful Shutdown)',
      'Bot received SIGINT signal (Ctrl+C or process manager shutdown)',
    ].join('\n\n');
    await sendToChannel(body, 'shutdown-SIGINT.txt');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    const body = [
      'Event: SIGTERM (Graceful Shutdown)',
      'Bot received SIGTERM signal (process manager shutdown)',
    ].join('\n\n');
    await sendToChannel(body, 'shutdown-SIGTERM.txt');
    process.exit(0);
  });

  // Discord client-level errors
  if (client && typeof client.on === 'function') {
    client.on('error', async (err) => {
      const body = [
        'Event: client.error',
        err && err.stack ? err.stack : String(err),
      ].join('\n\n');
      await sendToChannel(body, 'client.error.txt');
    });

    // Track Discord disconnections
    client.on('disconnect', async () => {
      const body = [
        'Event: client.disconnect',
        'Discord client disconnected from gateway',
      ].join('\n\n');
      await sendToChannel(body, 'client.disconnect.txt');
    });

    // Track when bot goes offline/resumes
    client.on('warn', async (info) => {
      const body = [
        'Event: client.warn',
        String(info),
      ].join('\n\n');
      await sendToChannel(body, 'client.warn.txt');
    });

    // If using sharding or newer discord.js, capture shard errors
    client.on('shardError', async (error, shardId) => {
      const body = [
        `Event: client.shardError (shard ${shardId})`,
        error && error.stack ? error.stack : String(error),
      ].join('\n\n');
      await sendToChannel(body, `shardError-${shardId}.txt`);
    });

    // Track shard disconnections
    client.on('shardDisconnect', async (event, shardId) => {
      const body = [
        `Event: client.shardDisconnect (shard ${shardId})`,
        `Close Event: ${JSON.stringify(event, null, 2)}`,
      ].join('\n\n');
      await sendToChannel(body, `shardDisconnect-${shardId}.txt`);
    });

    // Track shard reconnections
    client.on('shardReconnecting', async (shardId) => {
      const body = [
        `Event: client.shardReconnecting (shard ${shardId})`,
        'Shard is attempting to reconnect',
      ].join('\n\n');
      await sendToChannel(body, `shardReconnecting-${shardId}.txt`);
    });
  }

  // Optionally capture warnings
  process.on('warning', async (warning) => {
    const body = [
      'Event: process.warning',
      warning && warning.stack ? warning.stack : String(warning),
    ].join('\n\n');
    await sendToChannel(body, 'process.warning.txt');
  });

  // Expose manual reporter
  return {
    report: async (title, payload) => {
      const body = [
        `Event: ${title}`,
        typeof payload === 'string' ? payload : (payload && payload.stack ? payload.stack : JSON.stringify(payload, null, 2)),
      ].join('\n\n');
      await sendToChannel(body, `${title.replace(/\s+/g, '_')}.txt`);
    },
  };
};