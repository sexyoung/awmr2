import { format } from "date-fns";
import { LoaderFunction } from "@remix-run/node";
import { db } from "~/utils/db.server";

import { Pagination, Props as PaginationProps } from "~/component/Pagination";
import { Meter, Record, User } from "@prisma/client";
import { Form, useLoaderData } from "@remix-run/react";
import { isAdmin } from "~/api/user";

export { action } from "./action";

const PAGE_SIZE = 30;

type ItemType = Record & {
  user: User;
  meter: Meter;
}

type LoadData = {
  href: string;
  pathname: string;
  projectAreaList: {[key: string]: string[]};
  recordListItems: ItemType[];
  search: string;
} & PaginationProps


export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  const url = new URL(request.url);
  const page = +url.searchParams.get("page")! || 1;

  const where = {
    content: 'OutOfArea'
  }

  let recordCount = await db.record.count({ where });
  const pageTotal = ~~((recordCount && (recordCount - 1)) / PAGE_SIZE) + 1;

  const recordListItems = await db.record.findMany({
    orderBy: { createdAt: "desc" },
    where,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      meter: true,
      user: true,
    }
  });

  const projectIdList = (await db.project.findMany({
    orderBy: { createdAt: "desc" },
  })).map(({ id }) => id);

  let projectAreaList: {[key: number]: any[]} = {};
  for (const projectId of projectIdList) {
    const areaList = (await db.meter.findMany({
      select: { area: true },
      where: { projectId },
      distinct: ['area'],
    })).map(({ area }) => area)
    projectAreaList[projectId] = areaList;
  }

  return {
    pageTotal,
    projectAreaList,
    recordListItems,
    href: url.href,
  };
}

const OutPage = () => {
  const { href, pageTotal, projectAreaList, recordListItems } = useLoaderData<LoadData>();
  return (
    <div className="Page OutPage">
      <div className="block">
        <div className="header">
          <h2 className="title">區外要求</h2>
          {pageTotal > 1 && <Pagination {...{pageTotal, href}} />}
        </div>
        <table style={{tableLayout: 'fixed'}}>
        <thead>
            <tr>
              <th style={{width: 190, boxSizing: 'border-box'}}>小區</th>
              <th style={{width: 130, boxSizing: 'border-box'}}>水號</th>
              <th style={{width: 120, boxSizing: 'border-box'}}>錶號</th>
              <th style={{width: 120, boxSizing: 'border-box'}}>時間</th>
              <th> </th>
            </tr>
          </thead>
          <tbody>
            {recordListItems.map(record =>
              <tr key={record.id}>
                <td>{record.meter.area}</td>
                <td>{record.meter.waterId}</td>
                <td>{record.meter.meterId}</td>
                <td>{format(new Date(record.createdAt), 'MM-dd HH:mm')}</td>
                <td className="df gap10 jce">
                  <Form method="post" className="df gap10">
                    <input type="hidden" name="_method" value="changeArea" />
                    <input type="hidden" name="recordId" defaultValue={record.id} />
                    <input type="hidden" name="meterId" defaultValue={record.meter.id} />
                    <select name="area" defaultValue={record.meter.area!} className="input bsbb wp100">
                      {projectAreaList[record.meter.projectId].map(area =>
                        <option key={area} value={area}>{area}</option>
                      )}
                    </select>
                    <button className="btn primary">更新</button>
                  </Form>
                  <Form method="delete" className="dib">
                    <input type="hidden" name="_method" value="deleteOut" />
                    <input type="hidden" name="recordId" defaultValue={record.id} />
                    <button className="btn primary">刪除</button>
                  </Form>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default OutPage