import { useEffect, useState } from "react";
import type { Record, User, Project, Meter } from "@prisma/client";
import { Role } from "@prisma/client";
import { redirect, LinksFunction, LoaderFunction, MetaFunction } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { Avator } from "./avatar";
import { getUser, isAdmin } from "~/api/user";
import { Toast } from "~/component/Toast";
import stylesUrl from "~/styles/user-detail-page.css";
import { format } from "date-fns";
import { NotRecordReasonMap, Status } from "~/consts/reocrd";
import { UserForm } from "./form";
export { action } from "./action";

type ActionData = {
  type: string;
  ts: number;
  code?: string;
  target?: string;
};

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const meta: MetaFunction = ({data}) => {
  return {
    title: `編輯 ${data.user ? (data.user.fullname || data.user.name): ''}`,
  }
};

type LoaderData = {
  titleList: Role[];
  user: User & {
    Record: (Record & { meter: Meter })[];
    projects: number[];
  },
  projectListItems: Project[];
  canEdit: boolean;
};

export const loader: LoaderFunction = async ({ params: { userId = 0 }, request }) => {
  await isAdmin(request);
  const currUser = await getUser(request);
  if(!currUser) return;
  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  const user = await db.user.findUnique({
    where: { id: +userId || 0 },
    include: {
      Record: {
        take: 10,
        orderBy: { id: "desc"},
        include: { meter: true }
      },
      projects: {
        include: { project: true }
      },
    }
  });
  if (!user) throw new Error("user not found");
  if (user.title === Role.ADM && currUser.title !== Role.ADM) return redirect('/d');
  const RoleList = Object.keys(Role);
  return {
    titleList: RoleList.slice(0, RoleList.indexOf(currUser.title) + 1),
    user: {
      ...user,
      projects: user.projects.map(({ project }) => project.id)
    },
    projectListItems,
    canEdit: RoleList.indexOf(currUser.title) > RoleList.indexOf(user.title) || currUser.title === Role.ADM,
  };
};

const UserRoute = () => {
  const [error, setError] = useState('');
  const [showUpdated, setShowUpdated] = useState(false);
  const {type, ts, code, target} = (useActionData<ActionData>() || {}) as ActionData;
  const { user, projectListItems, titleList, canEdit } = useLoaderData<LoaderData>();

  useEffect(() => {
    if(type === 'UPDATED') {
      setShowUpdated(true);
      setTimeout(setShowUpdated.bind(null, false), 1000);
    } else if (type === 'ERROR') {
      setError(JSON.stringify({code, target}));
      setTimeout(setError.bind(null, ''), 3000);
    }
  }, [type, ts]);

  return (
    <div className="Page UserDetailPage">
      {showUpdated && (
        <Toast>已更新</Toast>
      )}
      {error && (
        <Toast error>錯誤: {error}</Toast>
      )}
      <div className="block">
        <div className="header">
          <h2 className="title">
            <Link to="/d/user">人事查詢</Link> &gt; {user.fullname || user.name}
          </h2>
        </div>
        <div className="ph20">
          <Form method="put">
            <input name="_method" type="hidden" value="update" />
            <input name="id" type="hidden" value={user.id} />
            <div className="tac">帳號 {user.name}</div>
            <Avator id={user.id} picture={user.avatar} afterChange={() => location.reload()} />
            <UserForm {...{user, titleList, isDisabled: !canEdit}} />
          </Form>
          <h2 className="tac">所屬標案</h2>
          <ul className="project-list p0 m0">
            {projectListItems.map(project =>
              <li key={project.id}>
                <Form method="patch" id={`form${project.id}`}>
                <input type="hidden" name="_method" value="attach" disabled={!canEdit} />
                <input type="hidden" name="userId" defaultValue={user.id} disabled={!canEdit} />
                <input type="hidden" name="projectId" defaultValue={project.id} disabled={!canEdit} />
                <label className={project.isActive ? '': 'color-gray'}>
                  <input type="checkbox" defaultChecked={user.projects.includes(project.id)} onChange={() => document.getElementById(`submit-${project.id}`)?.click()} disabled={!canEdit} />
                  {project.name}
                  <button className="dn" id={`submit-${project.id}`} disabled={!canEdit}>update</button>
                </label>
                </Form>
              </li>
            )}
          </ul>
          <h2 className="tac">登錄記錄最新10筆</h2>
          <table className="wp100" style={{tableLayout: 'fixed'}}>
            <thead>
              <tr>
                <th style={{width: 130, boxSizing: 'border-box'}}>水號</th>
                <th style={{width: 120, boxSizing: 'border-box'}}>錶號</th>
                <th style={{boxSizing: 'border-box'}}>內容</th>
                <th style={{width: 180, boxSizing: 'border-box'}}>時間</th>
              </tr>
            </thead>
            <tbody>
              {user.Record.map(record =>
                <tr key={record.id}>
                  <td className="tac">{record.meter.waterId}</td>
                  <td className="tac">{record.meter.meterId}</td>
                  <td className={`tac ${record.status === Status.success ? 'color-mantis': 'color-zombie'}`}>
                    {record.status === Status.success ? record.content : NotRecordReasonMap[record.content as keyof typeof NotRecordReasonMap]}
                  </td>
                  <td className="tac">{format(new Date(+new Date(record.createdAt)), 'MM-dd HH:mm')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default UserRoute