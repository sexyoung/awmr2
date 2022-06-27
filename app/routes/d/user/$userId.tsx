import type { Record, User, Project, Meter } from "@prisma/client";
import { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Role } from "~/consts/role";
import { db } from "~/utils/db.server";

type LoaderData = { user: User & {
  Record: (Record & { meter: Meter })[];
  projects: Project[];
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
  const { user, projectListItems } = useLoaderData<LoaderData>();
  console.log(user);
  
  return (
    <div>
      <h2>使用者內頁</h2>
      <div>id: {user.avatar}</div>
      <div>id: {user.id}</div>
      <div>帳號: {user.name}</div>
      <div>本名: {user.fullname}</div>
      <div>權限:
        <select name="title" defaultValue={user.title}>
          <option value={Role.ENG}>工程師</option>
          <option value={Role.ENM}>工程師主管</option>
          <option value={Role.OFW}>文書</option>
          <option value={Role.ADM}>管理員</option>
        </select>
      </div>
      <div>信箱: {user.email}</div>
      <div>電話: {user.phone}</div>
      <div>備註: {user.note}</div>
      <div>line登入:
        <input type="checkbox" name="isDailyLink" defaultChecked={user.isDailyLink} value="1" />
      </div>
      <h2>所屬標案</h2>
      <ul>
        {projectListItems.map(project =>
          <li key={project.id}>
            <label>
              <input type="checkbox" defaultChecked={user.projects.includes(project.id)} />
              {project.name}
            </label>
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