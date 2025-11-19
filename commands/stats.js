const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Directories to exclude from counting
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build'];

// File extensions to count
const CODE_EXTENSIONS = {
  '.js': 'JavaScript',
  '.lua': 'Lua',
  '.json': 'JSON',
  '.md': 'Markdown'
};

/**
 * Recursively count lines of code in files
 */
function countLinesInDirectory(dirPath, stats) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.includes(item)) {
        continue;
      }
      countLinesInDirectory(fullPath, stats);
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      
      if (CODE_EXTENSIONS[ext]) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').length;
        
        if (!stats[ext]) {
          stats[ext] = {
            name: CODE_EXTENSIONS[ext],
            files: 0,
            lines: 0
          };
        }
        
        stats[ext].files++;
        stats[ext].lines += lines;
      }
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Display bot statistics including lines of code'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const projectRoot = path.join(__dirname, '..');
      const stats = {};

      // Count lines of code
      countLinesInDirectory(projectRoot, stats);

      // Calculate totals
      let totalFiles = 0;
      let totalLines = 0;
      const breakdown = [];

      // Sort by line count (descending)
      const sortedStats = Object.entries(stats).sort((a, b) => b[1].lines - a[1].lines);

      for (const [ext, data] of sortedStats) {
        breakdown.push(`**${data.name}:** ${data.lines.toLocaleString()} lines (${data.files} files)`);
        totalFiles += data.files;
        totalLines += data.lines;
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Bot Statistics')
        .setColor('Blue')
        .addFields(
          {
            name: '📝 Total Lines of Code',
            value: `**${totalLines.toLocaleString()}** lines across **${totalFiles}** files`,
            inline: false
          },
          {
            name: '🔍 Breakdown by Language',
            value: breakdown.join('\n'),
            inline: false
          },
          {
            name: '💡 Note',
            value: 'Statistics exclude dependencies (node_modules) and version control files.',
            inline: false
          }
        )
        .setFooter({ text: 'EndzoneStrike Bot' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error counting lines:', error);
      await interaction.editReply({
        content: '❌ An error occurred while calculating statistics.',
        ephemeral: true
      });
    }
  }
};
