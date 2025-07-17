const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const animeSets = require('../data/anime_sets.js');

// Game lock map (per channel)
const activeGames = new Set();

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guess-anime')
    .setDescription('Guess all the anime from the selected set!')
    .addStringOption(option =>
      option.setName('set')
        .setDescription('Choose a set number')
        .setRequired(true)
        .addChoices(
          { name: 'Set 1', value: 'set1' },
          { name: 'Set 2', value: 'set2' },
          { name: 'Set 3', value: 'set3' }
        )
    ),

  async execute(interaction) {
    const setName = interaction.options.getString('set');
    const animeList = animeSets[setName];

    if (!animeList || animeList.length < 1) {
      return await interaction.reply({
        content: '❌ That set is empty or doesn’t exist.',
        ephemeral: true
      });
    }

    if (!interaction.channel) {
      return await interaction.reply({
        content: '❌ Cannot start the game in this context.',
        ephemeral: true
      });
    }

    const channelId = interaction.channel.id;

    if (activeGames.has(channelId)) {
      return await interaction.reply({
        content: '⏳ A game is already running in this channel. Please wait for it to finish.',
        ephemeral: true
      });
    }

    activeGames.add(channelId);

    await interaction.reply({ content: `🎮 Starting the anime quiz for **${setName}**!` });

    for (let round = 0; round < animeList.length; round++) {
      const currentAnime = animeList[round];
      const imageURL = currentAnime.images[0];

      const decoys = animeList.filter(a => a.name !== currentAnime.name);
      shuffle(decoys);
      const choices = shuffle([currentAnime.name, ...decoys.slice(0, 3).map(a => a.name)]);

      const idToName = {};
      const buttons = new ActionRowBuilder();

      choices.forEach((name, index) => {
        const id = `guess_${index}`;
        idToName[id] = name;
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(id)
            .setLabel(name)
            .setStyle(ButtonStyle.Primary)
        );
      });

      const questionEmbed = new EmbedBuilder()
        .setTitle(`🎯 Round ${round + 1}/${animeList.length}`)
        .setDescription('Guess the anime! You’ll see the answer in 30 seconds.')
        .setImage(imageURL)
        .setColor(0x00AE86);

      const sent = await interaction.channel.send({
        embeds: [questionEmbed],
        components: [buttons]
      });

      const guesses = new Map();

      const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000,
        filter: i => Object.keys(idToName).includes(i.customId)
      });

      collector.on('collect', async i => {
        const userId = i.user.id;

        if (guesses.has(userId)) {
          await i.reply({
            content: '🛑 You already answered this round!',
            ephemeral: true
          });
          return;
        }

        const choiceId = i.customId;
        const guessedName = idToName[choiceId];

        guesses.set(userId, guessedName);

        await i.reply({
          content: '✅ Your guess has been recorded!',
          ephemeral: true
        });
      });

      await new Promise(resolve => {
        collector.on('end', async () => {
          const correctUsers = [];

          for (const [userId, guess] of guesses.entries()) {
            if (guess === currentAnime.name) {
              correctUsers.push(`<@${userId}>`);
            }
          }

          const resultEmbed = new EmbedBuilder()
            .setTitle('🕒 Time’s up!')
            .setDescription(`The correct answer was **${currentAnime.name}**.`)
            .setImage(imageURL)
            .setColor(0xFFD700);

          if (correctUsers.length > 0) {
            resultEmbed.addFields({
              name: '✅ Correct Guesses',
              value: correctUsers.join(', ')
            });
          } else {
            resultEmbed.addFields({
              name: '❌ No one got it right!',
              value: 'Better luck next round!'
            });
          }

          try {
            await sent.edit({
              content: '',
              embeds: [resultEmbed],
              components: []
            });

            setTimeout(() => {
              sent.delete().catch(err => console.warn('Failed to delete message:', err.message));
            }, 5000);
          } catch (err) {
            console.warn('Failed to edit message:', err.message);
          }

          resolve();
        });
      });
    }

    activeGames.delete(channelId);
    await interaction.channel.send('🏁 **Quiz complete!** Thanks for playing!');
  }
};
