import { format } from "date-fns";
import { useState, Fragment, MouseEventHandler, useRef } from "react";
import { LinksFunction, LoaderFunction } from "@remix-run/node";
import { Meter, Project, Record, User } from "@prisma/client";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { Suppy, Type } from "~/consts/meter";
import { NotRecordReason, Status } from "~/consts/reocrd";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";

import stylesUrl from "~/styles/record-page.css";

export { action } from "./action";

const PAGE_SIZE = 3;

type LoadData = {
  href: string;
  meterCount: number;
  successCount: number;
  notRecordCount: number;
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
  // date = new Date(+date - 1000 * 60 * 60 * 8);
  return date.toLocaleDateString().slice(0, 10);
};

const getTomorrow = () => new Date(new Date().valueOf() + 1000 * 60 * 60 * 24);

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
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

  const {Record, ...summary} = where;

  let meterCount = await db.meter.count({ where: summary });
  let successCount = (await db.record.groupBy({
    where: {
      status: 'success',
      createdAt: {
        gte: new Date(formatYmd(new Date())),
        lt: new Date(formatYmd(getTomorrow())),
      }
    },
    by: ['meterId'],
    _count: { meterId: true }
  })).length;

  let notRecordCount = (await db.record.groupBy({
    where: {
      status: 'notRecord',
      createdAt: {
        gte: new Date(formatYmd(new Date())),
        lt: new Date(formatYmd(getTomorrow())),
      }
    },
    by: ['meterId'],
    _count: { meterId: true }
  })).length;

  const pageTotal = ~~((meterCount && (meterCount - 1)) / PAGE_SIZE) + 1;
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
    meterCount,
    successCount,
    notRecordCount,
    meterListItem,
    projectListItems,
    href: url.href,
  };
}

const RecordPage = () => {
  const fetcher = useFetcher();
  const [status, setStatus] = useState<Status>(Status.success);
  const { meterCount, successCount, notRecordCount, search, href, pageTotal, meterListItem, projectListItems } = useLoaderData<LoadData>();

  const handleChecked: MouseEventHandler = ({ target }) => {
    const DOM = (target as HTMLInputElement);
    const otherDOM = (document.getElementById(DOM.dataset.other as string) as HTMLInputElement);
    otherDOM.checked = false;
  }

  const handleSubmit = (id: number) => {
    (document.getElementById(`success-${id}`) as HTMLInputElement).checked = false;
    (document.getElementById(`notRecord-${id}`) as HTMLInputElement).checked = false;
  }
  
  return (
    <div className="Page RecordPage">
      <div className="block">
        <div className="header">
          <h2 className="title">水錶登錄頁</h2>
          {pageTotal > 1 && <Pagination {...{pageTotal, href}} />}
        </div>
        <div className="search-form">
          <Form method="get">
            <input type="text" name="search" defaultValue={search} placeholder="搜尋小區、地址、錶號、水號、位置或備註..." />
          </Form>
        </div>
        todo:
        <ul>
          <li>登記順便把水錶內容改掉</li>
        </ul>

        水錶量: {meterCount}
        抄錶量: {successCount}
        未登量: {notRecordCount}

        <div className="df fww item-list">
          {meterListItem.length ?
            meterListItem.map(meter =>
              <Fragment key={meter.id}>
                <div className="fg1 fbp50 mwp50 xs:fbp100 xs:mwp100">
                  <div className="item m0a pr ovh">
                    <input type="checkbox" id={`toggle-record-${meter.id}`} className="toggle-record" />
                    <input onClick={handleChecked} data-other={`notRecord-${meter.id}`} type="checkbox" id={`success-${meter.id}`} className="toggle-success" />
                    <input onClick={handleChecked} data-other={`success-${meter.id}`} type="checkbox" id={`notRecord-${meter.id}`} className="toggle-notRecord" />
                    <div>水號 <span className="value">{meter.waterId}</span></div>
                    <div>錶號 <span className="value">{meter.meterId}</span></div>
                    <div>地址 <span className="value">{meter.address}</span></div>
                    <div>錶位 <span className="value">{meter.location}</span></div>
                    <div>備註 <span className="value">{meter.note}</span></div>
                    {!!meter.Record.length &&
                      <>
                        <label className={`last-record pa bg-${meter.Record[0].status}`} htmlFor={`toggle-record-${meter.id}`}>
                          {meter.Record[0].user.fullname}({meter.Record.length})
                        </label>
                        <div className="record-list pa fill ova ttyp-100 tt150ms">
                          <div className="tar">
                            <label className="close" htmlFor={`toggle-record-${meter.id}`}>
                              <span>×</span>
                            關閉
                            </label>
                          </div>
                          {meter.Record.map(record =>
                            <div key={record.id} className="record df jcsb">
                              <div className={`tac content bg-${record.status}`}>{record.content}</div>
                              <div className="name">{record.user.fullname}</div>
                              <div className="time f12 mono-font">{format(new Date(record.createdAt), 'MM-dd HH:mm')}</div>
                            </div>
                          )}
                        </div>
                      </>
                    }
                    <div className="btn-block df gap5 f2r">
                      <label className="fx1 tac p10 color-mantis cf border-mantis" htmlFor={`success-${meter.id}`}>正常</label>
                      <label className="fx1 tac p10 color-zombie cf border-zombie" htmlFor={`notRecord-${meter.id}`}>異常</label>
                    </div>
                    <fetcher.Form onSubmit={handleSubmit.bind(null, meter.id)} method="post" className="success-form pa fill ttxp-100 tt150ms df fdc jcc p10 gap10">
                      <input type="hidden" name="_method" value={Status.success} />
                      <input type="hidden" name="meterId" defaultValue={meter.id} />
                      <input className="input f3r" type="tel" name="content" placeholder="度數" required />
                      <button className="btn primary f2r">登錄</button>
                    </fetcher.Form>
                    <fetcher.Form onSubmit={handleSubmit.bind(null, meter.id)} method="post" className="notRecord-form pa fill ttxp100 tt150ms df fdc jcc p10 gap10">
                      <input type="hidden" name="_method" value={Status.notRecord} />
                      <input type="hidden" name="meterId" defaultValue={meter.id} />
                      <select className="input f3r" name="content" required>
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
                      <button className="btn primary f2r">登錄</button>
                    </fetcher.Form>
                  </div>
                </div>
                <div className="break" />
              </Fragment>
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
      </div>
    </div>
  )
}

export default RecordPage;