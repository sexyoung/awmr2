import { LoaderFunction, json } from "@remix-run/node";
import { Outlet, Link, useLoaderData, Form } from "@remix-run/react";

import { getUser, requireUserId } from "~/api/user";

type LoaderData = {
  user: Awaited<ReturnType<typeof getUser>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);
  const data: LoaderData = {
    user: await getUser(request),
  };
  return json(data);
};

export default function DashBoard() {
  const { user } = useLoaderData<LoaderData>();
  
  return (
    <div>
      {user &&
        <div className="user-info">
          <span>{`Hi ${user.name}`}</span>
          <Form action="/logout" method="post">
            <button type="submit" className="button">
              Logout
            </button>
          </Form>
        </div>
      }
      <ul>
        <li><Link to="/login">登入</Link></li>
        <li><Link to="/d">首頁</Link></li>
        <li><Link to="/d/user">使用者頁</Link></li>
        <li><Link to="/d/user/new">新增使用者</Link></li>
        <li><Link to="/d/area">小區查詢</Link></li>
        <li><Link to="/d/project">標案管理</Link></li>
        <li><Link to="/d/meter/upload">上傳水錶</Link></li>
        <li><Link to="/d/meter">水錶查詢</Link></li>
        <li><Link to="/d/record">水錶登錄</Link></li>
        <li><Link to="/d/record/history">登錄記錄</Link></li>
        <li><Link to="/d/record/out">區外要求</Link></li>
      </ul>
      <Outlet />
    </div>
  );
}
