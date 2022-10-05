import bcrypt from "bcryptjs";
import { redirect} from "@remix-run/node";

import { Role } from "~/consts/role";
import { db } from "~/utils/db.server";
import { storage } from "~/utils/session.server";
import { Prisma } from "@prisma/client";

type LoginForm = {
  name: string;
  password: string;
};

type RegisterForm = LoginForm & {
  fullname: string;
  title: Role;
  email: string;
  phone: string;
  note: string;
};

export async function register({ name, password, title, fullname, email, phone, note }: RegisterForm) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { name, password: passwordHash, title, fullname, email, phone, note, isActive: false },
  });
  return { id: user.id, name, title, fullname, email, phone, note };
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
      // select: { id: true, name: true, fullname: true, title: true, avatar: true },
      include: { projects: {include: { project: true }} },
    });
    return user;
  } catch {
    throw logout(request);
  }
}

export async function isAdmin(request: Request) {
  const user = await getUser(request);
  if(!user) return false;
  if(user.title === Role.ENG) {
    throw redirect(`/d/record`);
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

export async function update(id: number, data: any) {
  try {
    await db.user.update({
      where: { id },
      data,
    });
    return {isUpated: true};
  } catch (err) {
    if(err instanceof Prisma.PrismaClientKnownRequestError) {
      return {isUpated: false, code: err.code, target: err?.meta?.target};
    }
    return {isUpated: false};
  }
}

export async function toggle({id, isActive}: {id: number, isActive: boolean}) {
  await db.user.update({
    where: { id },
    data: { isActive },
  });
}