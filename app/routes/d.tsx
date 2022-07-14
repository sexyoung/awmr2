import { LoaderFunction, json, LinksFunction } from "@remix-run/node";
import { Outlet, Link, useLoaderData, Form } from "@remix-run/react";

import { getUser, requireUserId } from "~/api/user";
import { Role } from "~/consts/role";

import stylesUrl from "~/styles/d.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

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
    <div className="frame">
      <div className="app">
        <div className="menu">
          <div className="system-name">
            小區抄表系統
          </div>
          {user &&
            <div className="user-info">
              <div className="avatar" style={{backgroundImage: `url(/avatar/${user.avatar})`}}/>
              <div className="name">{user.name}</div>
              <Form action="/logout" method="post">
                <button type="submit" className="logout">
                  登出
                </button>
              </Form>
            </div>
          }
          <ul>
            {/* <li><Link to="/login">登入</Link></li> */}
            {user?.title !== Role.ENG && <>
              <li><Link to="/d">首頁總覽</Link></li>
              <li><Link to="/d/area">小區查詢</Link></li>
              <li><Link to="/d/project">標案管理</Link></li>
              <li><Link to="/d/meter/upload">上傳水錶</Link></li>
              <li><Link to="/d/meter">水錶查詢</Link></li>
            </>}

            <li><Link to="/d/record">水錶登錄</Link></li>
            <li><Link to="/d/record/history">登錄記錄</Link></li>
            {user?.title !== Role.ENG && <>
              <li><Link to="/d/record/out">區外要求</Link></li>
              <li><Link to="/d/user">人事查詢</Link></li>
            </>}
            {/* <li><Link to="/d/project/export">標案匯出</Link></li> */}
          </ul>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
