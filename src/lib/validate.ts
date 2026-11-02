import { z } from "zod";

/** Esquemas de validación de entrada (Zod). Se ejecutan SIEMPRE en servidor. */

export const emailSchema = z.string().trim().toLowerCase().email("Email no válido").max(160);
export const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(128).regex(/[a-zA-Z]/, "Debe contener letras").regex(/[0-9]/, "Debe contener números");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2, "Nombre demasiado corto").max(80).optional(),
  phone: z.string().trim().max(30).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Introduce tu contraseña").max(128),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(10).max(128),
  password: passwordSchema,
});

export const addressSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  line1: z.string().trim().min(3, "Dirección demasiado corta").max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60),
  province: z.string().trim().min(2).max(60),
  postalCode: z.string().trim().regex(/^[0-9]{5}$/, "Código postal de 5 dígitos"),
  country: z.string().trim().length(2).default("ES"),
  isDefault: z.boolean().optional(),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  phone: z.string().trim().min(7, "Teléfono no válido").max(30),
  name: z.string().trim().min(2).max(80),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60),
  province: z.string().trim().min(2).max(60),
  postalCode: z.string().trim().regex(/^[0-9]{5}$/, "Código postal de 5 dígitos"),
  country: z.string().trim().length(2).default("ES"),
  shippingMethod: z.string().max(40).default("standard"),
  discountCode: z.string().trim().max(40).optional().or(z.literal("")),
  customerNote: z.string().trim().max(500).optional().or(z.literal("")),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Debes aceptar las condiciones de compra" }) }),
});

export const addToCartSchema = z.object({
  variantId: z.string().min(6).max(64),
  qty: z.number().int().min(1).max(10).default(1),
});

export const cartQtySchema = z.object({
  itemId: z.string().min(6).max(64),
  qty: z.number().int().min(0).max(10),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Cuéntanos un poco más").max(3000),
});

export const newsletterSchema = z.object({ email: emailSchema });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const returnRequestSchema = z.object({
  orderNumber: z.string().trim().min(4).max(40),
  email: emailSchema,
  reason: z.string().trim().min(10, "Explica el motivo").max(1500),
  items: z
    .array(z.object({ orderItemId: z.string().min(6).max(64), qty: z.number().int().min(1).max(10) }))
    .min(1)
    .max(20),
});

// ── Admin ─────────────────────────────────────────────────────────────────────

export const productVariantInputSchema = z.object({
  id: z.string().optional(),
  size: z.string().trim().min(1).max(12),
  colorName: z.string().trim().min(1).max(40),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Hex no válido"),
  stock: z.number().int().min(0).max(99999),
  priceCents: z.number().int().min(0).nullable().optional(),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(80).optional(),
  summary: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  details: z.string().trim().max(3000).optional().or(z.literal("")),
  priceCents: z.number().int().min(0).max(9_999_999),
  compareAtCents: z.number().int().min(0).max(9_999_999).nullable().optional(),
  categoryId: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  images: z.array(z.object({ url: z.string().trim().min(1).max(500), alt: z.string().trim().max(160).optional() })).max(12).default([]),
  variants: z.array(productVariantInputSchema).min(1, "Debe existir al menos una variante"),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().max(70).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  image: z.string().trim().max(500).optional().or(z.literal("")),
  order: z.number().int().min(0).max(9999).default(0),
  parentId: z.string().optional().nullable(),
});

export const discountInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, "Solo letras, números, - y _"),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().int().min(1).max(999_999),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  minOrderCents: z.number().int().min(0).default(0),
  maxUses: z.number().int().min(1).max(100000).nullable().optional(),
  active: z.boolean().default(true),
  appliesToAll: z.boolean().default(true),
  productIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
});

export const orderStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  trackingNumber: z.string().trim().max(80).optional().or(z.literal("")),
});

export const refundSchema = z.object({
  paymentId: z.string().min(6).max(64),
  amountCents: z.number().int().min(1).optional(),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

export const stockAdjustSchema = z.object({
  variantId: z.string().min(6).max(64),
  delta: z.number().int().min(-9999).max(9999),
  reason: z.string().trim().min(3).max(200),
});

export const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(60),
  contactEmail: emailSchema,
  contactPhone: z.string().trim().max(30),
  address: z.string().trim().max(200),
  legalName: z.string().trim().max(120),
  legalId: z.string().trim().max(40),
  currency: z.string().trim().length(3),
  taxRatePercent: z.number().min(0).max(100),
  pricesIncludeTax: z.boolean(),
  social: z.object({
    instagram: z.string().trim().max(300).optional(),
    tiktok: z.string().trim().max(300).optional(),
    whatsapp: z.string().trim().max(40).optional(),
  }),
  shippingMethods: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(40),
        name: z.string().trim().min(2).max(60),
        priceCents: z.number().int().min(0).max(99999),
        freeOverCents: z.number().int().min(0).nullable(),
        estimatedDays: z.string().trim().max(60),
        active: z.boolean(),
      }),
    )
    .min(1),
});
