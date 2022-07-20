import { useRef, useState } from "react";
import { Meter, Project, Record } from "@prisma/client";
import { LoaderFunction } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { Suppy, Type } from "~/consts/meter";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";
import { isAdmin } from "~/api/user";
export { action } from "./action";

const PAGE_SIZE = 30;

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

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  const url = new URL(request.url);
  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  const page = +url.searchParams.get("page")! || 1;
  const search = url.searchParams.get("search") || '';

  const where = {
    OR: [
      {area: { contains: search }},
      {address: { contains: search }},
      {meterId: { contains: search }},
      {waterId: { contains: search }},
      {location: { contains: search }},
      {note: { contains: search }},
    ]
  }

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

  // console.log(meterListItem);
  

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
  }
  
  return (
    <div className="Page MeterPage">
      <div className="block">
        <div className="header">
          <h2 className="title">水錶查詢頁</h2>
          <Pagination {...{pageTotal, href}} />
        </div>
        <Form method="get">
          <input type="text" name="search" defaultValue={search} />
          <button>submit</button>
        </Form>
        <Form method="patch">
          <div><input type="text" name="_method" value="update" readOnly /></div>
          <div><input ref={id} type="text" name="id" required /></div>
          <div>
            <select ref={projectId} name="projectId">
              {projectListItems.map(project =>
                <option key={project.id} value={project.id}>{project.name}</option>
              )}
            </select>
          </div>
          <div><input ref={waterId} type="text" name="waterId" required /></div>
          <div><input ref={meterId} type="text" name="meterId" required /></div>
          <div><input ref={area} type="text" name="area" /></div>
          <div><input ref={address} type="text" name="address" /></div>
          <div>
            <select ref={type} name="type" required>
              <option value={Suppy.NOM}>正常</option>
              <option value={Suppy.END}>中止</option>
              <option value={Suppy.PAU}>停水</option>
            </select>
          </div>
          <div>
            <select ref={suppy} name="suppy" required>
              <option value={Type.DRT}>直接錶</option>
              <option value={Type.TTL}>總錶</option>
              <option value={Type.BCH}>分錶</option>
            </select>
          </div>
          <div><input ref={location} type="text" name="location" /></div>
          <div><input ref={note} type="text" name="note" /></div>
          <span onClick={handleHideEdit}>close</span>
          <button>update</button>
        </Form>
        {meterListItem.map((meter, index) =>
          <div key={meter.id}>
            <fetcher.Form method="patch">
              <input type="hidden" name="_method" value="toggle" />
              <input type="hidden" name="id" defaultValue={meter.id} />
              <input type="hidden" name="isActive" defaultValue={meter.isActive ? "1": ""} />
              <button>toggle</button>
            </fetcher.Form>
            {meter.isActive ? 'enable': 'disabled'}/
            標案: {meter.project.name} /
            小區: {meter.area} /
            水號: {meter.waterId} / 
            錶號: {meter.meterId} / 
            地址: {meter.address} /
            種類: {Type[meter.type as number]} /
            供水: {Suppy[meter.suppy as number]} /
            地址: {meter.location} /
            {!!meter.Record.length && <>
              記錄: {meter.Record.length && (
                <span>
                  {new Date(+new Date(meter.Record[0].createdAt)).toLocaleString()}/
                  {meter.Record[0].status}/
                  {meter.Record[0].content}
                </span>
              )}
            </>}
            <button type="button" onClick={handleShowEdit.bind(null, index)}>編輯</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MeterPage;