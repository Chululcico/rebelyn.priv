import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "rebelyn@admin.privado";

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN },
    create: {
      email,
      passwordHash: "",
      name: "Admin",
      role: Role.ADMIN,
    },
  });

  console.log("OK - Usuario admin listo:");
  console.log({ id: user.id, email: user.email, role: user.role, name: user.name });
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
