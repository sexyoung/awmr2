import fs from "fs";
import path from "path";
import { Role, Record, Meter, User, Status } from "@prisma/client";
import { Link, useLoaderData } from "@remix-run/react";
import { LinksFunction, LoaderFunction, redirect } from "@remix-run/node";
import { db } from "~/utils/db.server";
import { getUser, requireUserId } from "~/api/user";

import stylesUrl from "~/styles/album.css";
import { NotRecordReasonMap } from "~/consts/reocrd";
import { format } from "date-fns";

type LoaderData = {
  date: string;
  recordList: (Record & {
    user: User;
    meter: Meter;
  })[];
};

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);
  const url = new URL(request.url);
  // const record = await db.record.findUnique({where: {id: +params.recordId!}});
  const p = url.searchParams.get("path")! || '';
  const user = await getUser(request);
  if(!user || user.title === Role.ENG) return redirect('/login');
  
  try {
    let pictureList = fs.readdirSync(path.resolve(__dirname, `../public/record${p}`));
    return {
      date: p.split('/').slice(0, -1).join('/'),
      recordList: await db.record.findMany({
        where: {
          picture: {in: pictureList.map(pic => `${p}/${pic}`)},
          meter: {
            project: {
              id: {in: user.projects.map(p => p.projectId)},
            }
          }
        },
        include: {
          user: true,
          meter: true,
        }
      })
    }
  } catch(err) {
    return redirect('/login');
  }
  
};

export default () => {
  const {recordList = [], date} = useLoaderData<LoaderData>();
  return (
    <div className="Page AlbumPage">
      <h2 className="wm tac">
        {date.slice(1).replace('-', '/')} 所有登錄照片,
        <Link to={`/list-folder?path=${date}`}>看當月份所有日期</Link>
      </h2>
      <div className="df fww list">
        {recordList.map((record) =>
          <div key={record.id} className="record">
            <div className="wm">
              <span className={`bg-${record.status} ph20`}>
                {record.status === Status.success ? record.content: NotRecordReasonMap[record.content as keyof typeof NotRecordReasonMap]}
              </span>
              <span className="user-name ml5">
                {record.user.fullname || record.user.name}
              </span>
              <span className="f13 ml5 bg-gray">{format(+ new Date(record.createdAt), 'yyyy/MM/dd HH:mm')}</span>
            </div>
            <div className="wm">
              {record.meter.waterId} - {record.meter.meterId}
            </div>
            <Link to={`/p/${record.id}`}>
              <div
                className="picture bgsc bgpc"
                style={{
                  margin: 5,
                  marginBottom: 50,
                  width: 250,
                  height: 250,
                  backgroundImage: `url(/record/${record.picture})`
                }}
              />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}