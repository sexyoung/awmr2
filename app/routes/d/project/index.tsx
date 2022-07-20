import { json, LoaderFunction } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useFetcher } from "@remix-run/react";

import type { ActionDataGen } from "~/type/action.data";
import type { NewProjectForm, Project } from "~/type/project";
import { RecordCount } from "~/api/record";
import { isAdmin } from "~/api/user";
import { query as projectQuery, ProjectData } from "~/api/project";
import RecordBar from "~/component/RecordBar";
import Modal from "~/component/Modal";
import { useState } from "react";
export { action } from "./action";

type ActionData = ActionDataGen<NewProjectForm>

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  return json(await projectQuery());
};

export default () => {
  const [showModal, setShowModal] = useState(true);
  const fetcher = useFetcher();
  const actionData = useActionData<ActionData>();
  const projectListItems = useLoaderData<ProjectData>();

  return (
    <div className="Page ProjectPage">
      <div className="block">
        <div className="header">
          <h2 className="title">標案管理頁</h2>
        </div>
        {showModal &&
          <Modal onClose={setShowModal.bind(null, false)}>
            <Form method="post">
              <div>新增標案</div>
              <input type="hidden" name="_method" value="create" />
              <input type="text" name="name" placeholder="標案名稱" required />
              <input type="text" name="code" placeholder="標案代號" />
              <label>isActive<input type="checkbox" name="isActive" value="1" /></label>
              <button>submit</button>
            </Form>
          </Modal>
        }
        <div id="form-error-message">
          {actionData?.formError && <p>{actionData.formError}</p>}
        </div>
        <table>
          <thead>
            <tr>
              <th style={{width: 34}}>啟用</th>
              <th>標案名稱</th>
              <th>標案代號</th>
              <th>小區</th>
              <th style={{width: 150, boxSizing: 'border-box'}}>進度</th>
              <th>錶數</th>
              <th>未用</th>
              <th style={{width: 170}} />
            </tr>
          </thead>
          <tbody>
            {projectListItems.map((project, index) =>
              <tr key={project.id}>
                <td>
                  <fetcher.Form method="patch">
                    <input type="hidden" name="_method" value="toggle" />
                    <input type="hidden" name="id" defaultValue={project.id} />
                    <input type="checkbox" name="isActive" defaultValue={project.isActive ? "1": ""} />
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
                <td>未啟用</td>
                <td style={{display: 'flex', justifyContent: 'space-around'}}>
                  <Link to={`/d/project/export/${project.id}`}>匯出</Link>
                  <Link to={`/d/meter/upload/${project.id}`}>上傳水錶</Link>
                  <fetcher.Form method="delete" style={{display: 'inline'}} onSubmit={(e) => !confirm("確定要刪除標案?\n旗下水錶與登記都會遺失!\n確定嗎?") && e.preventDefault()}>
                    <input type="hidden" name="_method" value="remove" />
                    <input type="hidden" name="id" defaultValue={project.id} />
                    <button>刪除</button>
                    {/* 要先confirm */}
                  </fetcher.Form>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
