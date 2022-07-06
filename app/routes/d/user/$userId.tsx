import { useRef } from "react";
import type { Record, User, Project, Meter } from "@prisma/client";
import { LoaderFunction } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { Role } from "~/consts/role";
import { db } from "~/utils/db.server";
import { Avator } from "./avatar";
export { action } from "./action";

type LoaderData = { user: User & {
  Record: (Record & { meter: Meter })[];
  projects: number[];
}, projectListItems: Project[] };

export const loader: LoaderFunction = async ({ params: { userId = 0 } }) => {
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
  return {
    user: {
      ...user,
      projects: user.projects.map(({ project }) => project.id)
    },
    projectListItems,
  };
};

const UserRoute = () => {
  const fetcher = useFetcher();
  const { user, projectListItems } = useLoaderData<LoaderData>();

  const handleChange = (projectId: number) => {
    const formData = new FormData(document.getElementById(`form${projectId}`) as HTMLFormElement);
    const _method = formData.get('_method') as string;
    const userId = formData.get('userId')! as string;
    // const projectId = formData.get('projectId')! as string;
    
    fetcher.submit({
      _method,
      userId,
      projectId: projectId.toString(),
    }, {
      method: 'patch',
    });
  }
  
  return (
    <div>
      <h2>使用者內頁</h2>
      <Form method="put">
        <input name="_method" type="hidden" value="update" />
        <input name="id" type="hidden" value={user.id} />
        <div>
          avatar: {user.avatar}
          <Avator id={user.id} picture={user.avatar} afterChange={() => location.reload()} />
          {/* <input type="file" /> */}
        </div>
        <div>id: {user.id}</div>
        <div>帳號: {user.name}</div>
        <div>密碼: <input type="password" name="password" /></div>
        <div>本名: <input type="text" name="fullname" defaultValue={user.fullname || ""} /></div>
        <div>權限:
          <select name="title" defaultValue={user.title}>
            <option value={Role.ENG}>工程師</option>
            <option value={Role.ENM}>工程師主管</option>
            <option value={Role.OFW}>文書</option>
            <option value={Role.ADM}>管理員</option>
          </select>
        </div>
        <div>信箱: <input type="text" name="email" defaultValue={user.email || ""} /></div>
        <div>電話: <input type="text" name="phone" defaultValue={user.phone || ""} /></div>
        <div>備註: <input type="text" name="note" defaultValue={user.note || ""} /></div>
        <div>line登入:
          <input type="checkbox" name="isDailyLink" defaultChecked={user.isDailyLink} value="1" />
        </div>
        <button>update</button>
      </Form>
      <h2>所屬標案</h2>
      <ul>
        {projectListItems.map(project =>
          <li key={project.id}>
            <form method="patch" id={`form${project.id}`}>
            <input type="hidden" name="_method" value="attach" />
            <input type="hidden" name="userId" defaultValue={user.id} />
            <input type="hidden" name="projectId" defaultValue={project.id} />
              <label>
                <input type="checkbox" defaultChecked={user.projects.includes(project.id)} onChange={handleChange.bind(null, project.id)} />
                {project.name}
              </label>
            </form>
          </li>
        )}
      </ul>
      <h2>登錄記錄</h2>
      <ul>
        {user.Record.map(record =>
          <li key={record.id}>
            水號: {record.meter.waterId} /
            錶號 {record.meter.meterId} /
            登錄內容: {record.status} / {record.content} /
            登錄時間: {new Date(record.createdAt).toLocaleString()}
          </li>
        )}
      </ul>
    </div>
  )
}

export default UserRoute