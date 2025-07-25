const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const fs = require('fs');
require('dotenv').config();

// ---------- Web server for uptime ----------
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('✅ Web server running on port 3000'));

// ---------- Load or initialize data ----------
const TALLY_FILE = 'tally.json';
const SENT_FILE = 'sent.json';

const tally = fs.existsSync(TALLY_FILE) ? JSON.parse(fs.readFileSync(TALLY_FILE)) : {};
const sent = fs.existsSync(SENT_FILE) ? JSON.parse(fs.readFileSync(SENT_FILE)) : {};

function saveTally() {
  fs.writeFileSync(TALLY_FILE, JSON.stringify(tally, null, 2));
}

function saveSent() {
  fs.writeFileSync(SENT_FILE, JSON.stringify(sent, null, 2));
}

function resetTally() {
  for (const key in tally) delete tally[key];
  for (const key in sent) delete sent[key];
  saveTally();
  saveSent();
}

function formatScoreboard() {
  const ranks = ['🟥 Master', '🟧 Diamond', '🟨 Platinum', '🟦 Gold', '🟪 Silver', '🟫 Bronze'];
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "No transactions yet.";

  return sorted
    .map(([id, total], index) => {
      const rank = ranks[Math.min(index, ranks.length - 1)];
      return `${rank}: <@${id}> — $${total.toFixed(2)}`;
    })
    .join('\n');
}

// ---------- Set up Discord client ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  const content = message.content.trim();

  // !scoreboard
  if (content === '!scoreboard') {
    message.channel.send(`🏆 Scoreboard:\n${formatScoreboard()}`);
    return;
  }

  // !sent or !moneyMoved
  if (content === '!sent' || content === '!moneyMoved') {
    message.channel.send(`💰 Total Money Sent:\n${formatSent()}`);
    return;
  }

  // !reset (optional: restrict by user ID)
  if (content === '!reset') {
    // Replace with your user ID if you want to restrict
    // if (message.author.id !== 'YOUR_DISCORD_USER_ID') {
    //   message.channel.send('❌ You are not allowed to reset the tally.');
    //   return;
    // }
    resetTally();
    message.channel.send('♻️ Tally has been reset.');
    return;
  }

  // Handle payments like: "10 @User"
  const match = content.match(/^(\d+(?:\.\d{1,2})?)\s*,\s*<@!?(\d+)>/);

  const amount = parseFloat(match[1]);
  const receiverId = match[2];
  const senderId = message.author.id;

  if (!tally[senderId]) tally[senderId] = 0;
  if (!tally[receiverId]) tally[receiverId] = 0;
  if (!sent[senderId]) sent[senderId] = 0;

  tally[senderId] -= amount;
  tally[receiverId] += amount;
  sent[senderId] += amount;

  saveTally();
  saveSent();

  message.channel.send(`✅ Recorded: $${amount.toFixed(2)} paid to <@${receiverId}>`);
});

client.login(process.env.TOKEN);
