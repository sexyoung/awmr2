import { LoaderFunction, redirect } from "@remix-run/node";
import { isAdmin } from "~/api/user";
import { db } from "~/utils/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  const p = await db.project.findFirst();
  if(p) return redirect(`/d/project/export/${p.id}`)
  return redirect(`/d/project`)
}