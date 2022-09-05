import { format } from "date-fns";
import { Meter, Record, Role, User } from "@prisma/client";
import { LoaderFunction } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";
import { NotRecordReasonMap, Status } from "~/consts/reocrd";
import { getUser } from "~/api/user";

export { action } from "../meter/action";

const PAGE_SIZE = 30;

type ItemType = Record & {
  user: User;
  meter: Meter;
}

type LoadData = {
  href: string;
  pathname: string;
  searchString: string;
  recordListItems: ItemType[];
  search: string;
} & PaginationProps

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);

  const url = new URL(request.url);
  const page = +url.searchParams.get("page")! || 1;
  const search = url.searchParams.get("search") || '';

  const where = {
    ...(user?.title === Role.ENG ? {userId: user.id}: {}),
    OR: [
      {
        meter: {
          OR: [
            {area: { contains: search }},
            {address: { contains: search }},
            {meterId: { contains: search }},
            {waterId: { contains: search }},
            {location: { contains: search }},
            {note: { contains: search }},
          ],
        },
      },
      {
        user: {
          OR: [
            {name: { contains: search }},
            {fullname: { contains: search }},
          ],
        },
      }
    ]
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

  return {
    search,
    pageTotal,
    recordListItems,
    href: url.href,
  };
}

const isNewMeter = (record: ItemType) => {
  const t = (
    +new Date(record.createdAt) -
    +new Date(record.meter.createdAt));
  return t < 1000 && !record.meter.isActive;
}

const HistoryPage = () => {
  const fetcher = useFetcher();
  const { search, href, pageTotal, recordListItems } = useLoaderData<LoadData>();
  return (
    <div className="Page HistoryPage">
      <div className="block">
        <div className="header">
          <h2 className="title">登錄記錄頁</h2>
          {pageTotal > 1 && <Pagination {...{pageTotal, href}} />}
        </div>
        <div className="search-form">
          <Form method="get">
            <input type="text" name="search" defaultValue={search} placeholder="搜尋師父、小區、地址、水錶、水號、位置、備註" />
          </Form>
        </div>
        <table style={{tableLayout: 'fixed'}}>
          <thead>
            <tr>
              <th style={{width: 130, boxSizing: 'border-box'}}>水號</th>
              <th style={{width: 120, boxSizing: 'border-box'}}>錶號</th>
              <th style={{width: 90, boxSizing: 'border-box'}}>師父</th>
              <th style={{boxSizing: 'border-box'}}>內容</th>
              <th style={{width: 180, boxSizing: 'border-box'}}>時間</th>
              <th>新?</th>
            </tr>
          </thead>
          <tbody>
            {recordListItems.map(record =>
              <tr key={record.id}>
                <td>{record.meter.waterId}</td>
                <td>{record.meter.meterId}</td>
                <td>{record.user.fullname}</td>
                <td className={record.status === Status.success ? 'color-mantis': 'color-zombie'}>
                  {record.status === Status.success ? record.content : NotRecordReasonMap[record.content as keyof typeof NotRecordReasonMap]}
                </td>
                <td>{format(new Date(+new Date(record.createdAt)), 'MM-dd HH:mm')}</td>
                <td>
                  {isNewMeter(record) && (
                    <fetcher.Form method="patch">
                      <input type="hidden" name="_method" value="toggle" />
                      <input type="hidden" name="id" defaultValue={record.meter.id} />
                      <input type="hidden" name="isActive" value="" readOnly />
                      <button className="btn primary">啟用</button>
                    </fetcher.Form>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default HistoryPage