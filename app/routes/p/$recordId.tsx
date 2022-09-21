import { LoaderFunction, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getUser, requireUserId } from "~/api/user";
import { db } from "~/utils/db.server";

type LoaderData = {
  user: Awaited<ReturnType<typeof getUser>>;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUserId(request);
  const data: LoaderData = {
    user: await getUser(request),
  };
  const record = await db.record.findUnique({where: {id: +params.recordId!}});
  if(!record || !record.picture) return redirect('/login');
  
  return record.picture;
};

export default () => {
  const picture = useLoaderData();
  return (
    <img src={`/record${picture}`} className="wp100" />
  )
}