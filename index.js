require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');

// ★ Intents と Partials を広めに
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // 退会/参加イベントに必須
    GatewayIntentBits.GuildBans     // BAN をテストする場合にあると便利
  ],
  partials: [Partials.GuildMember, Partials.User]
});

// 接続確認
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Ready as ${c.user.tag}`);
  console.log(`📡 Connected to ${c.guilds.cache.size} guild(s).`);
  c.guilds.cache.forEach(g => console.log(` - Guild: ${g.name} (${g.id})`));
});

// 参加・退会・BAN すべてロギング（切り分け用）
client.on(Events.GuildMemberAdd, (member) => {
  console.log(`➕ GuildMemberAdd: ${member.user?.tag ?? member.id} joined ${member.guild?.name} (${member.guild?.id})`);
});

client.on(Events.GuildMemberRemove, (member) => {
  console.log(`👋 GuildMemberRemove: ${member.user?.tag ?? member.id} left ${member.guild?.name} (${member.guild?.id})`);
});

client.on(Events.GuildBanAdd, (ban) => {
  // ban は { user, guild } で来ます
  console.log(`⛔ GuildBanAdd: ${ban.user?.tag ?? ban.user?.id} was banned in ${ban.guild?.name} (${ban.guild?.id})`);
});

// エラーハンドリング（原因特定）
client.on('error', (err) => console.error('Client error:', err));
client.on('shardError', (err) => console.error('Shard error:', err));
process.on('unhandledRejection', (reason) => console.error('UnhandledRejection:', reason));

client.login(process.env.DISCORD_TOKEN);