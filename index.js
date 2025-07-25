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
  const ranks = [
  '🟥 Grandmaster', // 1st
  '🟧 Master',       // 2nd
  '🟪 Diamond',      // 3rd
  '🟦 Platinum',     // 4th
  '🟨 Gold',         // 5th
  '⬜ Silver',       // 6th
  '🟫 Bronze'        // 7th+
];

  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return "No transactions yet.";

  return sorted.map(([id, total], index) => {
    const rankIndex = Math.floor((index / sorted.length) * ranks.length);
    const rank = ranks[Math.min(rankIndex, ranks.length - 1)];
    return `${rank}: <@${id}> — $${total.toFixed(2)}`;
  }).join('\n');
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


  if (content.startsWith('!remove')) {
    const idMatch = content.match(/^!remove\s+<@!?(\d+)>/);
    if (!idMatch) {
      message.channel.send("❌ Usage: `!remove @user`");
      return;
    }

    const userId = idMatch[1];
    const name = `<@${userId}>`;

    const existed = tally[userId] !== undefined || sent[userId] !== undefined;

    delete tally[userId];
    delete sent[userId];
    saveTally();
    saveSent();

    message.channel.send(existed
      ? `🗑️ Removed ${name} from the scoreboard.`
      : `ℹ️ ${name} was not on the scoreboard.`);
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
  const match = content.match(/^(-?\d+(?:\.\d{1,2})?)\s*,\s*<@!?(\d+)>/);
  if (!match) {
    return;
  }



  const amount = parseFloat(match[1]);
  const receiverId = match[2];
  const senderId = message.author.id;
  const absAmount = Math.abs(amount);

  // Initialize accounts if needed
  if (!tally[senderId]) tally[senderId] = 0;
  if (!tally[receiverId]) tally[receiverId] = 0;
  if (!sent[senderId]) sent[senderId] = 0;
  if (!sent[receiverId]) sent[receiverId] = 0;

  // Handle normal payment (positive): sender pays receiver
  if (amount >= 0) {
    tally[senderId] -= absAmount;
    tally[receiverId] += absAmount;
    sent[senderId] += absAmount;
    message.channel.send(`✅ Recorded: $${absAmount.toFixed(2)} paid to <@${receiverId}>`);
  } else {
    // Handle negative: receiver pays sender
    tally[receiverId] -= absAmount;
    tally[senderId] += absAmount;
    sent[receiverId] += absAmount;
    message.channel.send(`✅ Recorded: <@${receiverId}> paid $${absAmount.toFixed(2)} to <@${senderId}>`);
  }

  saveTally();
  saveSent();

});
client.login(process.env.TOKEN).catch(err => {
  console.error("❌ Discord login failed:", err);
});