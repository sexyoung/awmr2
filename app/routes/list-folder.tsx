import fs from "fs";
import path from "path";
import { Role } from "@prisma/client";
import { LoaderFunction, redirect } from "@remix-run/node";
import { getUser, requireUserId } from "~/api/user";
import { Link, useLoaderData } from "@remix-run/react";

type LoaderData = {
  p: string;
  albumList: string[];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);
  const user = await getUser(request);
  const url = new URL(request.url);
  const p = url.searchParams.get("path")! || '';
  if(!user || user.title === Role.ENG) return redirect('/login');
  
  try {
    let albumList = fs.readdirSync(path.resolve(__dirname, `../public/record${p}`), { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    return {
      p,
      albumList
    }
  } catch(err) {
    // console.log(err);
    // return null;
    return redirect('/login');
  }
  
};

export default () => {
  const {albumList = [], p} = useLoaderData<LoaderData>();
  return (
    <div>
      <h2 className="wm tac">
        {p ?
          <>
            {p.slice(1).replace('-', '/')} 的所有日期,
            <Link to={`/list-folder?path=`}>看所有月份</Link>
          </>:
          '所有月份'
        }
      </h2>
      <ul>
        {albumList.map(album =>
          <li key={album}>
            <Link to={`/${p.includes('-') ? 'album': 'list-folder'}?path=${p}/${album}`}>
              {p.slice(1).replace('-', '/')}{!p ? album.replace('-', '/'): `/${album}`}
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}