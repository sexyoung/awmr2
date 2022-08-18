import { Record, User } from "@prisma/client";
import { LoaderFunction } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { isAdmin } from "~/api/user";
import { db } from "~/utils/db.server";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";

const PAGE_SIZE = 30;

type ItemType = User & {
  Record: Record[];
}

type LoadData = {
  href: string;
  pathname: string;
  userListItems: ItemType[];
  search: string;
} & PaginationProps

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  const url = new URL(request.url);
  const page = +url.searchParams.get("page")! || 1;
  const search = url.searchParams.get("search") || '';

  // 預設排除今日登記
  const where = {
    OR: [
      {name: { contains: search }},
      {fullname: { contains: search }},
      {email: { contains: search }},
      {phone: { contains: search }},
      {note: { contains: search }},
    ]
  }

  let userCount = await db.user.count({ where });
  userCount = userCount && (userCount - 1);
  const pageTotal = ~~(userCount / PAGE_SIZE) + 1;

  return {
    search,
    pageTotal,
    href: url.href,
    userListItems: await db.user.findMany({
      orderBy: { createdAt: "desc" },
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        Record: true,
      }
    }),
  };
};

export default () => {
  const { userListItems, pageTotal, href, search } = useLoaderData<LoadData>();
  return (
    <div className="Page UserPage">
      <div className="block">
        <div className="header">
          <h2 className="title">
            人事查詢
            <Link className="btn primary f1r ml5 tdn" to="/d/user/new">新增使用者</Link>
          </h2>
          {pageTotal && <Pagination {...{pageTotal, href}} />}
        </div>
        <div className="search-form">
          <Form method="get">
            <input type="text" name="search" defaultValue={search}  placeholder="搜尋帳號本名、信箱、手機、備註" />
          </Form>
        </div>
        {userListItems.map(user =>
          <div key={user.id}>
            {user.fullname} / 
            {user.phone} / 
            {user.email} / 
            最後登入時間
            <Link to={`/d/user/${user.id}`}>{user.name}</Link>
          </div>
        )}
      </div>
    </div>
  )
}
