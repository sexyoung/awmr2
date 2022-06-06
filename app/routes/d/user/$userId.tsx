import type { User } from "@prisma/client";
import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";

type LoaderData = { user: User };

export const loader: LoaderFunction = async ({ params: { userId = 0 } }) => {
  const user = await db.user.findUnique({
    where: { id: +userId || 0 },
  });
  if (!user) throw new Error("user not found");
  const data: LoaderData = { user };
  return json(data);
};

const UserRoute = () => {
  const { user } = useLoaderData<LoaderData>();
  return (
    <div>
      <h2>使用者內頁</h2>
      <div>id: {user.id}</div>
      <div>name: {user.name}</div>
      <div>title: {user.title}</div>
    </div>
  )
}

export default UserRoute