const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../data/models/User');

const COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown
const MAX_BET = 500;
const MIN_BET = 10;
const ROWS = 6;
const COLS = 7;
const TIMEOUT = 180000; // 3 minutes

// Active games per channel
const activeGames = new Map();

function createBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

function checkWin(board, row, col, player) {
  // Check horizontal
  let count = 1;
  for (let c = col - 1; c >= 0 && board[row][c] === player; c--) count++;
  for (let c = col + 1; c < COLS && board[row][c] === player; c++) count++;
  if (count >= 4) return true;

  // Check vertical
  count = 1;
  for (let r = row - 1; r >= 0 && board[r][col] === player; r--) count++;
  for (let r = row + 1; r < ROWS && board[r][col] === player; r++) count++;
  if (count >= 4) return true;

  // Check diagonal (/)
  count = 1;
  for (let i = 1; row - i >= 0 && col + i < COLS && board[row - i][col + i] === player; i++) count++;
  for (let i = 1; row + i < ROWS && col - i >= 0 && board[row + i][col - i] === player; i++) count++;
  if (count >= 4) return true;

  // Check diagonal (\)
  count = 1;
  for (let i = 1; row - i >= 0 && col - i >= 0 && board[row - i][col - i] === player; i++) count++;
  for (let i = 1; row + i < ROWS && col + i < COLS && board[row + i][col + i] === player; i++) count++;
  if (count >= 4) return true;

  return false;
}

function dropPiece(board, col, player) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) {
      board[row][col] = player;
      return row;
    }
  }
  return -1; // Column full
}

function createButtons(board, currentPlayer, gameOver = false) {
  const rows = [];
  
  // Add column select buttons
  const selectRow = new ActionRowBuilder();
  for (let c = 0; c < COLS; c++) {
    const isFull = board[0][c] !== 0;
    selectRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`c4_${c}`)
        .setLabel(`${c + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(isFull || gameOver)
    );
  }
  rows.push(selectRow);

  // Add board display
  let boardStr = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === 0) boardStr += '⚪';
      else if (board[r][c] === 1) boardStr += '🔴';
      else boardStr += '🟡';
    }
    boardStr += '\n';
  }
  boardStr += '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';

  return { rows, boardStr };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('connect4')
    .setDescription('Play Connect 4 against another player!')
    .addUserOption(option =>
      option.setName('opponent')
        .setDescription('Player to challenge')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount to bet (winner takes all)')
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(MAX_BET)
    ),

  async execute(interaction) {
    const challenger = interaction.user;
    const opponent = interaction.options.getUser('opponent');
    const bet = interaction.options.getInteger('bet');
    const channelId = interaction.channel.id;

    // Validation
    if (opponent.bot) {
      return interaction.reply({
        content: '❌ You cannot play against a bot!',
        ephemeral: true
      });
    }

    if (opponent.id === challenger.id) {
      return interaction.reply({
        content: '❌ You cannot play against yourself!',
        ephemeral: true
      });
    }

    if (activeGames.has(channelId)) {
      return interaction.reply({
        content: '❌ There is already a Connect 4 game in this channel!',
        ephemeral: true
      });
    }

    // Check balances
    let challengerUser = await User.findOne({ discordId: challenger.id });
    if (!challengerUser) challengerUser = await User.create({ discordId: challenger.id });

    let opponentUser = await User.findOne({ discordId: opponent.id });
    if (!opponentUser) opponentUser = await User.create({ discordId: opponent.id });

    // Check cooldown for challenger
    if (!challengerUser.cooldowns) challengerUser.cooldowns = {};
    const lastPlayed = challengerUser.cooldowns.connect4 || new Date(0);
    const now = Date.now();
    
    if (now - new Date(lastPlayed).getTime() < COOLDOWN_MS) {
      const timeLeft = Math.ceil((COOLDOWN_MS - (now - new Date(lastPlayed).getTime())) / 1000);
      return interaction.reply({
        content: `⏳ You can play connect4 again in ${timeLeft} seconds!`,
        ephemeral: true
      });
    }

    if (challengerUser.balance < bet) {
      return interaction.reply({
        content: `❌ You don't have enough money! Your balance: $${challengerUser.balance}`,
        ephemeral: true
      });
    }

    if (opponentUser.balance < bet) {
      return interaction.reply({
        content: `❌ ${opponent.username} doesn't have enough money for this bet!`,
        ephemeral: true
      });
    }

    // Create accept/decline buttons
    const acceptRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('c4_accept')
        .setLabel('✅ Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('c4_decline')
        .setLabel('❌ Decline')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      content: `${opponent}, ${challenger.username} challenges you to Connect 4 for $${bet}! Do you accept?`,
      components: [acceptRow]
    });

    // Wait for response
    const filter = i => i.user.id === opponent.id && (i.customId === 'c4_accept' || i.customId === 'c4_decline');
    
    try {
      const response = await interaction.channel.awaitMessageComponent({
        filter,
        time: 60000
      });

      if (response.customId === 'c4_decline') {
        await response.update({
          content: `${opponent.username} declined the challenge!`,
          components: []
        });
        return;
      }

      // Game accepted
      const board = createBoard();
      const gameData = {
        board,
        players: [challenger.id, opponent.id],
        currentPlayer: 0, // 0 or 1
        bet,
        startTime: Date.now()
      };

      activeGames.set(channelId, gameData);

      const { rows, boardStr } = createButtons(board, 0);

      const gameEmbed = new EmbedBuilder()
        .setTitle('🔴 Connect 4 🟡')
        .setDescription(
          `${challenger.username} (🔴) vs ${opponent.username} (🟡)\n\n` +
          boardStr + '\n\n' +
          `**Current Turn:** ${challenger.username} 🔴\n` +
          `**Bet:** $${bet} (Winner takes $${bet * 2})`
        )
        .setColor(0x5865F2);

      await response.update({
        content: 'Game started!',
        embeds: [gameEmbed],
        components: rows
      });

      // Set up game collector
      const gameFilter = i => {
        const game = activeGames.get(channelId);
        if (!game) return false;
        const currentPlayerId = game.players[game.currentPlayer];
        return i.user.id === currentPlayerId && i.customId.startsWith('c4_');
      };

      const collector = interaction.channel.createMessageComponentCollector({
        filter: gameFilter,
        time: TIMEOUT
      });

      collector.on('collect', async i => {
        const game = activeGames.get(channelId);
        if (!game) {
          collector.stop();
          return;
        }

        const col = parseInt(i.customId.split('_')[1]);
        const player = game.currentPlayer + 1; // 1 or 2
        const row = dropPiece(game.board, col, player);

        if (row === -1) {
          await i.deferUpdate();
          return;
        }

        // Check for win
        const hasWon = checkWin(game.board, row, col, player);
        const isFull = game.board[0].every(cell => cell !== 0);

        if (hasWon || isFull) {
          // Game over
          const { rows, boardStr } = createButtons(game.board, game.currentPlayer, true);
          
          let resultEmbed;
          if (hasWon) {
            const winner = game.currentPlayer === 0 ? challenger : opponent;
            const loser = game.currentPlayer === 0 ? opponent : challenger;
            const winnerUser = game.currentPlayer === 0 ? challengerUser : opponentUser;
            const loserUser = game.currentPlayer === 0 ? opponentUser : challengerUser;

            winnerUser.balance += game.bet;
            loserUser.balance -= game.bet;
            challengerUser.cooldowns.connect4 = new Date(now);
            if (!opponentUser.cooldowns) opponentUser.cooldowns = {};
            opponentUser.cooldowns.connect4 = new Date(now);
            
            await winnerUser.save();
            await loserUser.save();

            resultEmbed = new EmbedBuilder()
              .setTitle('🏆 Game Over!')
              .setDescription(
                boardStr + '\n\n' +
                `**Winner:** ${winner.username} ${game.currentPlayer === 0 ? '🔴' : '🟡'}\n` +
                `**Prize:** $${game.bet * 2}\n\n` +
                `${winner.username} won $${game.bet}!\n` +
                `${loser.username} lost $${game.bet}`
              )
              .setColor(0x57F287);
          } else {
            // Draw
            challengerUser.cooldowns.connect4 = new Date(now);
            if (!opponentUser.cooldowns) opponentUser.cooldowns = {};
            opponentUser.cooldowns.connect4 = new Date(now);
            await challengerUser.save();
            await opponentUser.save();

            resultEmbed = new EmbedBuilder()
              .setTitle('🤝 Draw!')
              .setDescription(
                boardStr + '\n\n' +
                `The board is full! It's a draw.\n` +
                `Both players keep their bets.`
              )
              .setColor(0xFEE75C);
          }

          activeGames.delete(channelId);
          collector.stop();
          await i.update({ embeds: [resultEmbed], components: rows });
          return;
        }

        // Switch player
        game.currentPlayer = 1 - game.currentPlayer;
        const { rows, boardStr } = createButtons(game.board, game.currentPlayer);
        const currentPlayerUser = game.currentPlayer === 0 ? challenger : opponent;

        const turnEmbed = new EmbedBuilder()
          .setTitle('🔴 Connect 4 🟡')
          .setDescription(
            `${challenger.username} (🔴) vs ${opponent.username} (🟡)\n\n` +
            boardStr + '\n\n' +
            `**Current Turn:** ${currentPlayerUser.username} ${game.currentPlayer === 0 ? '🔴' : '🟡'}\n` +
            `**Bet:** $${bet} (Winner takes $${bet * 2})`
          )
          .setColor(0x5865F2);

        await i.update({ embeds: [turnEmbed], components: rows });
      });

      collector.on('end', () => {
        if (activeGames.has(channelId)) {
          activeGames.delete(channelId);
        }
      });

    } catch (error) {
      await interaction.editReply({
        content: 'Challenge expired - no response received.',
        components: []
      });
    }
  }
};
