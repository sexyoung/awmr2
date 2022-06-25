import { useState } from "react";
import { LoaderFunction } from "@remix-run/node";
import { Meter, Project, Record, User } from "@prisma/client";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { Suppy, Type } from "~/consts/meter";
import { NotRecordReason, Status } from "~/consts/reocrd";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";
export { action } from "./action";

const PAGE_SIZE = 30;

type LoadData = {
  href: string;
  pathname: string;
  searchString: string;
  projectListItems: Project[];
  meterListItem: (
    Meter & {
      project: Project;
      Record: (Record & {
        user: User;
      })[];
    }
  )[];
  search: string;
} & PaginationProps

const formatYmd = (date: Date): string => {
  date = new Date(+date - 1000 * 60 * 60 * 8);
  return date.toLocaleDateString().slice(0, 10);
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  const page = +url.searchParams.get("page")! || 1;
  const search = url.searchParams.get("search") || '';
  const showRecord = Boolean(url.searchParams.get("showRecord")! || 0);

  // 預設排除今日登記
  const where = {
    ...(showRecord ? {}: {
      Record: {
        every: {
          createdAt: {
            lt: new Date(formatYmd(new Date())),
          }
        }
      }
    }),
    AND: [
      {isActive: true},
    ],
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
        orderBy: {id: 'desc'},
        include: {
          user: true,
        }
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

const RecordPage = () => {
  const fetcher = useFetcher();
  const [status, setStatus] = useState<Status>(Status.success);
  const { search, href, pageTotal, meterListItem, projectListItems } = useLoaderData<LoadData>();
  // console.log(meterListItem);
  // console.log('fetcher.data', fetcher.data);
  
  return (
    <div>
      <h2>水錶查詢頁</h2>
      <Pagination {...{pageTotal, href}} />
      todo:
      <ul>
        <li>統計今日登記比例（同一水錶超過1次就算1次）</li>
      </ul>

      <Form method="get">
        <input type="text" name="search" defaultValue={search} />
        <button>submit</button>
      </Form>
      {meterListItem.length ?
        meterListItem.map((meter, index) =>
        <div key={meter.id}>
          水號: {meter.waterId} / 
          錶號: {meter.meterId} / 
          地址: {meter.address} /
          錶位: {meter.location} /
          備註: {meter.note} /
          {meter.Record.map(record =>
            <div key={record.id}>
              {record.user.name}/
              {record.status}/
              {record.content}/
              {new Date(record.createdAt).toLocaleString()}
            </div>
          )}
          <fetcher.Form method="post">
            <input type="hidden" name="_method" value={Status.success} />
            <input type="hidden" name="meterId" defaultValue={meter.id} />
            <input type="tel" name="content" placeholder="度數" required />
            <button>submit</button>
          </fetcher.Form>
          <fetcher.Form method="post">
            <input type="hidden" name="_method" value={Status.notRecord} />
            <input type="hidden" name="meterId" defaultValue={meter.id} />
            <select name="content" required>
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
          <hr />
        </div>
        ):
        <div>
          找不到水錶來新增水錶
          <fetcher.Form method="post">
          <input type="hidden" name="_method" value={'create'} />
            <div>
              <select name="projectId" defaultValue={fetcher.data?.fields?.projectId}>
                {projectListItems.map(project =>
                  <option key={project.id} value={project.id}>{project.name}</option>
                )}
              </select>
            </div>
            <div><input type="text" name="waterId" defaultValue={fetcher.data?.fields?.waterId} placeholder="waterId" required /></div>
            {fetcher.data?.fieldErrors?.waterId && <p>{fetcher.data?.fieldErrors.waterId}</p>}
            <div><input type="text" name="meterId" defaultValue={fetcher.data?.fields?.meterId} placeholder="meterId" required /></div>
            {fetcher.data?.fieldErrors?.meterId && <p>{fetcher.data?.fieldErrors.meterId}</p>}
            <div><input type="text" name="area" defaultValue={fetcher.data?.fields?.area} placeholder="area" /></div>
            <div><input type="text" name="address" defaultValue={fetcher.data?.fields?.address} placeholder="address" /></div>
            <div>
              <select name="type" required>
                <option value={Suppy.NOM}>正常</option>
                <option value={Suppy.END}>中止</option>
                <option value={Suppy.PAU}>停水</option>
              </select>
            </div>
            <div>
              <select name="suppy" required>
                <option value={Type.DRT}>直接錶</option>
                <option value={Type.TTL}>總錶</option>
                <option value={Type.BCH}>分錶</option>
              </select>
            </div>
            <div><input type="text" name="location" defaultValue={fetcher.data?.fields?.location} placeholder="location" /></div>
            <div><input type="text" name="note" defaultValue={fetcher.data?.fields?.note} placeholder="note" /></div>

            <button type="button" onClick={setStatus.bind(null, Status.success)}>成功</button>
            <button type="button" onClick={setStatus.bind(null, Status.notRecord)}>未記</button>
            {status === Status.success && <>
              <input type="text" name="status" value={Status.success} readOnly />
              <input type="tel" name="content" defaultValue={fetcher.data?.fields?.content} placeholder="度數" required />
            </>}

            {status === Status.notRecord && <>
              <input type="text" name="status" value={Status.notRecord} readOnly />
              <select name="content" defaultValue={fetcher.data?.fields?.content} required>
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
            </>}
            <button>登記</button>
          </fetcher.Form>
        </div>
      }
    </div>
  )
}

export default RecordPage;