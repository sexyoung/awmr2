import { json, LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";

type LoaderData = {
  userListItems: Array<{ id: number; name: string }>;
};

export const loader: LoaderFunction = async () => {
  const data: LoaderData = {
    userListItems: await db.user.findMany({
      take: 5,
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  };
  return json(data);
};

export default () => {
  const { userListItems } = useLoaderData<LoaderData>();
  return (
    <div>
      <h2>使用者頁</h2>
      {userListItems.map(user =>
        <div key={user.id}>
          <Link to={`/d/user/${user.id}`}>{user.name}</Link>
        </div>
      )}
    </div>
  )
}
