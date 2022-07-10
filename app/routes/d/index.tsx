import { Project, Record, User } from "@prisma/client";
import { json, LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { RecordCount, sum } from "~/api/record";
import { isAdmin } from "~/api/user";
import { db } from "~/utils/db.server";

const TAKE = 5;

type LoaderData = {
  projectListItems: Array<Project & {
    total: number;
  } & RecordCount>;

  areaListItems: ({
    projectName: string;
    area: string;
    total: number;
  } & RecordCount)[];

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

  const projectListItems = await db.project.findMany({
    take: TAKE,
    orderBy: { createdAt: "desc" },
  });

  data.projectListItems = await Promise.all(projectListItems.map(async project => {
    // 取得 meter id
    const meterListItems = await db.meter.findMany({
      select: { id: true },
      where: { projectId: project.id },
    });
    const meterIdList = meterListItems.map(({ id }) => id);
    return {
      ...project,
      total: meterIdList.length,
      ...await sum(meterIdList),
    }
  }));

  const areaListItems = (await db.meter.groupBy({
    by: ['area'],
    _count: {
      area: true,
    },
  })).slice(0, TAKE);

  for (let i = 0; i < areaListItems.length; i++) {
    const area = areaListItems[i];
    const m = await db.meter.findFirst({
      where: { area: area.area },
      orderBy: { createdAt: 'desc' }
    });
    if(!m) return;
    const p = await db.project.findUnique({ where: { id: m.projectId} });
    if(!p) return;

    const meterIdList = (await db.meter.findMany({
      where: { area: area.area },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    })).map(m => m.id);
    
    data.areaListItems.push({
      projectName: p.name,
      area: m.area || "",
      total: area._count.area,
      ...await sum(meterIdList),
    });

    data.userListItems = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: TAKE,
      include: {
        Record: true,
      }
    })
  }

  return json(data);
};

const HomePage = () => {
  const { projectListItems, areaListItems, userListItems } = useLoaderData<LoaderData>();
  console.log(projectListItems, areaListItems, userListItems);
  
  return (
    <div>
      <h2>登入後首頁</h2>
      <h3><Link to="/d/area">小區查詢</Link></h3>
      {areaListItems.map(area =>
        <div key={area.area}>
          專案: {area.projectName} /
          小區: {area.area} /
          登記: {area.success} /
          未登: {area.notRecord} /
          錶數: {area.total}
        </div>
      )}

      <h3><Link to="/d/project">標案管理</Link></h3>
      {projectListItems.map(project =>
        <div key={project.id}>
          {project.id}/
          {project.name}/
          {project.code}/
          {project.isActive ? 'enable': 'disabled'}/
          錶數: {project.total}/
          成功數: {project.success}/
          未登數: {project.notRecord}/
          <Link to={`/d/project/export/${project.id}`}>匯出</Link>
          <Link to={`/d/meter/upload/${project.id}`}>上傳水錶</Link>
        </div>
      )}

      <h3><Link to="/d/user">人事查詢</Link></h3>
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
  )
}

export default HomePage