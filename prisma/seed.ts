// REBELYN · Seed de datos de prueba
// Ejecutar: npm run seed  (requiere DATABASE_URL y las migraciones aplicadas)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const IMG = "/img/products";

async function upsertColor(name: string, slug: string, hex: string) {
  return db.color.upsert({ where: { slug }, create: { name, slug, hex }, update: {} });
}

async function main() {
  console.log("· Sembrando REBELYN…");

  // ── Categorías ─────────────────────────────────────────────────────────────
  const categories = [
    { name: "Chandales", slug: "chandales", order: 1, description: "Conjuntos de dos piezas con forro de felpa." },
    { name: "Sudaderas", slug: "sudaderas", order: 2, description: "Sudaderas con capucha y sin capucha." },
    { name: "Camisetas", slug: "camisetas", order: 3, description: "Camisetas oversized de algodón pesado." },
    { name: "Pantalones", slug: "pantalones", order: 4, description: "Cargos y pantalones wide fit." },
    { name: "Accesorios", slug: "accesorios", order: 5, description: "Gorros, gorras y complementos." },
  ];
  for (const c of categories) {
    await db.category.upsert({ where: { slug: c.slug }, create: c, update: { name: c.name, order: c.order, description: c.description } });
  }

  // ── Colores ────────────────────────────────────────────────────────────────
  const burdeos = await upsertColor("Burdeos", "burdeos", "#4A1F27");
  const crema = await upsertColor("Crema", "crema", "#EFE7D8");
  const negro = await upsertColor("Negro", "negro", "#141414");
  const gris = await upsertColor("Gris", "gris", "#8A8A8A");

  // ── Ajustes de tienda ──────────────────────────────────────────────────────
  const settings: Record<string, unknown> = {
    storeName: "REBELYN",
    contactEmail: "rebelynoff@gmail.com",
    contactPhone: "632 530 973",
    address: "[DIRECCIÓN]",
    legalName: "[NOMBRE LEGAL]",
    legalId: "[NIF]",
    currency: "EUR",
    taxRatePercent: 21,
    pricesIncludeTax: true,
    social: {
      instagram: "https://www.instagram.com/rebelyn.off/",
      tiktok: "https://www.tiktok.com/@rebelyn.off",
      whatsapp: "34632530973",
    },
    shippingMethods: [
      { id: "standard", name: "Envío estándar", priceCents: 490, freeOverCents: 7500, estimatedDays: "2–4 días laborables", active: true },
      { id: "express", name: "Envío express", priceCents: 890, freeOverCents: null, estimatedDays: "24 horas laborables", active: true },
    ],
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, create: { key, value: value as never }, update: {} });
  }

  // ── Productos ──────────────────────────────────────────────────────────────
  type VariantSeed = { colorId: string; size: string; stock: number };
  type ProductSeed = {
    name: string;
    slug: string;
    summary: string;
    description: string;
    details: string;
    priceCents: number;
    compareAtCents?: number;
    categorySlug: string;
    featured?: boolean;
    tags: string[];
    images: string[];
    variants: VariantSeed[];
  };

  const cuidado = "80% algodón, 20% poliéster\nForro interior en felpa\nLavado a máquina a 30 °C, secado en plano";

  const products: ProductSeed[] = [
    {
      name: "Chandal de Invierno Burdeos",
      slug: "chandal-invierno-burdeos",
      summary: "Conjunto de dos piezas en burdeos, con forro de felpa y detalles góticos en cinturilla y puño.",
      description:
        "Tinta derramada sobre el papel. El mismo chandal de siempre en un burdeos mucho más cerrado: mismo forro de felpa por dentro, mismos hombros marcados y ese detalle gótico que asoma en la cinturilla y el puño.\n\nSe vende suelto, sin pack: si el burdeos es tu color, es tu referencia.",
      details: cuidado,
      priceCents: 7500,
      categorySlug: "chandales",
      featured: true,
      tags: ["chandal", "invierno", "burdeos", "conjunto"],
      images: [
        "https://i.postimg.cc/VvGJBfwz/Chandal-burdeos-con-detalles-goticos.png",
        "https://i.postimg.cc/vZ9mDL48/chandal-invierno-b-1.jpg",
        "https://i.postimg.cc/KY28TkM6/chandal-invierno-b-2.jpg",
      ],
      variants: [
        { colorId: burdeos.id, size: "S", stock: 6 },
        { colorId: burdeos.id, size: "M", stock: 10 },
        { colorId: burdeos.id, size: "L", stock: 7 },
        { colorId: burdeos.id, size: "XL", stock: 0 },
      ],
    },
    {
      name: "Chandal de Invierno Crema",
      slug: "chandal-invierno-crema",
      summary: "Conjunto de dos piezas en crema, forrado en felpa y con costuras góticas a la vista.",
      description:
        "Suave como la primera nevada y con la estructura de las cosas que duran. Sudadera y pantalón en el mismo crema, forro de felpa que entra en frío sin hinchar los hombros y costuras góticas que solo se ven si te paras a mirarlas.",
      details: cuidado,
      priceCents: 7500,
      categorySlug: "chandales",
      featured: true,
      tags: ["chandal", "invierno", "crema", "conjunto"],
      images: [
        "https://i.postimg.cc/X7qGNCKv/Chandal-crema-con-detalles-goticos.png",
        "https://i.postimg.cc/bwbvdHZP/chandal-invierno-a-4.jpg",
        "https://i.postimg.cc/FHcK1gY4/chandal-invierno-a-1.jpg",
      ],
      variants: [
        { colorId: crema.id, size: "S", stock: 5 },
        { colorId: crema.id, size: "M", stock: 8 },
        { colorId: crema.id, size: "L", stock: 9 },
        { colorId: crema.id, size: "XL", stock: 4 },
      ],
    },
    {
      name: "REBELYN Oversized Tee",
      slug: "rebelyn-oversized-tee",
      summary: "Camiseta oversized de algodón pesado 240 g, caída recta y cuello reforzado.",
      description: "Algodón peinado de 240 g, hombro caído y cuello ribeteado que no se deforma. Corte oversized real, no una M grande.",
      details: "100% algodón peinado 240 g\nCorte oversized\nImpresión serigráfica frontal\nLavado del revés a 30 °C",
      priceCents: 2990,
      compareAtCents: 3490,
      categorySlug: "camisetas",
      featured: true,
      tags: ["camiseta", "tee", "oversized", "negro"],
      images: [`${IMG}/rebelyn-oversized-tee--portada.svg`],
      variants: [
        { colorId: negro.id, size: "S", stock: 12 },
        { colorId: negro.id, size: "M", stock: 20 },
        { colorId: negro.id, size: "L", stock: 18 },
        { colorId: negro.id, size: "XL", stock: 10 },
      ],
    },
    {
      name: "REBELYN Hoodie",
      slug: "rebelyn-hoodie",
      summary: "Sudadera con capucha de 380 g, forro interior y bolsillo canguro.",
      description: "Punto grueso de 380 g con capucha doble y cordón plano. Pensada para el invierno sin abultar.",
      details: "80% algodón, 20% poliéster 380 g\nCapucha forrada\nBolsillo canguro\nLavado a 30 °C",
      priceCents: 5490,
      categorySlug: "sudaderas",
      featured: true,
      tags: ["sudadera", "hoodie", "capucha"],
      images: [`${IMG}/rebelyn-hoodie--portada.svg`],
      variants: [
        { colorId: gris.id, size: "S", stock: 6 },
        { colorId: gris.id, size: "M", stock: 9 },
        { colorId: gris.id, size: "L", stock: 5 },
        { colorId: negro.id, size: "M", stock: 7 },
        { colorId: negro.id, size: "L", stock: 4 },
      ],
    },
    {
      name: "REBELYN Cargo",
      slug: "rebelyn-cargo",
      summary: "Pantalón cargo wide fit con bolsillos laterales y cinturilla ajustable.",
      description: "Tejido ripstop, pierna ancha y seis bolsillos. La pieza que aguanta todo el año.",
      details: "Ripstop de algodón\nWide fit\nCinturilla ajustable con hebilla\nLavado a 30 °C",
      priceCents: 4990,
      categorySlug: "pantalones",
      tags: ["cargo", "pantalon", "wide"],
      images: [`${IMG}/rebelyn-cargo--portada.svg`],
      variants: [
        { colorId: negro.id, size: "S", stock: 5 },
        { colorId: negro.id, size: "M", stock: 8 },
        { colorId: negro.id, size: "L", stock: 6 },
        { colorId: negro.id, size: "XL", stock: 3 },
      ],
    },
    {
      name: "REBELYN Zip Hoodie",
      slug: "rebelyn-zip-hoodie",
      summary: "Sudadera con cremallera completa, cuello alto y forro de felpa.",
      description: "Cremallera metálica, cuello alto que protege del viento y el mismo punto grueso del resto de la colección.",
      details: cuidado,
      priceCents: 5990,
      categorySlug: "sudaderas",
      tags: ["sudadera", "hoodie", "cremallera"],
      images: [`${IMG}/rebelyn-zip-hoodie--portada.svg`],
      variants: [
        { colorId: crema.id, size: "M", stock: 6 },
        { colorId: crema.id, size: "L", stock: 5 },
        { colorId: negro.id, size: "M", stock: 4 },
        { colorId: negro.id, size: "L", stock: 2 },
      ],
    },
    {
      name: "REBELYN Cap",
      slug: "rebelyn-cap",
      summary: "Gorra estructurada con bordado frontal y hebillada metálica.",
      description: "Seis paneles, ala curva y bordado REBELYN en verde volt. Talla única regulable.",
      details: "Algodón twill\nBordado frontal\nHebillada metálica\nTalla única",
      priceCents: 2490,
      categorySlug: "accesorios",
      tags: ["gorra", "cap", "accesorio"],
      images: [`${IMG}/rebelyn-cap--portada.svg`],
      variants: [{ colorId: negro.id, size: "Única", stock: 25 }],
    },
  ];

  for (const p of products) {
    const category = await db.category.findUnique({ where: { slug: p.categorySlug } });
    const product = await db.product.upsert({
      where: { slug: p.slug },
      create: {
        name: p.name,
        slug: p.slug,
        summary: p.summary,
        description: p.description,
        details: p.details,
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents ?? null,
        categoryId: category?.id ?? null,
        featured: p.featured ?? false,
        status: "ACTIVE",
      },
      update: {
        name: p.name,
        summary: p.summary,
        description: p.description,
        details: p.details,
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents ?? null,
        categoryId: category?.id ?? null,
        featured: p.featured ?? false,
      },
    });

    // Imágenes
    await db.productImage.deleteMany({ where: { productId: product.id } });
    await db.productImage.createMany({
      data: p.images.map((url, i) => ({ productId: product.id, url, alt: `${p.name} ${i + 1}`, position: i })),
    });

    // Etiquetas
    await db.productTag.deleteMany({ where: { productId: product.id } });
    await db.productTag.createMany({ data: p.tags.map((tag) => ({ productId: product.id, tag })) });

    // Variantes + stock
    for (const v of p.variants) {
      const existing = await db.productVariant.findFirst({ where: { productId: product.id, colorId: v.colorId, size: v.size } });
      if (existing) {
        if (existing.stock !== v.stock) {
          await db.inventoryMovement.create({
            data: { variantId: existing.id, before: existing.stock, after: v.stock, change: v.stock - existing.stock, reason: "Seed" },
          });
          await db.productVariant.update({ where: { id: existing.id }, data: { stock: v.stock } });
        }
      } else {
        const created = await db.productVariant.create({ data: { productId: product.id, colorId: v.colorId, size: v.size, stock: v.stock } });
        if (v.stock > 0) {
          await db.inventoryMovement.create({
            data: { variantId: created.id, before: 0, after: v.stock, change: v.stock, reason: "Seed · alta" },
          });
        }
      }
    }

    console.log(`  ✓ ${p.name}`);
  }

  // ── Descuento de prueba ────────────────────────────────────────────────────
  await db.discount.upsert({
    where: { code: "BIENVENIDO10" },
    create: {
      code: "BIENVENIDO10",
      type: "PERCENTAGE",
      value: 10,
      minOrderCents: 3000,
      active: true,
      appliesToAll: true,
    },
    update: {},
  });

  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@rebelyn.net";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Rebelyn2026!";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await db.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash: adminHash, name: "Admin REBELYN", role: "SUPER_ADMIN" },
    update: {},
  });

  console.log(`\n· Admin: ${adminEmail} / ${adminPassword}`);
  console.log("· ¡Cambia la contraseña en cuanto entres!");
  console.log("· Listo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
