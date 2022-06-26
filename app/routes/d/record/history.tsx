import { Meter, Record, User } from "@prisma/client";
import { LoaderFunction } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";

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
  const url = new URL(request.url);
  const page = +url.searchParams.get("page")! || 1;
  const search = url.searchParams.get("search") || '';

  const where = {
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
  console.log(
    record.meter.createdAt,
    record.createdAt,
  );
  
  const t = (
    +new Date(record.createdAt) -
    +new Date(record.meter.createdAt));
  return t < 1000 && !record.meter.isActive;
}

const HistoryPage = () => {
  const fetcher = useFetcher();
  const { search, href, pageTotal, recordListItems } = useLoaderData<LoadData>();
  return (
    <div>
      <h2>登錄記錄頁</h2>
      <Pagination {...{pageTotal, href}} />

      <Form method="get">
        <input type="text" name="search" defaultValue={search} />
        <button>submit</button>
      </Form>

      {recordListItems.map(record =>
        <div key={record.id}>
          {record.id}
          水號: {record.meter.waterId} /
          錶號: {record.meter.meterId} /
          地址: {record.meter.address} /
          登錄人: {record.user.fullname} /
          新水錶?: {isNewMeter(record) && (
            <fetcher.Form method="patch">
              <input type="hidden" name="_method" value="toggle" />
              <input type="hidden" name="id" defaultValue={record.meter.id} />
              <input type="hidden" name="isActive" value="" readOnly />
              <button>啟用</button>
            </fetcher.Form>
          )} /
          時間: {new Date(record.createdAt).toLocaleString()}
        </div>
      )}
    </div>
  )
}

export default HistoryPage