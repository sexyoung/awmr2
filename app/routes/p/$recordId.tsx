import { Role } from "@prisma/client";
import { LoaderFunction, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { getUser, requireUserId } from "~/api/user";
import { db } from "~/utils/db.server";

type LoaderData = {
  picture: string;
  isNotENG: boolean;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUserId(request);
  const record = await db.record.findUnique({where: {id: +params.recordId!}});
  const user = await getUser(request);
  if(!user || !record || !record.picture) return redirect('/login');
  const data: LoaderData = {
    picture: record.picture,
    isNotENG: user.title !== Role.ENG,
  };

  return data;
};

export default () => {
  const {picture, isNotENG} = useLoaderData<LoaderData>();
  return (
    <>
      {isNotENG && (
        <h3 className="tac">
          <Link style={{padding: 20}} to={`/album?path=${picture.split('/').slice(0, -1).join('/')}`}>
            看當日所有照片
          </Link>
        </h3>
      )}
      <img src={`/record${picture}`} className="wp100" />
    </>
  )
}