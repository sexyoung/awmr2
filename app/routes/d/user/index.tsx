import { Record, Role, User } from "@prisma/client";
import { LinksFunction, LoaderFunction, redirect } from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData } from "@remix-run/react";
import { isAdmin } from "~/api/user";
import { db } from "~/utils/db.server";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";

import stylesUrl from "~/styles/user-page.css";
import { RoleMap } from "~/consts/role";
export { action } from "./action";

const PAGE_SIZE = 20;
const RoleArr = Object.keys(Role);

type ItemType = User & {
  Record: Record[];
}

type LoadData = {
  href: string;
  title: string;
  pathname: string;
  showResign: boolean;
  userListItems: ItemType[];
  search: string;
} & PaginationProps

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  const url = new URL(request.url);
  const index = RoleArr.indexOf(url.searchParams.get("title") as string);
  if(index === -1) return redirect("/d/user?title=ENG");
  const showResign = Boolean(url.searchParams.get("showResign")! || '');
  const page = +url.searchParams.get("page")! || 1;
  const title = url.searchParams.get("title") as Role;
  const search = url.searchParams.get("search") || '';

  const whereIsActive = showResign ? {}: {isActive: true}

  const where = {
    title,
    ...whereIsActive,
    ...(search ? {
      OR: [
        {name: { contains: search }},
        {fullname: { contains: search }},
        {email: { contains: search }},
        {phone: { contains: search }},
        {note: { contains: search }},
      ],
    }: {})
  }

  let userCount = await db.user.count({ where });
  userCount = userCount && (userCount - 1);
  const pageTotal = ~~(userCount / PAGE_SIZE) + 1;

  return {
    title,
    search,
    pageTotal,
    showResign,
    href: url.href,
    userListItems: await db.user.findMany({
      orderBy: { createdAt: "desc" },
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      // include: { // 這個加去會很久
      //   Record: true,
      // }
    }),
  };
};

export default () => {
  const fetcher = useFetcher();
  const { userListItems, pageTotal, href, search, title, showResign } = useLoaderData<LoadData>();

  const handleActive: React.ChangeEventHandler<HTMLInputElement> = ({currentTarget}) => {
    console.log(currentTarget.checked);
    const result: {[key:string]: string} = {}
    const url = new URL(location.href);
    for (const [key, value] of url.searchParams.entries()) {
      if(value) {
        result[key] = value;
      }
    }
    if(currentTarget.checked) {
      result.showResign = "1";
    } else {
      delete result.showResign;
    }

    location.href = `/d/user?${Object.keys(result).map((key) =>
      `${key}=${result[key]}`
    ).join('&')}`
  }

  const toggleActive = (id: number, isActive: boolean) => {
    fetcher.submit({
      _method: 'toggle',
      isActive: isActive ? '1': '',
      id: id.toString(),
    }, {
      method: 'patch',
    });
  }

  return (
    <div className="Page UserPage">
      <div className="block">
        <div className="header">
          <h2 className="title">
            人事查詢
            <Link className="btn primary f1r ml5 tdn" to="/d/user/new">新增使用者</Link>
          </h2>
          {pageTotal > 1 && <Pagination {...{pageTotal, href}} />}
        </div>
        <div className="search-form">
          <Form method="get">
            <input type="hidden" name="title" value={title} />
            <input type="text" name="search" defaultValue={search}  placeholder="搜尋帳號本名、信箱、手機、備註" />
          </Form>
        </div>
        <ul className={`filter ${title} df p0 m0 gap5`}>
          <li className="fx1 tac ENG">
            <Link className="p10" to={`/d/user?title=ENG&search=${search}&showResign=${showResign ? 1: ''}`}>{RoleMap.ENG}</Link>
          </li>
          <li className="fx1 tac ENM">
            <Link className="p10" to={`/d/user?title=ENM&search=${search}&showResign=${showResign ? 1: ''}`}>{RoleMap.ENM}</Link>
          </li>
          <li className="fx1 tac OFW">
            <Link className="p10" to={`/d/user?title=OFW&search=${search}&showResign=${showResign ? 1: ''}`}>{RoleMap.OFW}</Link>
          </li>
          <li className="fx1 tac ADM">
            <Link className="p10" to={`/d/user?title=ADM&search=${search}&showResign=${showResign ? 1: ''}`}>{RoleMap.ADM}</Link>
          </li>
          <li className="fx1 tac df jcc aic">
            <label>
              <input type="checkbox" name="isActive" value="1" onChange={handleActive} defaultChecked={showResign} />
              顯示停用
            </label>
          </li>
        </ul>
        <div className="ph20 pb20 df fww gap10">
          {userListItems.map(user =>
            <div key={user.id} className={`user-box tac pr df fdc gap2 ${user.isActive ? 'enabled': 'disabled'}`}>
              <div onClick={toggleActive.bind(null, user.id, user.isActive)} className={`bgsc bgpc pr ovh avatar ${user.isActive ? 'disabled': 'enabled'}`} style={
                user.avatar ?
                {backgroundImage: `url(/avatar/${user.avatar})`}:
                {backgroundColor: `#f6f6f6`}
              } />
              <div>{user.name} - {user.fullname}</div>
              <div>{user.phone || '　'}</div>
              <Link className="edit" to={`/d/user/${user.id}`}>編輯資料</Link>
              <div className={`title pa ${user.title}`}>{RoleMap[user.title]}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
