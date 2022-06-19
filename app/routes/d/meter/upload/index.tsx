import { LoaderFunction, redirect } from "@remix-run/node";
import { db } from "~/utils/db.server";

export const loader: LoaderFunction = async () => {
  const p = await db.project.findFirst();
  if(p) return redirect(`/d/meter/upload/${p.id}`)
  return redirect(`/d/meter`)
}