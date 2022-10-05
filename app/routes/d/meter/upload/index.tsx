import { LoaderFunction, redirect } from "@remix-run/node";
import { getUser, isAdmin } from "~/api/user";
import { db } from "~/utils/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);

  const user = await getUser(request);
  if(!user) return;
  const projectListItems = user.projects.map(({ project }) => ({id: project.id, name: project.name}));

  if(!projectListItems.length) redirect(`/d/project`);

  const p = projectListItems.shift();
  if(p) return redirect(`/d/meter/upload/${p.id}`)
  return redirect(`/d/meter`)
}