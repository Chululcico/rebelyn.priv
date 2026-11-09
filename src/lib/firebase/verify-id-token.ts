import "server-only";
import * as jose from "jose";

const JWKS = jose.createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export type FirebaseIdToken = {
  email?: string;
  name?: string;
  picture?: string;
  uid?: string;
  sub?: string;
  [key: string]: unknown;
};

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdToken> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Falta FIREBASE_PROJECT_ID");

  const { payload } = await jose.jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  return payload as FirebaseIdToken;
}
