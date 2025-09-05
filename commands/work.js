const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const jobs = require('../data/jobs.js');
const User = require('../data/models/User');

function getUserInventoryNames(user) {
  return user.inventory?.map(i => i.item) || [];
}

function canWorkJob(user, job) {
  // Check minimum balance
  if (user.balance < (job.minBalance || 0)) return false;
  // Check hours
  const hours = user.hoursWorked?.get(job.name) || 0;
  if (hours < (job.hoursRequired || 0)) return false;
  // Check required items
  const inv = getUserInventoryNames(user);
  for (const item of job.requiredItems || []) {
    if (!inv.includes(item)) return false;
  }
  return true;
}

function getRandomPay([min, max]) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Do a job to earn money!')
    .addStringOption(opt =>
      opt.setName('job')
        .setDescription('Which job to work?')
        .setRequired(false)
        .addChoices(...jobs.map(j => ({ name: j.display, value: j.name })))
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    let user = await User.findOne({ discordId: userId });
    if (!user) user = await User.create({ discordId: userId });

    const jobName = interaction.options.getString('job');
    if (!jobName) {
      // List jobs you qualify for
      const eligible = jobs.filter(j => canWorkJob(user, j));
      const embed = new EmbedBuilder()
        .setTitle('Available Jobs')
        .setDescription(
          eligible.length
            ? eligible.map(j => `${j.display} — ${j.description}`).join('\n')
            : 'No jobs available yet. Work more or buy required items!'
        )
        .setColor(0x00b6ff);
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    const job = jobs.find(j => j.name === jobName);
    if (!job) return interaction.reply({ content: 'Invalid job.', ephemeral: true });

    // Check restrictions
    if (!canWorkJob(user, job)) {
      return interaction.reply({ content: 'You do not meet the requirements for this job.', ephemeral: false });
    }

    // Cooldown check
    const lastWorked = user.cooldowns?.work?.get(job.name) || new Date(0);
    const now = Date.now();
    if (now - new Date(lastWorked).getTime() < job.cooldown) {
      const msLeft = job.cooldown - (now - new Date(lastWorked).getTime());
      const mins = Math.ceil(msLeft / 60000);
      return interaction.reply({ content: `⏳ You can work as a ${job.display} again in ${mins} min.`, ephemeral: false });
    }

    // === Minigame Logic ===
    if (job.minigame === 'typing') {
      // Typing Minigame
      const words = ["apple", "banana", "checkout", "receipt", "register", "customer", "change"];
      const pick = words[Math.floor(Math.random() * words.length)];
      const embed = new EmbedBuilder()
        .setTitle(`${job.display} Typing Challenge`)
        .setDescription(`Type the word: **\`${pick}\`**\n_You have 10 seconds!_`)
        .setColor(0xffae00);

      await interaction.reply({ embeds: [embed], ephemeral: false });

      const filter = m => m.author.id === interaction.user.id && m.content.trim().toLowerCase() === pick;
      const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 10000 });

      let pay = getRandomPay(job.basePay);

      if (collected.size) {
        // Bonus for speed
        const responseTime = (collected.first().createdTimestamp - interaction.createdTimestamp) / 1000;
        if (responseTime < 3) pay = Math.floor(pay * 1.2);
        await interaction.followUp({ content: `✅ Success! You earned **$${pay}**.`, ephemeral: false });
      } else {
        pay = Math.floor(pay * 0.5);
        await interaction.followUp({ content: `❌ Too slow! You earned only **$${pay}**.`, ephemeral: false });
      }

      user.balance += pay;
      user.cooldowns.work.set(job.name, new Date());
      user.hoursWorked.set(job.name, (user.hoursWorked.get(job.name) || 0) + 1);
      await user.save();
      return;
    }

    if (job.minigame === 'trivia') {
      // Programmer: simple trivia
      const q = [
        { q: "What does HTML stand for?", a: "HyperText Markup Language" },
        { q: "What symbol is used for comments in JavaScript?", a: "//" },
        { q: "What does 'console.log' do?", a: "Print to console" }
      ];
      const pick = q[Math.floor(Math.random() * q.length)];

      await interaction.reply({ content: `🧑‍💻 **Trivia:** ${pick.q}\n_You have 15 seconds!_`, ephemeral: false });
      const filter = m => m.author.id === interaction.user.id && m.content.toLowerCase().includes(pick.a.toLowerCase().split(' ')[0]);
      const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15000 });

      let pay = getRandomPay(job.basePay);
      if (collected.size) {
        pay = Math.floor(pay * 1.2);
        await interaction.followUp({ content: `✅ Correct! You earned **$${pay}**.`, ephemeral: false });
      } else {
        pay = Math.floor(pay * 0.5);
        await interaction.followUp({ content: `❌ Wrong or too late. You earned only **$${pay}**.`, ephemeral: false });
      }

      user.balance += pay;
      user.cooldowns.work.set(job.name, new Date());
      user.hoursWorked.set(job.name, (user.hoursWorked.get(job.name) || 0) + 1);
      await user.save();
      return;
    }

    if (job.minigame === 'reaction') {
      // Streamer: fast button click
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('donation_claim').setLabel('Claim Donation!').setStyle(ButtonStyle.Success)
      );
      await interaction.reply({ content: `🎥 A donation just came in! Click the button ASAP!`, components: [row], ephemeral: false });

      const msg = await interaction.fetchReply();
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 7000,
        max: 1
      });

      let pay = getRandomPay(job.basePay);
      let paid = false;

      collector.on('collect', async btn => {
        if (btn.user.id !== interaction.user.id) return btn.reply({ content: 'Not for you.', ephemeral: true });
        pay = Math.floor(pay * 1.4);
        paid = true;
        await btn.reply({ content: `⚡ Quick! You earned **$${pay}** for fast reaction!`, ephemeral: false });
        user.balance += pay;
        user.cooldowns.work.set(job.name, new Date());
        user.hoursWorked.set(job.name, (user.hoursWorked.get(job.name) || 0) + 1);
        await user.save();
      });

      collector.on('end', async collected => {
        if (!paid) {
          pay = Math.floor(pay * 0.5);
          await interaction.followUp({ content: `❌ Too slow! You earned only **$${pay}**.`, ephemeral: false });
          user.balance += pay;
          user.cooldowns.work.set(job.name, new Date());
          user.hoursWorked.set(job.name, (user.hoursWorked.get(job.name) || 0) + 1);
          await user.save();
        }
      });
      return;
    }

    if (job.minigame === 'memory') {
      // Chef: simple memory sequence
      const foods = ["🍔", "🍕", "🍣", "🍩", "🍪"];
      const seq = Array(3).fill(null).map(() => foods[Math.floor(Math.random() * foods.length)]);
      await interaction.reply({ content: `🍳 Memorize this sequence: ${seq.join(" ")}\n_You have 6 seconds..._`, ephemeral: false });

      setTimeout(async () => {
        await interaction.followUp({ content: 'Type the sequence (with spaces)!', ephemeral: false });

        const filter = m => m.author.id === interaction.user.id && m.content.trim().split(/\s+/).join(' ') === seq.join(' ');
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 7000 });
        let pay = getRandomPay(job.basePay);

        if (collected.size) {
          pay = Math.floor(pay * 1.3);
          await interaction.followUp({ content: `✅ Correct! You earned **$${pay}**.`, ephemeral: false });
        } else {
          pay = Math.floor(pay * 0.5);
          await interaction.followUp({ content: `❌ Missed or wrong. You earned only **$${pay}**.`, ephemeral: false });
        }
        user.balance += pay;
        user.cooldowns.work.set(job.name, new Date());
        user.hoursWorked.set(job.name, (user.hoursWorked.get(job.name) || 0) + 1);
        await user.save();
      }, 6000);
      return;
    }
  }
};