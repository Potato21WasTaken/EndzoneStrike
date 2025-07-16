const { SlashCommandBuilder } = require('discord.js');

const accounts = {
  tiktok: 'endzonestrike',
  instagram: 'endzonestrike',
  x: 'endzonestrike'
};

const allowedRoleId = '1374930372680351897'; // Only users with this role can use the command

module.exports = {
  data: new SlashCommandBuilder()
    .setName('newpost')
    .setDescription('Announce a new social media post')
    .addStringOption(opt =>
      opt.setName('platform')
        .setDescription('The social platform (required)')
        .setRequired(true)
        .addChoices(
          { name: 'TikTok', value: 'tiktok' },
          { name: 'Instagram', value: 'instagram' },
          { name: 'X / Twitter', value: 'x' }
        )
    )
    .addStringOption(opt =>
      opt.setName('postlink')
        .setDescription('Optional direct link to the new post')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Role check
    if (!interaction.member.roles.cache.has(allowedRoleId)) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const platform = interaction.options.getString('platform');
    const postLink = interaction.options.getString('postlink');

    const username = accounts[platform];
    if (!username) {
      return interaction.reply({ content: '❌ Invalid platform.', ephemeral: true });
    }

    const profileLinks = {
      tiktok: `https://www.tiktok.com/@${username}`,
      instagram: `https://www.instagram.com/${username}`,
      x: `https://x.com/${username}`
    };

    const finalLink = postLink || profileLinks[platform];

    const channel = interaction.guild.channels.cache.get(process.env.SOCIAL_CHANNEL_ID);
    const roleId = process.env.SOCIAL_PING_ROLE_ID;

    if (!channel) {
      return interaction.reply({ content: '❌ Post channel not found.', ephemeral: true });
    }

    await channel.send({
      content: `📢 New ${platform} post by @${username}! <@&${roleId}>\n${finalLink}`,
      allowedMentions: { roles: [roleId] }
    });

    await interaction.reply({ content: '✅ New post announcement sent.', ephemeral: true });
  }
};
