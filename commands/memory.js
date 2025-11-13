const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../data/models/User');

const COOLDOWN_MS = 50 * 1000; // 50 seconds cooldown
const MAX_BET = 300;
const MIN_BET = 10;
const GRID_SIZE = 4; // 4x4 grid (8 pairs)
const TIME_LIMIT = 120000; // 2 minutes

const emojis = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🍑', '🥝'];

// Active games per user
const activeGames = new Map();

function createGrid() {
  // Create pairs
  const pairs = [];
  for (let i = 0; i < (GRID_SIZE * GRID_SIZE) / 2; i++) {
    pairs.push(emojis[i], emojis[i]);
  }
  
  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  
  // Create grid
  const grid = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    grid.push(pairs.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE));
  }
  
  return grid;
}

function createButtons(grid, revealed, matched) {
  const rows = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < GRID_SIZE; j++) {
      const id = `memory_${i}_${j}`;
      const isRevealed = revealed.some(([r, c]) => r === i && c === j);
      const isMatched = matched.some(([r, c]) => r === i && c === j);
      
      let emoji = '❓';
      let style = ButtonStyle.Primary;
      let disabled = false;
      
      if (isMatched) {
        emoji = grid[i][j];
        style = ButtonStyle.Success;
        disabled = true;
      } else if (isRevealed) {
        emoji = grid[i][j];
        style = ButtonStyle.Secondary;
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
    .setName('memory')
    .setDescription('Match pairs of emojis! Find all pairs to win.')
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
        content: '❌ You already have an active memory game! Finish it first.',
        ephemeral: true
      });
    }

    let user = await User.findOne({ discordId: userId });
    if (!user) user = await User.create({ discordId: userId });

    // Check cooldown
    if (!user.cooldowns) user.cooldowns = {};
    const lastPlayed = user.cooldowns.memory || new Date(0);
    const now = Date.now();
    
    if (now - new Date(lastPlayed).getTime() < COOLDOWN_MS) {
      const timeLeft = Math.ceil((COOLDOWN_MS - (now - new Date(lastPlayed).getTime())) / 1000);
      return interaction.reply({
        content: `⏳ You can play memory again in ${timeLeft} seconds!`,
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
    const grid = createGrid();
    const gameData = {
      grid,
      revealed: [],
      matched: [],
      bet,
      moves: 0,
      startTime: Date.now()
    };
    
    activeGames.set(userId, gameData);

    const embed = new EmbedBuilder()
      .setTitle('🧠 Memory Match')
      .setDescription(
        `**Bet:** $${bet}\n` +
        `**Pairs:** ${(GRID_SIZE * GRID_SIZE) / 2}\n\n` +
        `Click tiles to reveal them. Match all pairs to win!\n` +
        `Complete quickly for bonus multipliers!`
      )
      .setColor(0x5865F2)
      .addFields(
        { name: 'Moves', value: '0', inline: true },
        { name: 'Pairs Found', value: `0/${(GRID_SIZE * GRID_SIZE) / 2}`, inline: true },
        { name: 'Time', value: '0s', inline: true }
      );

    const buttons = createButtons(grid, [], []);

    await interaction.reply({
      embeds: [embed],
      components: buttons
    });

    // Set up collector
    const filter = i => i.user.id === userId && i.customId.startsWith('memory_');
    const collector = interaction.channel.createMessageComponentCollector({ 
      filter, 
      time: TIME_LIMIT
    });

    collector.on('collect', async i => {
      const game = activeGames.get(userId);
      if (!game) {
        await i.update({ content: '❌ Game expired!', embeds: [], components: [] });
        collector.stop();
        return;
      }

      const [_, row, col] = i.customId.split('_').map(Number);
      
      // Check if already revealed or matched
      const alreadyRevealed = game.revealed.some(([r, c]) => r === row && c === col);
      const alreadyMatched = game.matched.some(([r, c]) => r === row && c === col);
      
      if (alreadyRevealed || alreadyMatched) {
        await i.deferUpdate();
        return;
      }

      // Add to revealed
      game.revealed.push([row, col]);

      if (game.revealed.length === 2) {
        // Check for match
        const [r1, c1] = game.revealed[0];
        const [r2, c2] = game.revealed[1];
        
        game.moves++;
        
        const isMatch = game.grid[r1][c1] === game.grid[r2][c2];
        
        if (isMatch) {
          // Match found
          game.matched.push([r1, c1], [r2, c2]);
          game.revealed = [];
          
          const elapsedTime = Math.floor((Date.now() - game.startTime) / 1000);
          const pairsFound = game.matched.length / 2;
          const totalPairs = (GRID_SIZE * GRID_SIZE) / 2;

          const embed = new EmbedBuilder()
            .setTitle('🧠 Memory Match')
            .setDescription(
              `**Bet:** $${bet}\n` +
              `**Pairs:** ${totalPairs}\n\n` +
              `✅ Match found! Keep going!`
            )
            .setColor(0x57F287)
            .addFields(
              { name: 'Moves', value: `${game.moves}`, inline: true },
              { name: 'Pairs Found', value: `${pairsFound}/${totalPairs}`, inline: true },
              { name: 'Time', value: `${elapsedTime}s`, inline: true }
            );

          const buttons = createButtons(game.grid, game.revealed, game.matched);
          await i.update({ embeds: [embed], components: buttons });

          // Check if game won
          if (game.matched.length === GRID_SIZE * GRID_SIZE) {
            // Calculate winnings based on speed and moves
            let multiplier = 2.0; // Base multiplier for winning
            
            // Bonus for low moves (perfect = 8 moves for 8 pairs)
            const perfectMoves = totalPairs;
            if (game.moves <= perfectMoves) {
              multiplier += 1.0; // Perfect game bonus
            } else if (game.moves <= perfectMoves + 3) {
              multiplier += 0.5; // Good game bonus
            }
            
            // Bonus for speed (under 60 seconds)
            if (elapsedTime < 60) {
              multiplier += 0.5;
            }
            
            const winnings = Math.floor(game.bet * multiplier);
            
            user.balance += winnings;
            user.cooldowns.memory = new Date(now);
            await user.save();

            activeGames.delete(userId);
            collector.stop();

            const winEmbed = new EmbedBuilder()
              .setTitle('🏆 You Won!')
              .setDescription(
                `All pairs matched!\n\n` +
                `**Moves:** ${game.moves} (Perfect: ${perfectMoves})\n` +
                `**Time:** ${elapsedTime}s\n` +
                `**Multiplier:** ${multiplier.toFixed(1)}x\n` +
                `**Winnings:** $${winnings}`
              )
              .setColor(0xFFD700)
              .addFields({ name: 'New Balance', value: `$${user.balance}`, inline: true });

            await interaction.followUp({ embeds: [winEmbed] });
          }
        } else {
          // No match - show for 1.5 seconds then hide
          const buttons = createButtons(game.grid, game.revealed, game.matched);
          await i.update({ components: buttons });
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          game.revealed = [];
          const elapsedTime = Math.floor((Date.now() - game.startTime) / 1000);
          const pairsFound = game.matched.length / 2;
          const totalPairs = (GRID_SIZE * GRID_SIZE) / 2;

          const embed = new EmbedBuilder()
            .setTitle('🧠 Memory Match')
            .setDescription(
              `**Bet:** $${bet}\n` +
              `**Pairs:** ${totalPairs}\n\n` +
              `❌ No match. Try again!`
            )
            .setColor(0xED4245)
            .addFields(
              { name: 'Moves', value: `${game.moves}`, inline: true },
              { name: 'Pairs Found', value: `${pairsFound}/${totalPairs}`, inline: true },
              { name: 'Time', value: `${elapsedTime}s`, inline: true }
            );

          const hiddenButtons = createButtons(game.grid, [], game.matched);
          await interaction.editReply({ embeds: [embed], components: hiddenButtons });
        }
      } else {
        // First card revealed
        const buttons = createButtons(game.grid, game.revealed, game.matched);
        await i.update({ components: buttons });
      }
    });

    collector.on('end', async () => {
      if (activeGames.has(userId)) {
        const game = activeGames.get(userId);
        
        // Time's up - lose bet
        user.balance -= game.bet;
        user.cooldowns.memory = new Date(now);
        await user.save();

        activeGames.delete(userId);

        const timeoutEmbed = new EmbedBuilder()
          .setTitle('⏰ Time\'s Up!')
          .setDescription(
            `You ran out of time!\n\n` +
            `**Pairs found:** ${game.matched.length / 2}/${(GRID_SIZE * GRID_SIZE) / 2}\n` +
            `**Lost:** $${game.bet}`
          )
          .setColor(0xED4245)
          .addFields({ name: 'New Balance', value: `$${user.balance}`, inline: true });

        await interaction.followUp({ embeds: [timeoutEmbed] });
      }
    });
  }
};
