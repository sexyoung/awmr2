import { json, LoaderFunction } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useFetcher } from "@remix-run/react";

import { db } from "~/utils/db.server";
import type { ActionDataGen } from "~/type/action.data";
import type { NewProjectForm, Project } from "~/type/project";
export { action } from "./action";

type ActionData = ActionDataGen<NewProjectForm>

type LoaderData = {
  projectListItems: Array<Project & {
    success: number;
    notRecord: number;
    meterCount: number;
  }>;
};

export const loader: LoaderFunction = async () => {
  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });

  return json({
    projectListItems: await Promise.all(projectListItems.map(async project => {
      // 取得 meter id
      const meterListItems = await db.meter.findMany({
        select: { id: true },
        where: { projectId: project.id },
      });

      const meterIdList = meterListItems.map(({ id }) => id);
      const recordCount = await db.record.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { meterId: { in: meterIdList }}
      });
  
      return {
        ...project,
        meterCount: meterIdList.length,
        ...recordCount.reduce((obj, status) => {
          return {
            ...obj,
            [status.status]: status._count.status
          }
        }, {})
      }
    }))
  });
};

export default () => {
  const fetcher = useFetcher();
  const actionData = useActionData<ActionData>();
  const { projectListItems } = useLoaderData<LoaderData>();
  
  return (
    <div>
      <h2>標案管理頁</h2>
      <Form method="post">
        <input type="hidden" name="_method" value="create" />
        <input type="text" name="name" placeholder="name" required />
        <input type="text" name="code" placeholder="code" />
        <label>isActive<input type="checkbox" name="isActive" value="1" /></label>
        <button>submit</button>
      </Form>
      <hr />
      <div id="form-error-message">
        {actionData?.formError && <p>{actionData.formError}</p>}
      </div>
      {projectListItems.map(project =>
        <div key={project.id}>
          {project.id}/
          {project.name}/
          {project.code}/
          {project.isActive ? 'enable': 'disabled'}/
          錶數: {project.meterCount}/
          成功數: {project.success ?? 0}/
          未登數: {project.notRecord ?? 0}/
          <Link to={`/d/project/export/${project.id}`}>匯出</Link>
          <Link to={`/d/meter/upload/${project.id}`}>上傳水錶</Link>
          <fetcher.Form method="delete">
            <input type="hidden" name="_method" value="remove" />
            <input type="hidden" name="id" defaultValue={project.id} />
            <button>刪除</button>
            {/* 要先confirm */}
          </fetcher.Form>
          <fetcher.Form method="patch">
            <input type="hidden" name="_method" value="toggle" />
            <input type="hidden" name="id" defaultValue={project.id} />
            <input type="hidden" name="isActive" defaultValue={project.isActive ? "1": ""} />
            <button>toggle</button>
          </fetcher.Form>
        </div>
      )}
    </div>
  )
}
