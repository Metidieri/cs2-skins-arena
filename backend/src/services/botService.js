const BOT_USERNAMES = ['Bot_Shadow', 'Bot_Viper', 'Bot_Ghost', 'Bot_Storm', 'Bot_Blaze'];

async function ensureBotsExist(prisma) {
  for (const username of BOT_USERNAMES) {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (!exists) {
      await prisma.user.create({
        data: {
          username,
          email: `${username.toLowerCase()}@arena.bot`,
          password: 'bot_account_not_login',
          balance: 99999,
          isBot: true,
        },
      });
    }
  }
}

async function getBotWithSkin(prisma) {
  const bots = await prisma.user.findMany({
    where: { isBot: true },
    include: { inventory: { include: { skin: true } } },
  });
  const botsWithSkins = bots.filter((b) => b.inventory.length > 0);
  if (botsWithSkins.length === 0) return null;
  const bot = botsWithSkins[Math.floor(Math.random() * botsWithSkins.length)];
  const skinEntry = bot.inventory[Math.floor(Math.random() * bot.inventory.length)];
  return { bot, skin: skinEntry.skin };
}

module.exports = { ensureBotsExist, getBotWithSkin, BOT_USERNAMES };
