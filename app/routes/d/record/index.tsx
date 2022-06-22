import { useRef, useState } from "react";
import { Meter, Project } from "@prisma/client";
import { LoaderFunction } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { Suppy, Type } from "~/consts/meter";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";
import { NotRecordReason, Status } from "~/consts/reocrd";
export { action } from "./action";

const PAGE_SIZE = 30;

type LoadData = {
  href: string;
  pathname: string;
  searchString: string;
  projectListItems: Project[];
  meterListItem: (
    Meter & {
      project: Project
    }
  )[];
  search: string;
} & PaginationProps

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  const page = +url.searchParams.get("page")! || 1;
  const search = url.searchParams.get("search") || '';

  const where = {
    OR: [
      {address: { contains: search }},
      {meterId: { contains: search }},
      {waterId: { contains: search }},
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

const RecordPage = () => {
  const fetcher = useFetcher();
  const { search, href, pageTotal, meterListItem, projectListItems } = useLoaderData<LoadData>();

  return (
    <div>
      <h2>水錶查詢頁</h2>
      <Pagination {...{pageTotal, href}} />
      todo: 顯示最後登記資訊: 時間、記了什麼
      <Form method="get">
        <input type="text" name="search" defaultValue={search} />
        <button>submit</button>
      </Form>
      {meterListItem.map((meter, index) =>
        <div key={meter.id}>
          水號: {meter.waterId} / 
          錶號: {meter.meterId} / 
          地址: {meter.address} /
          錶位: {meter.location} /
          備註: {meter.note}
          <fetcher.Form method="post">
            <input type="hidden" name="_method" value={Status.success} />
            <input type="hidden" name="meterId" defaultValue={meter.id} />
            <input type="text" name="content" placeholder="度數" />
            <button>submit</button>
          </fetcher.Form>
          <fetcher.Form method="post">
            <input type="hidden" name="_method" value={Status.notRecord} />
            <input type="hidden" name="meterId" defaultValue={meter.id} />
            <select name="content">
              <option key={NotRecordReason.Abort} value={NotRecordReason.Abort}>中止</option>
              <option key={NotRecordReason.Stop} value={NotRecordReason.Stop}>停水</option>
              <option key={NotRecordReason.NoOne} value={NotRecordReason.NoOne}>無人</option>
              <option key={NotRecordReason.Empty} value={NotRecordReason.Empty}>空屋</option>
              <option key={NotRecordReason.Car} value={NotRecordReason.Car}>車擋</option>
              <option key={NotRecordReason.Heavy} value={NotRecordReason.Heavy}>重壓</option>
              <option key={NotRecordReason.NoExist} value={NotRecordReason.NoExist}>查無</option>
              <option key={NotRecordReason.EvilDog} value={NotRecordReason.EvilDog}>惡犬</option>
              <option key={NotRecordReason.OutOfArea} value={NotRecordReason.OutOfArea}>區域外</option>
              <option key={NotRecordReason.NoEntrance} value={NotRecordReason.NoEntrance}>無法進入</option>
              <option key={NotRecordReason.Other} value={NotRecordReason.Other}>其他</option>
            </select>
            <button>submit</button>
          </fetcher.Form>
        </div>
      )}
    </div>
  )
}

export default RecordPage;