const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const jobs = require('../data/jobs.js');
const User = require('../data/models/User');

// Utility functions
function getRandomPay([min, max]) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getJobStreakBonus(streak) {
  return 1 + Math.min(streak, 10) * 0.1;
}
function getTodayDateStr() {
  return new Date().toISOString().split('T')[0];
}
function checkRequirements(user, job) {
  if (user.balance < (job.minBalance || 0))
    return { ok: false, reason: "balance" };
  const hours = user.hoursWorked?.get
    ? user.hoursWorked.get(job.name)
    : user.hoursWorked?.[job.name] || 0;
  if (hours < (job.hoursRequired || 0))
    return { ok: false, reason: "hours", need: job.hoursRequired, have: hours };
  const inv = user.inventory || [];
  for (const item of job.requiredItems || []) {
    const found = inv.find(i =>
      typeof i.item === "string" &&
      i.item.trim().toLowerCase() === item.trim().toLowerCase() &&
      i.quantity > 0
    );
    if (!found)
      return { ok: false, reason: "items", need: item };
  }
  return { ok: true };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work your job to earn money, or pick/change your job!')
    .addStringOption(opt =>
      opt.setName('job')
        .setDescription('Pick a job to start or switch to')
        .setRequired(false)
        .addChoices(...jobs.map(j => ({ name: j.display, value: j.name })))
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    let user = await User.findOne({ discordId: userId });
    if (!user) user = await User.create({ discordId: userId });

    const chosenJobName = interaction.options.getString('job');
    const hasJob = !!user.currentJob;

    // 1. If user is picking a job (job argument provided)
    if (chosenJobName) {
      const job = jobs.find(j => j.name === chosenJobName);
      if (!job) {
        return interaction.reply({ content: "Invalid job.", ephemeral: true });
      }
      const req = checkRequirements(user, job);
      if (!req.ok) {
        let msg = '';
        if (req.reason === "balance") msg = `You need at least $${job.minBalance} to work as a ${job.display}.`;
        else if (req.reason === "hours") msg = `You need to have worked ${job.hoursRequired} hours before being a ${job.display}. You have only ${req.have}.`;
        else if (req.reason === "items") msg = `You need the item **${req.need}** to work as a ${job.display}.`;
        return interaction.reply({ content: msg, ephemeral: true });
      }

      // Already have a job and trying to switch: must quit first
      if (hasJob && user.currentJob !== chosenJobName) {
        const prev = jobs.find(j => j.name === user.currentJob);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('work_quit_confirm').setLabel('✅ Confirm Quit').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('work_quit_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({
          content: `You are currently working as a **${prev.display}**.\nDo you want to quit your current job?`,
          components: [row],
          ephemeral: true
        });

        let btn;
        try {
          btn = await interaction.channel.awaitMessageComponent({
            filter: i => i.user.id === userId && i.customId.startsWith('work_quit_'),
            time: 30_000
          });
        } catch {
          btn = null;
        }
        if (!btn || btn.customId === 'work_quit_cancel') {
          return interaction.editReply({ content: 'Job change cancelled.', components: [] });
        }
        await btn.deferUpdate();
        user.currentJob = null;
        if (user.jobStreak) user.jobStreak.count = 0; // reset streak
        await user.save();
        await btn.editReply({ content: 'You quit your job. Run `/work job:JobName` again to start a new one.', components: [] });
        return;
      }

      // Confirm picking job (if not already in it)
      if (!hasJob || user.currentJob === chosenJobName) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('work_pick_confirm').setLabel('✅ Confirm').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('work_pick_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({
          content: `Are you sure you want to work as a **${job.display}**?`,
          components: [row], ephemeral: true
        });

        let btn;
        try {
          btn = await interaction.channel.awaitMessageComponent({
            filter: i => i.user.id === userId && i.customId.startsWith('work_pick_'),
            time: 30_000
          });
        } catch {
          btn = null;
        }
        if (!btn || btn.customId === 'work_pick_cancel') {
          return interaction.editReply({ content: 'Job selection cancelled.', components: [] });
        }
        await btn.deferUpdate();
        user.currentJob = job.name;
        if (user.jobStreak) user.jobStreak.count = 0; // reset streak
        await user.save();
        await btn.editReply({ content: `You are now working as a **${job.display}**! Run \`/work\` to start.`, components: [] });
        return;
      }
    }

    // 2. If user doesn't have a job
    if (!user.currentJob) {
      const eligible = jobs.filter(j => checkRequirements(user, j).ok);
      if (!eligible.length) {
        return interaction.reply({ content: "You don't qualify for any jobs yet. Work more or buy required items!", ephemeral: true });
      }
      const jobList = eligible.map(j => `**${j.display}** — ${j.description}`).join('\n');
      return interaction.reply({
        content: `You don't have a job yet. Pick one with \`/work job:JobName\`.\nAvailable jobs:\n\n${jobList}`,
        ephemeral: true
      });
    }

    // 3. User has a job: do the job (minigame/pay/streak)
    const job = jobs.find(j => j.name === user.currentJob);
    if (!job) {
      user.currentJob = null;
      await user.save();
      return interaction.reply({ content: "Your job is invalid. Please pick a valid job with `/work job:JobName`.", ephemeral: true });
    }

    // Check requirements again (in case user lost items, etc)
    const req = checkRequirements(user, job);
    if (!req.ok) {
      let msg = '';
      if (req.reason === "balance") msg = `You need at least $${job.minBalance} to work as a ${job.display}.`;
      else if (req.reason === "hours") msg = `You need to have worked ${job.hoursRequired} hours before being a ${job.display}. You have only ${req.have}.`;
      else if (req.reason === "items") msg = `You need the item **${req.need}** to work as a ${job.display}.`;
      return interaction.reply({ content: msg, ephemeral: true });
    }

    // Cooldown check
    const lastWorked = user.cooldowns?.work?.get(job.name) || new Date(0);
    const now = Date.now();
    if (now - new Date(lastWorked).getTime() < job.cooldown) {
      const msLeft = job.cooldown - (now - new Date(lastWorked).getTime());
      const mins = Math.ceil(msLeft / 60000);
      return interaction.reply({ content: `⏳ You can work as a ${job.display} again in ${mins} min.`, ephemeral: true });
    }

    // --- Streak Logic ---
    if (!user.jobStreak) user.jobStreak = { count: 0, lastWorked: null };
    const today = getTodayDateStr();
    const lastDate = user.jobStreak.lastWorked ? new Date(user.jobStreak.lastWorked) : null;
    let streak = user.jobStreak.count || 0;
    if (lastDate) {
      const lastDay = lastDate.toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(new Date().getDate() - 1);
      const yestDay = yesterday.toISOString().split('T')[0];
      if (lastDay === yestDay) streak += 1;
      else if (lastDay !== today) streak = 1;
    } else {
      streak = 1;
    }
    const bonus = getJobStreakBonus(streak);

    // === Minigame Logic ===
    if (job.minigame === 'typing') {
      const words = ["apple", "banana", "checkout", "receipt", "register", "customer", "change"];
      const pick = words[Math.floor(Math.random() * words.length)];
      const embed = new EmbedBuilder()
        .setTitle(`${job.display} Typing Challenge`)
        .setDescription(`Type the word: **\`${pick}\`**\n_You have 10 seconds!_`)
        .setColor(0xffae00);

      await interaction.reply({ embeds: [embed], ephemeral: false });

      const filter = m => m.author.id === interaction.user.id && m.content.trim().toLowerCase() === pick;
      const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 10000 });

      let pay = Math.floor(getRandomPay(job.basePay) * bonus);

      if (collected.size) {
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
      user.jobStreak = { count: streak, lastWorked: new Date() };
      await user.save();
      return;
    }

    if (job.minigame === 'trivia') {
      const q = [
        { q: "What does HTML stand for?", a: "HyperText Markup Language", choices: ["HyperText Markup Language", "Hyperloop Machine Language", "Home Tool Markup Language", "Hyper Transfer Map Language"] },
        { q: "Which symbol starts a JS single-line comment?", a: "//", choices: ["//", "#", "/*", "<!--"] },
        { q: "What does 'console.log' do?", a: "Prints to console", choices: ["Prints to console", "Logs out", "Saves file", "Starts a loop"] }
      ];
      const pick = q[Math.floor(Math.random() * q.length)];
      const correctIndex = pick.choices.findIndex(c => c === pick.a);

      const buttons = pick.choices.map((choice, idx) =>
        new ButtonBuilder()
          .setCustomId(`trivia_${idx}`)
          .setLabel(choice)
          .setStyle(ButtonStyle.Primary)
      );
      const row = new ActionRowBuilder().addComponents(...buttons);

      await interaction.reply({ content: `🧑‍💻 **Trivia:** ${pick.q}\n_You have 15 seconds!_`, components: [row] });

      const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('trivia_');
      let answered = false;
      const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 15000 });

      let pay = Math.floor(getRandomPay(job.basePay) * bonus);

      collector.on('collect', async i => {
        answered = true;
        const idx = parseInt(i.customId.replace('trivia_', ''));
        if (idx === correctIndex) {
          pay = Math.floor(pay * 1.2);
          await i.reply({ content: `✅ Correct! You earned **$${pay}**.`, ephemeral: false });
        } else {
          pay = Math.floor(pay * 0.5);
          await i.reply({ content: `❌ Wrong. You earned only **$${pay}**.`, ephemeral: false });
        }
        user.balance += pay;
        user.cooldowns.work.set(job.name, new Date());
        user.hoursWorked.set(job.name, (user.hoursWorked.get(job.name) || 0) + 1);
        user.jobStreak = { count: streak, lastWorked: new Date() };
        await user.save();
        await interaction.editReply({ components: [new ActionRowBuilder().addComponents(...buttons.map(btn => btn.setDisabled(true)))] });
      });

      collector.on('end', async collected => {
        if (!answered) {
          pay = Math.floor(pay * 0.5);
          await interaction.followUp({ content: `❌ Too late! You earned only **$${pay}**.`, ephemeral: false });
          user.balance += pay;
          user.cooldowns.work.set(job.name, new Date());
          user.hoursWorked.set(job.name, (user.hoursWorked.get(job.name) || 0) + 1);
          user.jobStreak = { count: streak, lastWorked: new Date() };
          await user.save();
          await interaction.editReply({ components: [new ActionRowBuilder().addComponents(...buttons.map(btn => btn.setDisabled(true)))] });
        }
      });
      return;
    }

    if (job.minigame === 'reaction') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('donation_claim').setLabel('Claim Donation!').setStyle(ButtonStyle.Success)
      );
      await interaction.reply({ content: `🎥 A donation just came in! Click the button ASAP!`, components: [row] });

      let pay = Math.floor(getRandomPay(job.basePay) * bonus);
      let paid = false;

      const msg = await interaction.fetchReply();
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 7000,
        max: 1
      });

      collector.on('collect', async btn => {
        if (btn.user.id !== interaction.user.id) return btn.reply({ content: 'Not for you.', ephemeral: true });
        pay = Math.floor(pay * 1.4);
        paid = true;
        await btn.reply({ content: `⚡ Quick! You earned **$${pay}** for fast reaction!`, ephemeral: false });
        user.balance += pay;
        user.cooldowns.work.set(job.name, new Date());
        user.hoursWorked.set(job.name, (user.hoursWorked.get(job.name) || 0) + 1);
        user.jobStreak = { count: streak, lastWorked: new Date() };
        await user.save();
        await msg.edit({ components: [new ActionRowBuilder().addComponents(row.components[0].setDisabled(true))] });
      });

      collector.on('end', async () => {
        if (!paid) {
          pay = Math.floor(pay * 0.5);
          await interaction.followUp({ content: `❌ Too slow! You earned only **$${pay}**.`, ephemeral: false });
          user.balance += pay;
          user.cooldowns.work.set(job.name, new Date());
          user.hoursWorked.set(job.name, (user.hoursWorked.get(job.name) || 0) + 1);
          user.jobStreak = { count: streak, lastWorked: new Date() };
          await user.save();
          await msg.edit({ components: [new ActionRowBuilder().addComponents(row.components[0].setDisabled(true))] });
        }
      });
      return;
    }

    if (job.minigame === 'memory') {
      const foods = ["🍔", "🍕", "🍣", "🍩", "🍪"];
      const seq = Array(3).fill(null).map(() => foods[Math.floor(Math.random() * foods.length)]);

      await interaction.reply({ content: `🍳 Memorize this sequence: ${seq.join(" ")}\n_You have 6 seconds..._` });
      await new Promise(res => setTimeout(res, 6000));

      const foodButtons = foods.map((emoji, i) =>
        new ButtonBuilder().setCustomId(`food_${i}`).setLabel(emoji).setStyle(ButtonStyle.Primary)
      );
      const row = new ActionRowBuilder().addComponents(...foodButtons);

      const embed = new EmbedBuilder()
        .setTitle('🍳 Pick the sequence!')
        .setDescription('Click the buttons IN ORDER to match the sequence you just saw!\n_You have 30 seconds._')
        .setColor(0xffc300);

      const msg = await interaction.followUp({ embeds: [embed], components: [row], ephemeral: false });

      let picked = [];
      const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('food_');

      const collector = msg.createMessageComponentCollector({ filter, max: seq.length, time: 30000 });

      collector.on('collect', async i => {
        const idx = parseInt(i.customId.replace('food_', ''));
        picked.push(foods[idx]);
        await i.reply({ content: `You picked ${foods[idx]}`, ephemeral: true });
        if (picked.length === seq.length) collector.stop();
      });

      collector.on('end', async () => {
        const correct = picked.length === seq.length && picked.every((v, i) => v === seq[i]);
        let pay = Math.floor(getRandomPay(job.basePay) * bonus);
        if (correct) {
          pay = Math.floor(pay * 1.3);
          await interaction.followUp({ content: `✅ Correct! You earned **$${pay}**.`, ephemeral: false });
        } else {
          pay = Math.floor(pay * 0.5);
          await interaction.followUp({ content: `❌ Wrong or incomplete. You earned only **$${pay}**.\nCorrect sequence was: ${seq.join(' ')}`, ephemeral: false });
        }
        user.balance += pay;
        user.cooldowns.work.set(job.name, new Date());
        user.hoursWorked.set(job.name, (user.hoursWorked.get(job.name) || 0) + 1);
        user.jobStreak = { count: streak, lastWorked: new Date() };
        await user.save();
        await msg.edit({ components: [new ActionRowBuilder().addComponents(...foodButtons.map(btn => btn.setDisabled(true)))] });
      });
      return;
    }
  }
};