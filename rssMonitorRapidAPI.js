const axios = require('axios');

const feeds = {
  tiktok: {
    name: 'TikTok',
    username: 'bob4532835',
    lastId: null
  },
  instagram: {
    name: 'Instagram',
    username: 'testing2314',
    lastId: null
  },
  twitter: {
    name: 'X',
    username: 'IjZcji37263',
    lastId: null
  }
};

async function checkFeeds(client) {
  for (const key of Object.keys(feeds)) {
    const feed = feeds[key];
    try {
      let latestId = null;
      let postUrl = null;

      // TikTok via tiktok-scraper7
      if (key === 'tiktok') {
        const res = await axios.get('https://tiktok-scraper7.p.rapidapi.com/user/posts', {
          params: { unique_id: feed.username, count: 1 },
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'tiktok-scraper7.p.rapidapi.com'
          }
        });

        const post = res.data?.data?.videos?.[0];
        if (!post) continue;
        latestId = post.id;
        postUrl = `https://www.tiktok.com/@${feed.username}/video/${latestId}`;
      }

      // Instagram via instagram-scraper-stable-api → User Posts
      else if (key === 'instagram') {
        const res = await axios.get('https://instagram-scraper-stable-api.p.rapidapi.com/userPosts', {
          params: { username: feed.username },
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'instagram-scraper-stable-api.p.rapidapi.com'
          }
        });
        

        const post = res.data?.data?.[0];
        if (!post) continue;
        latestId = post?.id || post?.post_id || post?.post_url;
        postUrl = post?.post_url;
      }

      // Twitter via twitter-x-master → requires screen_name
      else if (key === 'twitter') {
        const res = await axios.get('https://twitter-x-master.p.rapidapi.com/user/tweets', {
          params: { screen_name: feed.username, limit: 1 },
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'twitter-x-master.p.rapidapi.com'
          }
        });

        const post = res.data?.[0];
        if (!post) continue;
        latestId = post?.tweet_id;
        postUrl = `https://x.com/${feed.username}/status/${post.tweet_id}`;
      }

      if (!latestId || feed.lastId === latestId) continue;

      feed.lastId = latestId;

      const channel = client.channels.cache.get(process.env.SOCIAL_CHANNEL_ID);
      if (channel) {
        await channel.send({
          content: `📢 New ${feed.name} post from @${feed.username}! <@&${process.env.SOCIAL_PING_ROLE_ID}>\n${postUrl}`,
          allowedMentions: { roles: [process.env.SOCIAL_PING_ROLE_ID] }
        });
      }

    } catch (err) {
      const errorMsg = `❌ Error checking ${feed.name}: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`;
      console.error(errorMsg);
      
      // Try to get the error reporter if available
      try {
        const initErrorReporter = require('./utils/error-reporter');
        if (process.env.ERROR_LOG_CHANNEL_ID && client) {
          const reporter = initErrorReporter({
            client,
            channelId: process.env.ERROR_LOG_CHANNEL_ID,
            botName: process.env.ERROR_REPORTER_NAME || 'EndzoneStrike Errors',
            rateLimitMs: 5000
          });
          
          const errorContext = [
            `Event: RSS Feed Check Error`,
            `Platform: ${feed.name}`,
            `Username: ${feed.username}`,
            `Error: ${err.stack || err.message || String(err)}`,
            err.response?.data ? `API Response: ${JSON.stringify(err.response.data, null, 2)}` : '',
          ].filter(Boolean).join('\n');
          
          reporter.report('RSS Monitor Error', errorContext).catch(() => {});
        }
      } catch (reporterErr) {
        // Silently fail if error reporter is not available
      }
    }
  }
}

module.exports = { checkFeeds };
