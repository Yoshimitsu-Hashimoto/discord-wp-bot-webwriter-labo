require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');

// 退会イベントを受け取るには GuildMembers Intent が必要
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Ready as ${c.user.tag}`);
});

client.on(Events.GuildMemberRemove, (member) => {
  const userId = member.id;
  const tag = member.user ? `${member.user.tag}` : '(unknown user)';
  console.log(`👋 guildMemberRemove: ${tag} (${userId}) left guild ${member.guild?.id}`);
});

client.login(process.env.DISCORD_TOKEN);