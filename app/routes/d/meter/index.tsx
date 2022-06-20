import { useRef, useState } from "react";
import { Meter, Project } from "@prisma/client";
import { LoaderFunction } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { Suppy, Type } from "~/consts/meter";
export { action } from "./action";

type LoadData = {
  projectListItems: Project,
  meterListItem: (
    Meter & {
      project: Project
    }
  )[]
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  const search = url.searchParams.get("search") || '';
  const meterListItem = await db.meter.findMany({
    where: {
      OR: [
        {address: { contains: search }},
        {meterId: { contains: search }},
        {waterId: { contains: search }},
      ]
    },
    include: {
      project: true,
    }
  });
  return {
    projectListItems,
    meterListItem,
  };
}

const MeterPage = () => {
  const id = useRef<HTMLInputElement>(null);
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
  const { meterListItem } = useLoaderData<LoadData>();
  console.log(meterListItem);

  const handleShowEdit = (index: number) => {
    id.current && (id.current.value = meterListItem[index].id?.toString() || '');
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
  
  return (
    <div>
      <h2>水錶查詢頁</h2>
      <Form method="get">
        <input type="text" name="search" />
        <button>submit</button>
      </Form>
      <Form method="patch">
        <div><input type="text" name="_method" value="update" readOnly /></div>
        <div><input ref={id} type="text" name="id" required /></div>
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
          <span onClick={handleShowEdit.bind(null, index)}>編輯</span>
        </div>
      )}
    </div>
  )
}

export default MeterPage;