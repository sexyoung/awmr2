import bcrypt from "bcryptjs";
import { redirect} from "@remix-run/node";

import { Role } from "~/consts/role";
import { db } from "~/utils/db.server";
import { storage } from "~/utils/session.server";

type LoginForm = {
  name: string;
  password: string;
};

type RegisterForm = LoginForm & {
  title: Role;
};

export async function register({ name, password, title }: RegisterForm) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { name, password: passwordHash, title },
  });
  return { id: user.id, name, title };
}

export async function login({ name, password }: LoginForm) {
  const user = await db.user.findUnique({ where: { name }});
  if (!user) return null;
  const isCorrectPassword = await bcrypt.compare(
    password,
    user.password
  );
  if (!isCorrectPassword) return null;
  return { id: user.id, name };
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "number") return null;
  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "number") {
    const searchParams = new URLSearchParams([
      ["redirectTo", redirectTo],
    ]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (typeof userId !== "number") {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, title: true },
    });
    return user;
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export async function createUserSession(
  userId: number,
  redirectTo: string
) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}