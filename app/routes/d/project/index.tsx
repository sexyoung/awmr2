import { json, LinksFunction, LoaderFunction } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useFetcher } from "@remix-run/react";

import type { ActionDataGen } from "~/type/action.data";
import type { NewProjectForm } from "~/type/project";
import { isAdmin } from "~/api/user";
import { query as projectQuery, ProjectData } from "~/api/project";
import RecordBar from "~/component/RecordBar";
import Modal from "~/component/Modal";
import { useState } from "react";
export { action } from "./action";

import stylesUrl from "~/styles/project-page.css";

type ActionData = ActionDataGen<NewProjectForm>

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  return json(await projectQuery());
};

export default () => {
  const [showModal, setShowModal] = useState(false);
  const fetcher = useFetcher();
  const actionData = useActionData<ActionData>();
  const projectListItems = useLoaderData<ProjectData>();

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
    <div className="Page ProjectPage">
      <div className="block">
        <div className="header">
          <h2 className="title">標案管理頁</h2>
          <div><button className="btn primary f1r" onClick={setShowModal.bind(null, true)}>+ 新增標案</button></div>
        </div>
        {showModal &&
          <Modal onClose={setShowModal.bind(null, false)}>
            <Form method="post" className="NewForm">
              <div className="title">新增標案</div>
              <input type="hidden" name="_method" value="create" />
              <input className="input" type="text" name="name" placeholder="標案名稱" required />
              <input className="input" type="text" name="code" placeholder="標案代號" />
              <label>啟用<input type="checkbox" name="isActive" value="1" /></label>
              <button className="btn primary f1r">新增</button>
              <div id="form-error-message">
                {actionData?.formError && <p>{actionData.formError}</p>}
              </div>
            </Form>
          </Modal>
        }
        <table>
          <thead>
            <tr>
              <th style={{whiteSpace: 'nowrap'}}>啟用</th>
              <th style={{whiteSpace: 'nowrap', boxSizing: 'border-box', width: 150}}>名稱</th>
              <th style={{whiteSpace: 'nowrap'}}>代號</th>
              <th>小區</th>
              <th style={{width: 140, boxSizing: 'border-box'}}>進度</th>
              <th>錶數</th>
              <th>未用</th>
              <th style={{whiteSpace: 'nowrap', boxSizing: 'border-box', width: 160}} />
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
                <td>{project.notActiveCount}</td>
                <td className="df jcsa aic">
                  <Link to={`/d/project/export/${project.id}`}>匯出</Link>
                  <Link to={`/d/meter/upload/${project.id}`}>上傳</Link>
                  <fetcher.Form method="delete" style={{display: 'inline'}} onSubmit={(e) => !confirm("確定要刪除標案?\n旗下水錶與登記都會遺失!\n確定嗎?") && e.preventDefault()}>
                    <input type="hidden" name="_method" value="remove" />
                    <input type="hidden" name="id" defaultValue={project.id} />
                    <button className="btn primary">刪除</button>
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
