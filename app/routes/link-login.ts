import md5 from "js-md5";
import { LoaderFunction, redirect } from "@remix-run/node";
import { db } from "~/utils/db.server";
import { formatYmd } from "~/utils/time";
import { createUserSession } from "~/api/user";

export const loader: LoaderFunction = async ({request}) => {
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash") || "";
  const userList = await db.user.findMany({ where: {isActive: true} });
  const user = userList.find(user => hash === `${md5(`${formatYmd()}${user.id}${user.name}${user.createdAt}`)}`);
  if(!user) return redirect('/logout');
  return createUserSession(user.id, '/d');
}