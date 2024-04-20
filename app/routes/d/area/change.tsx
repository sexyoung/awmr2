import { FormEvent, useState } from "react";
import { Project, Role, ToChangeArea, User } from "@prisma/client";
import { LoaderFunction, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useFetcher } from "@remix-run/react";

import Modal from "~/component/Modal";
import { getUser, isAdmin } from "~/api/user";
import { db } from "~/utils/db.server";
import { format } from "date-fns";
export { action } from "./action";

type LoaderData = {
  user: User;
  projectListItems: Project[];
  changeAreaListItems: (ToChangeArea & {
    project: Project;
    user: User;
  })[];
};


export const loader: LoaderFunction = async ({params: { projectId = 0 }, request }) => {
  await isAdmin(request);
  const user = await getUser(request);
  if(!user) return;
  const projectListItems = user.projects.map(({ project }) => ({id: project.id, name: project.name}));
  const where = user.title === Role.ADM ? {}: {
    userId: user.id
  }
  const changeAreaListItems = await db.toChangeArea.findMany({
    where,
    include: {
      user: true,
      project: true,
    }
  })
  return {
    user,
    projectListItems,
    changeAreaListItems,
  };
}


export default function AreaChange() {
  const fetcher = useFetcher();
  const [showModal, setShowModal] = useState(false);
  const { user, projectListItems, changeAreaListItems } = useLoaderData<LoaderData>();

  const handleChange = async (id: number, e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if(!confirm("確定要執行修改嗎？")) return;
    const formData = new FormData();
    formData.append('_method', 'change');
    formData.append('id', id.toString());
    (await fetch(`${location.href}?_data=routes%2Fd%2Farea%2Fchange`, {
      method: 'post',
      body: formData
    }));

    location.href = '/d/area/change';
  }

  const handleDelete = async (id: number, e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if(!confirm("確定要刪除此修改單？")) return;
    const formData = new FormData();
    formData.append('_method', 'delete');
    formData.append('id', id.toString());
    (await fetch(`${location.href}?_data=routes%2Fd%2Farea%2Fchange`, {
      method: 'post',
      body: formData
    }));

    location.href = '/d/area/change';
  }

  return (
    <div className="Page OutPage">
      <div className="block">
        <div className="header">
          <h2 className="title">修改小區</h2>
          <div><button className="btn primary f1r" onClick={setShowModal.bind(null, true)}>+ 新增修改</button></div>
        </div>
        {showModal &&
          <Modal onClose={setShowModal.bind(null, false)}>
            <Form method="post" className="NewForm tac df gap10" style={{flexDirection: 'column'}} onSubmit={setShowModal.bind(null, false)}>
              <div className="title">新增修改</div>
              <input type="hidden" name="_method" value="create" />
              <div>
                <select name="projectId" className="input wp100">
                  {projectListItems.map(project =>
                    <option key={project.id} value={project.id}>標案: {project.name}</option>
                  )}
                </select>
              </div>
              <div><input className="input" type="text" name="fromArea" placeholder="原小區名" required /></div>
              <div><input className="input" type="text" name="toArea" placeholder="改小區名" required /></div>
              <div><button className="btn primary f1r wp100">新增</button></div>
              {/* <div id="form-error-message">
                {actionData?.formError && <p>{actionData.formError}</p>}
              </div> */}
            </Form>
          </Modal>
        }
        <table style={{tableLayout: 'fixed'}}>
          <thead>
            <tr>
              <th>標案</th>
              <th>原小區名</th>
              <th>改小區名</th>
              <th>提出者</th>
              <th>提出時間</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {changeAreaListItems.map((changeArea) =>
              <tr key={changeArea.id}>
                <td>{changeArea.project.name}</td>
                <td>{changeArea.fromArea}</td>
                <td>{changeArea.toArea}</td>
                <td>{changeArea.user.fullname ||changeArea.user.name}</td>
                <td>{format(new Date(changeArea.createdAt), 'MM-dd HH:mm')}</td>
                <td>
                  <fetcher.Form onSubmit={handleChange.bind(null, changeArea.id)} method="post" style={{display: 'inline'}}>
                    <input type="hidden" name="_method" value="change" />
                    <button className="btn primary" style={{marginRight: 6}} disabled={user.title !== Role.ADM}>修改</button>
                  </fetcher.Form>
                  <fetcher.Form onSubmit={handleDelete.bind(null, changeArea.id)} method="post" style={{display: 'inline'}}>
                    <input type="hidden" name="_method" value="delete" />
                    <button className="btn error" disabled={user.title !== Role.ADM}>刪除</button>
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
