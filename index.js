const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

const TALLY_FILE = 'tally.json';
const tally = fs.existsSync(TALLY_FILE) ? JSON.parse(fs.readFileSync(TALLY_FILE)) : {};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

function saveTally() {
  fs.writeFileSync(TALLY_FILE, JSON.stringify(tally, null, 2));
}

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const match = message.content.match(/^(\d+(?:\.\d{1,2})?)\s*,\s*<@!?(\d+)>/);
  if (!match) return;

  const amount = parseFloat(match[1]);
  const receiverId = match[2];
  const senderId = message.author.id;

  if (!tally[senderId]) tally[senderId] = 0;
  if (!tally[receiverId]) tally[receiverId] = 0;

  tally[senderId] -= amount;
  tally[receiverId] += amount;
  saveTally();

  const summary = Object.entries(tally)
    .map(([userId, total]) => `<@${userId}>: $${total.toFixed(2)}`)
    .join('\n');

  message.channel.send(`🧮 Poker Totals:\n${summary}`);
});

client.login(process.env.TOKEN);