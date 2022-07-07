import { LoaderFunction, redirect } from "@remix-run/node";
import { isAdmin } from "~/api/user";
import { db } from "~/utils/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  const p = await db.project.findFirst();
  if(p) return redirect(`/d/meter/upload/${p.id}`)
  return redirect(`/d/meter`)
}