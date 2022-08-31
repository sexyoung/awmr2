import { format } from 'date-fns';
import { Record, Role, User } from "@prisma/client";
import { json, LinksFunction, LoaderFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { query as areaQuery, AreaData } from "~/api/area";
import { query as projectQuery, ProjectData } from "~/api/project";
import { isAdmin } from "~/api/user";
import { db } from "~/utils/db.server";
export { action } from "./project/action";

import stylesUrl from "~/styles/home-page.css";
import RecordBar from "~/component/RecordBar";
import { RoleMap } from '~/consts/role';

const TAKE = 5;

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

type LoaderData = {
  projectListItems: ProjectData;
  areaListItems: AreaData;

  userListItems: (User & {
    Record: Record[];
  })[]
};

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);

  const data: LoaderData = {
    projectListItems: [],
    areaListItems: [],
    userListItems: [],
  }

  data.projectListItems = await projectQuery(TAKE);
  data.areaListItems = (await areaQuery({ take: TAKE })).data;

  data.userListItems = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: TAKE,
    include: {
      Record: true,
    }
  });

  return json(data);
};

const HomePage = () => {
  const fetcher = useFetcher();
  const { projectListItems, areaListItems, userListItems } = useLoaderData<LoaderData>();

  const handleChange = (projectId: number) => {
    const formData = new FormData(document.getElementById(`formToggle${projectId}`) as HTMLFormElement);
    const _method = formData.get('_method') as string;
    const isActive = (document.getElementById(`isActive${projectId}`) as HTMLInputElement).checked;
  
    fetcher.submit({
      _method,
      isActive: isActive ? '': '1',
      id: projectId.toString(),
    }, {
      method: 'patch',
    });
  }

  return (
    <div className="Page HomePage">
      <div className="block">
        <h2 className="title">小區查詢</h2>
        <table>
          <thead>
            <tr>
              <th>標案名稱</th>
              <th>小區代號</th>
              <th>登錄</th>
              <th style={{width: 80, boxSizing: 'border-box'}}>抄見率</th>
              <th style={{width: 150, boxSizing: 'border-box'}}>進度</th>
              <th>錶數</th>
              <th style={{width: 130, boxSizing: 'border-box'}}>登錄時間</th>
            </tr>
          </thead>
          <tbody>
            {areaListItems.map((area, index) =>
              <tr key={area.area}>
                <td>{area.projectName}</td>
                <td>{area.area}</td>
                <td>{area.success}</td>
                <td className='color-mantis'>{~~((area.success || 0) / area.total * 100)}%</td>
                <td>
                  <RecordBar {...{
                    success: area.success,
                    notRecord: area.notRecord,
                    total: area.total,
                    z: areaListItems.length - index,
                  }} />
                </td>
                <td>{area.total}</td>
                <td>{
                  /* {area.lastRecordTime ? format(new Date(area.lastRecordTime), 'MM-dd hh:mm'): '未登錄'}<br /> */
                  area.lastRecordTime ? format(new Date(area.lastRecordTime), 'MM-dd HH:mm'): '未登錄'
                }</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7}>
                <Link to="/d/area">所有小區</Link>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="block">
        <h2 className="title">標案管理</h2>
        <table>
          <thead>
            <tr>
              <th>啟用</th>
              <th>標案名稱</th>
              <th>標案代號</th>
              <th>小區</th>
              <th style={{width: 150, boxSizing: 'border-box'}}>進度</th>
              <th>錶數</th>
              <th colSpan={2} />
            </tr>
          </thead>
          <tbody>
            {projectListItems.map((project, index) =>
              <tr key={project.id}>
                <td>
                  <fetcher.Form method="patch" id={`formToggle${project.id}`}>
                    <input type="hidden" name="_method" value="toggle" />
                    <input type="checkbox" name="isActive" id={`isActive${project.id}`} defaultChecked={project.isActive} value={project.isActive ? "1": ""} onChange={handleChange.bind(null, project.id)} />
                  </fetcher.Form>
                </td>
                <td>{project.name}</td>
                <td>{project.code}</td>
                <td>{project.areaCount}</td>
                <td>
                  <RecordBar {...{
                    success: project.success,
                    notRecord: project.notRecord,
                    total: project.total,
                    z: projectListItems.length - index,
                  }} />
                </td>
                <td>{project.total}</td>
                <td><Link to={`/d/meter/upload/${project.id}`}>上傳水錶</Link></td>
                <td><Link to={`/d/project/export/${project.id}`}>匯出</Link></td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8}>
                <Link to="/d/project">所有標案</Link>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="block">
        <h2 className="title">人事查詢</h2>
        <table>
          <thead>
            <tr>
              <th style={{width: 40}}>啟用</th>
              <th>全名</th>
              <th>權限</th>
              <th>手機</th>
              <th>信箱</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {userListItems.map(user =>
              <tr key={user.id}>
                <td><input type="checkbox" defaultChecked={user.isActive} value="1" /></td>
                <td>{user.fullname}</td>
                <td>{RoleMap[user.title]}</td>
                <td>{user.phone}</td>
                <td>{user.email}</td>
                <td><Link to={`/d/user/${user.id}`}>編輯</Link></td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}>
                <Link to="/d/user">所有人事</Link>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default HomePage