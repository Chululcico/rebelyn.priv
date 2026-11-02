import "server-only";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { Role, User } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const SESSION_COOKIE = "rb_session";
const SESSION_DAYS = 30;

export type SafeUser = Pick<User, "id" | "email" | "name" | "phone" | "role" | "createdAt">;

export function toSafeUser(user: User): SafeUser {
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, createdAt: user.createdAt };
}

// ── Contraseñas ───────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Sesiones ──────────────────────────────────────────────────────────────────
// La cookie vive en el navegador; en BD solo se guarda el hash SHA-256 del token.
// Si la BD se filtra, no se pueden usar las sesiones robadas.

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerStore.get("user-agent")?.slice(0, 255) ?? null;

  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt, ip, userAgent } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return toSafeUser(session.user);
}

export async function getCurrentUserFull(): Promise<User | null> {
  const safe = await getCurrentUser();
  if (!safe) return null;
  return db.user.findUnique({ where: { id: safe.id } });
}

// ── RBAC ──────────────────────────────────────────────────────────────────────

export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("No has iniciado sesión", 401);
  return user;
}

export async function requireAdmin(minRole: Role = "ADMIN"): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("No has iniciado sesión", 401);
  if (user.role === "CUSTOMER") throw new AuthError("No tienes permisos", 403);
  if (minRole === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new AuthError("Requiere superadministrador", 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// ── Registro / login ──────────────────────────────────────────────────────────

const MIN_PASSWORD = 8;

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`;
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "La contraseña debe combinar letras y números";
  }
  return null;
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}): Promise<SafeUser> {
  const email = input.email.trim().toLowerCase();
  const problem = passwordProblem(input.password);
  if (problem) throw new AuthError(problem);

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new AuthError("Ya existe una cuenta con ese email", 409);

  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name?.trim() || null,
      phone: input.phone?.trim() || null,
    },
  });

  // Migrar el carrito de invitado a la cuenta recién creada.
  const cookieStore = await cookies();
  const guestToken = cookieStore.get("rb_cart")?.value;
  if (guestToken) {
    await db.cart.updateMany({ where: { token: guestToken, userId: null }, data: { userId: user.id } });
  }

  return toSafeUser(user);
}

export async function loginCustomer(input: { email: string; password: string; ip?: string | null }): Promise<SafeUser> {
  const email = input.email.trim().toLowerCase();

  await db.loginAttempt.create({ data: { email, ip: input.ip ?? null, success: false } });

  const user = await db.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : false;

  if (!user || !valid) {
    throw new AuthError("Email o contraseña incorrectos", 401);
  }

  // Borra el intento fallido recién registrado y marca el acierto.
  await db.loginAttempt.deleteMany({ where: { email, success: false } });

  // Fusionar carrito de invitado con el del usuario.
  const cookieStore = await cookies();
  const guestToken = cookieStore.get("rb_cart")?.value;
  if (guestToken) {
    await mergeCarts(user.id, guestToken);
  }

  await createSession(user.id);
  return toSafeUser(user);
}

/** Fusiona el carrito de invitado (token) en el del usuario. */
export async function mergeCarts(userId: string, guestToken: string): Promise<void> {
  const [guestCart, userCart] = await Promise.all([
    db.cart.findUnique({ where: { token: guestToken }, include: { items: true } }),
    db.cart.findFirst({ where: { userId }, include: { items: true } }),
  ]);
  if (!guestCart) return;

  if (!userCart) {
    await db.cart.update({ where: { id: guestCart.id }, data: { userId, token: null } });
    return;
  }

  for (const item of guestCart.items) {
    const existing = userCart.items.find((i) => i.variantId === item.variantId);
    if (existing) {
      await db.cartItem.update({ where: { id: existing.id }, data: { qty: existing.qty + item.qty } });
    } else {
      await db.cartItem.update({ where: { id: item.id }, data: { cartId: userCart.id } });
    }
  }
  await db.cart.delete({ where: { id: guestCart.id } }).catch(() => undefined);
}

/** Cuenta intentos fallidos recientes de login para frenar fuerza bruta. */
export async function recentFailedAttempts(email: string, ip: string | null, windowMs = 15 * 60 * 1000): Promise<number> {
  const since = new Date(Date.now() - windowMs);
  return db.loginAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: since },
      ...(ip ? { ip } : {}),
    },
  });
}
