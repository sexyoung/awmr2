import { format } from "date-fns";
import { useRef, useState } from "react";
import { Meter, Project, Record } from "@prisma/client";
import { LinksFunction, LoaderFunction, MetaFunction } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { Suppy, Type } from "~/consts/meter";
import { NotRecordReasonMap, Status } from "~/consts/reocrd";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";
import Modal from "~/component/Modal";
import { getUser, isAdmin } from "~/api/user";
export { action } from "./action";

import stylesUrl from "~/styles/meter-page.css";

const PAGE_SIZE = 30;
const TITLE = '水錶查詢';

type LoadData = {
  href: string;
  searchString: string;
  projectListItems: Project[];
  meterListItem: (
    Meter & {
      project: Project;
      Record: Record[];
    }
  )[];
  search: string;
} & PaginationProps

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const meta: MetaFunction = () => ({
  title: TITLE,
});

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  const user = await getUser(request);
  if(!user) return;
  const userProjects = user.projects.map(({ project }) => project.id);
  const url = new URL(request.url);
  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  const page = +url.searchParams.get("page")! || 1;
  const search = url.searchParams.get("search") || '';

  const where = search ? {
    OR: [
      {area: { contains: search }},
      {address: { contains: search }},
      {meterId: { contains: search }},
      {waterId: { contains: search }},
      {location: { contains: search }},
      {note: { contains: search }},
    ],
    AND: [
      {projectId: {in: userProjects}}
    ]
  }: {projectId: {in: userProjects}}

  let meterCount = await db.meter.count({ where });
  meterCount = meterCount && (meterCount - 1);

  const pageTotal = ~~(meterCount / PAGE_SIZE) + 1;
  const meterListItem = await db.meter.findMany({
    where,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      project: true,
      Record: {
        take: 1,
        orderBy: {id: 'desc'}
      },
    }
  });
  return {
    search,
    pageTotal,
    meterListItem,
    projectListItems,
    href: url.href,
  };
}

const MeterPage = () => {
  const id = useRef<HTMLInputElement>(null);
  const projectId = useRef<HTMLSelectElement>(null);
  const waterId = useRef<HTMLInputElement>(null);
  const meterId = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLInputElement>(null);
  const address = useRef<HTMLInputElement>(null);
  const type = useRef<HTMLSelectElement>(null);
  const suppy = useRef<HTMLSelectElement>(null);
  const location = useRef<HTMLInputElement>(null);
  const note = useRef<HTMLInputElement>(null);
  const [index, setIndex] = useState(-1);
  const fetcher = useFetcher();
  const { search, href, pageTotal, meterListItem, projectListItems } = useLoaderData<LoadData>();

  const handleShowEdit = (index: number) => {
    id.current && (id.current.value = meterListItem[index].id?.toString() || '');
    projectId.current && (projectId.current.value = meterListItem[index].projectId?.toString());
    waterId.current && (waterId.current.value = meterListItem[index].waterId);
    meterId.current && (meterId.current.value = meterListItem[index].meterId);
    area.current && (area.current.value = meterListItem[index].area as string);
    address.current && (address.current.value = meterListItem[index].address || '');
    type.current && (type.current.value = meterListItem[index].type?.toString() || '');
    suppy.current && (suppy.current.value = meterListItem[index].suppy?.toString() || '');
    location.current && (location.current.value = meterListItem[index].location || '');
    note.current && (note.current.value = meterListItem[index].note || '');
    setIndex(index);
  }

  const handleHideEdit = () => {
    id.current && (id.current.value = "");
    projectId.current && (projectId.current.value = "");
    waterId.current && (waterId.current.value = "");
    meterId.current && (meterId.current.value = "");
    area.current && (area.current.value = "");
    address.current && (address.current.value = "");
    type.current && (type.current.value = "");
    suppy.current && (suppy.current.value = "");
    location.current && (location.current.value = "");
    note.current && (note.current.value = "");
    setIndex(-1);
  }

  const handleToggle = (meterId: number) => {
    const formData = new FormData(document.getElementById(`formToggle${meterId}`) as HTMLFormElement);
    const _method = formData.get('_method') as string;
    const isActive = (document.getElementById(`isActive${meterId}`) as HTMLInputElement).checked;

    fetcher.submit({
      _method,
      isActive: isActive ? '': '1',
      id: meterId.toString(),
    }, {
      method: 'patch',
    });
  }
  
  return (
    <div className="Page MeterPage">
      <div className="block">
        <div className="header">
          <h2 className="title">{TITLE}</h2>
          {pageTotal > 1 && <Pagination {...{pageTotal, href}} />}
        </div>
        <div className="search-form">
          <Form method="get">
            <input type="text" name="search" defaultValue={search} placeholder="搜尋小區、地址、水錶、水號、位置、備註" />
          </Form>
        </div>
        <Modal onClose={handleHideEdit} className={index === -1 ? "dn": ''}>
          <Form method="patch" className="EditForm">
            <div className="title">修改水錶</div>
            <input type="hidden" name="_method" value="update" readOnly />
            <input ref={id} type="hidden" name="id" required />
            <div className="df aic gap10 w300">
              <div>標案</div>
              <select ref={projectId} name="projectId" className="input wp100 bsbb fx1">
                {projectListItems.map(project =>
                  <option key={project.id} value={project.id}>{project.name}</option>
                )}
              </select>
            </div>
            <div className="df aic gap10 w300">
              <div>水號</div>
              <input className="input wp100 bsbb fx1" placeholder="水號" ref={waterId} type="text" name="waterId" required />
            </div>
            <div className="df aic gap10 w300">
              <div>表號</div>
              <input className="input wp100 bsbb fx1" placeholder="表號" ref={meterId} type="text" name="meterId" required />
            </div>
            <div className="df aic gap10 w300">
              <div>小區</div>
              <input className="input wp100 bsbb fx1" placeholder="小區" ref={area} type="text" name="area" />
            </div>
            <div className="df aic gap10 w300">
              <div>地址</div>
              <input className="input wp100 bsbb fx1" placeholder="地址" ref={address} type="text" name="address" />
            </div>
            <div className="df aic gap10 w300">供水
              <select className="input wp100 bsbb fx1" ref={type} name="type">
                <option value={Suppy.NOM}>正常</option>
                <option value={Suppy.END}>中止</option>
                <option value={Suppy.PAU}>停水</option>
              </select>
            </div>
            <div className="df aic gap10 w300">表種
              <select className="input wp100 bsbb fx1" ref={suppy} name="suppy">
                <option value={Type.DRT}>直接錶</option>
                <option value={Type.TTL}>總錶</option>
                <option value={Type.BCH}>分錶</option>
              </select>
            </div>
            <div className="df aic gap10 w300">
              <div>位置</div>
              <input className="input wp100 bsbb fx1" placeholder="位置" ref={location} type="text" name="location" />
            </div>
            <div className="df aic gap10 w300">
              <div>備註</div>
              <input className="input wp100 bsbb fx1" placeholder="備註" ref={note} type="text" name="note" />
            </div>
            <button className="btn primary f1r" onClick={setIndex.bind(null, -1)}>確定更新</button>
          </Form>
        </Modal>
        <table style={{tableLayout: 'fixed'}}>
          <thead>
            <tr>
              <th style={{width: 62, boxSizing: 'border-box'}}>啟用</th>
              {/* <th style={{width: 130, boxSizing: 'border-box'}}>標案</th>
              <th style={{width: 150, boxSizing: 'border-box'}}>小區</th> */}
              <th style={{width: 130, boxSizing: 'border-box'}}>水號</th>
              <th style={{width: 120, boxSizing: 'border-box'}}>錶號</th>
              <th >地址</th>
              <th style={{width: 180, boxSizing: 'border-box'}}> </th>
            </tr>
          </thead>
          <tbody>
            {meterListItem.map((meter, index) =>
              <tr key={meter.id}>
                <td>
                  <fetcher.Form method="patch" id={`formToggle${meter.id}`}>
                    <input type="hidden" name="_method" value="toggle" />
                    <input type="hidden" name="id" defaultValue={meter.id} />
                    <input type="checkbox" name="isActive" id={`isActive${meter.id}`} defaultValue={meter.isActive ? "1": ""} defaultChecked={meter.isActive} onChange={handleToggle.bind(null, meter.id)} />
                    {/* <button>toggle</button> */}
                  </fetcher.Form>
                  {/* {meter.isActive ? 'enable': 'disabled'} */}
                </td>
                {/* <td>{meter.project.name}</td>
                <td>{meter.area}</td> */}
                <td>{meter.waterId}</td>
                <td>{meter.meterId}</td>
                <td style={{whiteSpace: 'normal'}}>{meter.address}</td>
                {/* <td>{Type[meter.type as number]}</td>
                <td>{Suppy[meter.suppy as number]}</td>
                <td>{meter.location}</td> */}
                <td style={{whiteSpace: 'normal'}}>
                  {!!meter.Record.length && <>
                    {meter.Record.length && (
                      <span className={`f13 ${meter.Record[0].status}`}>
                        {format(new Date(+new Date(meter.Record[0].createdAt)), 'MM-dd HH:mm')} » 
                        {meter.Record[0].status === Status.success ?
                          `${meter.Record[0].content}度`:
                          `${NotRecordReasonMap[meter.Record[0].content as keyof typeof NotRecordReasonMap]}`
                        }
                      </span>
                    )}
                  </>}
                  <span className="ml5 cp" onClick={handleShowEdit.bind(null, index)}>⚙</span>
                  {/* <button type="button" onClick={handleShowEdit.bind(null, index)}>編輯</button> */}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MeterPage;