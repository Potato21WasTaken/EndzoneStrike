const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../data/models/User');

const COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown
const MAX_BET = 500;
const MIN_BET = 10;
const GRID_SIZE = 4; // 4x5 grid (4 rows, 5 columns)
const GRID_COLS = 5;
const MINE_COUNT = 4; // Number of mines (reduced from 5 to match smaller grid)
const SAFE_MULTIPLIER = 0.3; // Each safe tile adds 30% to your bet

// Active games per user
const activeGames = new Map();

function createMinefield() {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_COLS).fill(false));
  const mines = new Set();
  
  // Place mines randomly
  while (mines.size < MINE_COUNT) {
    const pos = Math.floor(Math.random() * (GRID_SIZE * GRID_COLS));
    mines.add(pos);
  }
  
  mines.forEach(pos => {
    const row = Math.floor(pos / GRID_COLS);
    const col = pos % GRID_COLS;
    grid[row][col] = true; // true = mine
  });
  
  return grid;
}

function createButtons(revealed, gameOver = false) {
  const rows = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < GRID_COLS; j++) {
      const id = `mine_${i}_${j}`;
      const cell = revealed[i][j];
      
      let emoji = '❓';
      let style = ButtonStyle.Primary;
      let disabled = gameOver;
      
      if (cell === 'safe') {
        emoji = '✅';
        style = ButtonStyle.Success;
        disabled = true;
      } else if (cell === 'mine') {
        emoji = '💣';
        style = ButtonStyle.Danger;
        disabled = true;
      }
      
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(id)
          .setEmoji(emoji)
          .setStyle(style)
          .setDisabled(disabled)
      );
    }
    rows.push(row);
  }
  return rows;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('minefield')
    .setDescription('Navigate through a minefield! Avoid the mines and cash out to win.')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(MAX_BET)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet');

    // Check if user already has an active game
    if (activeGames.has(userId)) {
      return interaction.reply({
        content: '❌ You already have an active minefield game! Finish or cash out first.',
        ephemeral: true
      });
    }

    let user = await User.findOne({ discordId: userId });
    if (!user) user = await User.create({ discordId: userId });

    // Check cooldown
    if (!user.cooldowns) user.cooldowns = {};
    const lastPlayed = user.cooldowns.minefield || new Date(0);
    const now = Date.now();
    
    if (now - new Date(lastPlayed).getTime() < COOLDOWN_MS) {
      const timeLeft = Math.ceil((COOLDOWN_MS - (now - new Date(lastPlayed).getTime())) / 1000);
      return interaction.reply({
        content: `⏳ You can play minefield again in ${timeLeft} seconds!`,
        ephemeral: true
      });
    }

    // Check if user has enough money
    if (user.balance < bet) {
      return interaction.reply({
        content: `❌ You don't have enough money! Your balance: $${user.balance}`,
        ephemeral: true
      });
    }

    // Create game
    const minefield = createMinefield();
    const revealed = Array(GRID_SIZE).fill(null).map(() => Array(GRID_COLS).fill(null));
    const gameData = {
      minefield,
      revealed,
      bet,
      safeTiles: 0,
      totalSafe: GRID_SIZE * GRID_COLS - MINE_COUNT
    };
    
    activeGames.set(userId, gameData);

    const embed = new EmbedBuilder()
      .setTitle('💣 Minefield')
      .setDescription(
        `**Bet:** $${bet}\n` +
        `**Mines:** ${MINE_COUNT}\n` +
        `**Safe tiles:** ${gameData.totalSafe}\n\n` +
        `Click tiles to reveal them. Each safe tile increases your winnings by ${SAFE_MULTIPLIER * 100}%!\n` +
        `Use the **Cash Out** button to collect your winnings, or hit a mine and lose everything!`
      )
      .setColor(0x5865F2)
      .addFields(
        { name: 'Current Multiplier', value: '1.0x', inline: true },
        { name: 'Potential Winnings', value: `$${bet}`, inline: true },
        { name: 'Safe Tiles Found', value: `0/${gameData.totalSafe}`, inline: true }
      );

    const buttons = createButtons(revealed);
    
    // Add cash out button
    const cashOutRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('minefield_cashout')
        .setLabel('💰 Cash Out')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true) // Disabled until at least one safe tile
    );

    await interaction.reply({
      embeds: [embed],
      components: [...buttons, cashOutRow]
    });

    // Set up collector
    const filter = i => i.user.id === userId && (i.customId.startsWith('mine_') || i.customId === 'minefield_cashout');
    const collector = interaction.channel.createMessageComponentCollector({ 
      filter, 
      time: 300000 // 5 minutes
    });

    collector.on('collect', async i => {
      const game = activeGames.get(userId);
      if (!game) {
        await i.deferUpdate();
        await interaction.editReply({ content: '❌ Game expired!', embeds: [], components: [] });
        collector.stop();
        return;
      }

      if (i.customId === 'minefield_cashout') {
        // Cash out
        const multiplier = 1 + (game.safeTiles * SAFE_MULTIPLIER);
        const winnings = Math.floor(game.bet * multiplier);
        
        user.balance += winnings;
        user.cooldowns.minefield = new Date(now);
        await user.save();

        activeGames.delete(userId);
        collector.stop();

        const finalEmbed = new EmbedBuilder()
          .setTitle('💰 Cashed Out!')
          .setDescription(
            `You successfully cashed out!\n\n` +
            `**Safe tiles found:** ${game.safeTiles}/${game.totalSafe}\n` +
            `**Multiplier:** ${multiplier.toFixed(1)}x\n` +
            `**Winnings:** $${winnings}`
          )
          .setColor(0x57F287)
          .addFields({ name: 'New Balance', value: `$${user.balance}`, inline: true });

        await i.deferUpdate();
        await interaction.editReply({ embeds: [finalEmbed], components: [] });
        return;
      }

      // Tile click
      const [_, row, col] = i.customId.split('_').map(Number);
      
      if (game.revealed[row][col]) {
        await i.deferUpdate();
        return;
      }

      const isMine = game.minefield[row][col];
      
      if (isMine) {
        // Hit a mine - game over
        game.revealed[row][col] = 'mine';
        
        // Reveal all mines
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            if (game.minefield[r][c]) {
              game.revealed[r][c] = 'mine';
            }
          }
        }

        user.balance -= game.bet;
        user.cooldowns.minefield = new Date(now);
        await user.save();

        activeGames.delete(userId);
        collector.stop();

        const loseEmbed = new EmbedBuilder()
          .setTitle('💥 BOOM!')
          .setDescription(
            `You hit a mine and lost $${game.bet}!\n\n` +
            `**Safe tiles found:** ${game.safeTiles}/${game.totalSafe}`
          )
          .setColor(0xED4245)
          .addFields({ name: 'New Balance', value: `$${user.balance}`, inline: true });

        const finalButtons = createButtons(game.revealed, true);
        await i.deferUpdate();
        await interaction.editReply({ embeds: [loseEmbed], components: finalButtons });
        return;
      }

      // Safe tile
      game.revealed[row][col] = 'safe';
      game.safeTiles++;

      const multiplier = 1 + (game.safeTiles * SAFE_MULTIPLIER);
      const potentialWinnings = Math.floor(game.bet * multiplier);

      const updatedEmbed = new EmbedBuilder()
        .setTitle('💣 Minefield')
        .setDescription(
          `**Bet:** $${game.bet}\n` +
          `**Mines:** ${MINE_COUNT}\n` +
          `**Safe tiles:** ${game.totalSafe}\n\n` +
          `✅ Safe! Keep going or cash out now!`
        )
        .setColor(0x57F287)
        .addFields(
          { name: 'Current Multiplier', value: `${multiplier.toFixed(1)}x`, inline: true },
          { name: 'Potential Winnings', value: `$${potentialWinnings}`, inline: true },
          { name: 'Safe Tiles Found', value: `${game.safeTiles}/${game.totalSafe}`, inline: true }
        );

      const updatedButtons = createButtons(game.revealed);
      const updatedCashOut = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('minefield_cashout')
          .setLabel('💰 Cash Out')
          .setStyle(ButtonStyle.Success)
          .setDisabled(false)
      );

      await i.deferUpdate();
      await interaction.editReply({ embeds: [updatedEmbed], components: [...updatedButtons, updatedCashOut] });

      // Check if all safe tiles found
      if (game.safeTiles === game.totalSafe) {
        user.balance += potentialWinnings;
        user.cooldowns.minefield = new Date(now);
        await user.save();

        activeGames.delete(userId);
        collector.stop();

        const winEmbed = new EmbedBuilder()
          .setTitle('🏆 PERFECT! All Safe Tiles Found!')
          .setDescription(
            `You found all safe tiles!\n\n` +
            `**Multiplier:** ${multiplier.toFixed(1)}x\n` +
            `**Winnings:** $${potentialWinnings}`
          )
          .setColor(0xFFD700)
          .addFields({ name: 'New Balance', value: `$${user.balance}`, inline: true });

        // Update the message one final time with the win embed
        await interaction.editReply({ embeds: [winEmbed], components: [] });
      }
    });

    collector.on('end', () => {
      if (activeGames.has(userId)) {
        activeGames.delete(userId);
      }
    });
  }
};