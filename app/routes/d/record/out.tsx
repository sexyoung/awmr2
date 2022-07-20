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

  const projectIdList = recordListItems.map(item => item.meter.projectId);
  const projectAreaList = await Promise.resolve([...new Set(projectIdList)].reduce(async (obj, projectId) => {
    return {
      ...obj,
      [projectId]: (await db.meter.findMany({
        select: { area: true },
        where: { projectId },
        distinct: ['area'],
      })).map(({ area }) => area)
    }
  }, {}));

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
          <Pagination {...{pageTotal, href}} />
        </div>
        {recordListItems.map(record =>
          <div key={record.id}>
            {record.id}
            小區: {record.meter.area} /
            水號: {record.meter.waterId} /
            錶號: {record.meter.meterId} /
            登錄人: {record.user.fullname} /
            時間: {new Date(record.createdAt).toLocaleString()} /
            <Form method="post">
              <input type="hidden" name="_method" value="changeArea" />
              <input type="hidden" name="meterId" defaultValue={record.meter.id} />
              <select name="area" defaultValue={record.meter.area!}>
                {projectAreaList[record.meter.projectId].map(area =>
                  <option key={area} value={area}>{area}</option>
                )}
              </select>
              <button>update</button>
            </Form>
            <Form method="delete">
              <input type="hidden" name="_method" value="deleteOut" />
              <input type="hidden" name="recordId" defaultValue={record.id} />
              <button>delete</button>
            </Form>
            <hr />
          </div>
        )}
      </div>
    </div>
  )
}

export default OutPage