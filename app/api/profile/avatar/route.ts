import { NextResponse } from "next/server";
import { readBoundSession } from "@/lib/account-session";
import { saltedNullifierHash } from "@/lib/ens/registrar";
import { dbConfigured, getCredentialAvatar, setCredentialAvatar } from "@/lib/db";
import { isAvatarId } from "@/lib/avatars";

/**
 * GET/POST /api/profile/avatar — the signed-in human's profile avatar, stored in Convex so it
 * follows them across devices (not just this browser).
 *
 * Identity is the same signed, httpOnly session cookie every route trusts: we derive the salted
 * nullifier hash server-side and key the avatar on it. The client never supplies the id — so a
 * viewer can only read/write their OWN avatar. The raw nullifier never leaves the server.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Derive the salted nullifier hash for the caller — but only from a session bound to the account
 * they can prove. A stale cookie from a previous account must not read or overwrite that person's
 * profile.
 */
async function currentNullifierHash(request: Request): Promise<string | null> {
  const bound = await readBoundSession(request);
  if (!bound) return null;
  const { session } = bound;
  // Onboarding sessions carry the raw nullifier (hash it); passkey re-login sessions already carry
  // the salted hash. Either way we key on the salted hash.
  return session.nullifierHash ?? saltedNullifierHash(session.nullifier!).toString();
}

export async function GET(request: Request) {
  if (!dbConfigured()) return NextResponse.json({ avatar: null });
  const nullifierHash = await currentNullifierHash(request);
  if (!nullifierHash) return NextResponse.json({ avatar: null });
  try {
    const avatar = await getCredentialAvatar(nullifierHash);
    return NextResponse.json({ avatar });
  } catch {
    return NextResponse.json({ avatar: null });
  }
}

export async function POST(request: Request) {
  const nullifierHash = await currentNullifierHash(request);
  if (!nullifierHash) {
    return NextResponse.json({ error: "not_verified" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const avatar = (body as { avatar?: unknown } | null)?.avatar;
  if (!isAvatarId(avatar)) {
    return NextResponse.json({ error: "invalid_avatar" }, { status: 400 });
  }

  if (!dbConfigured()) return NextResponse.json({ saved: false });
  try {
    const saved = await setCredentialAvatar(nullifierHash, avatar);
    return NextResponse.json({ saved });
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
