import { json, LoaderFunction } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useFetcher } from "@remix-run/react";

import type { ActionDataGen } from "~/type/action.data";
import type { NewProjectForm, Project } from "~/type/project";
import { RecordCount, sum } from "~/api/record";
import { isAdmin } from "~/api/user";
import { query as projectQuery, ProjectData } from "~/api/project";
export { action } from "./action";

type ActionData = ActionDataGen<NewProjectForm>

type LoaderData = {
  projectListItems: Array<Project & {
    areaCount: number;
    total: number;
  } & RecordCount>;
};

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  return json(await projectQuery());
};

export default () => {
  const fetcher = useFetcher();
  const actionData = useActionData<ActionData>();
  const projectListItems = useLoaderData<ProjectData>();

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
          小區數: {project.areaCount}/
          錶數: {project.total}/
          成功數: {project.success}/
          未登數: {project.notRecord}/
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
