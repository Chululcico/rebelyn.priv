const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const db = new PrismaClient();
(async () => {
  const admin = await db.user.findFirst({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { id: true } });
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const s = await db.session.create({ data: { tokenHash, userId: admin.id, expiresAt: new Date(Date.now() + 3600_000) } });
  console.log(JSON.stringify({ sessionId: s.id, token }));
  await db.$disconnect();
})().catch(async (e) => { console.error(e.message); await db.$disconnect(); process.exit(1); });
