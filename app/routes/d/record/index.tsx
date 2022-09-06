import { format } from "date-fns";
import { useState, Fragment, MouseEventHandler, FormEvent } from "react";
import { LinksFunction, LoaderFunction } from "@remix-run/node";
import { Meter, Project, Record, User } from "@prisma/client";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { Suppy, Type } from "~/consts/meter";
import { NotRecordReasonMap, Status } from "~/consts/reocrd";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";

import RecordBar from "~/component/RecordBar";
import { cache } from "./cache";
import stylesUrl from "~/styles/record-page.css";
import { getUser } from "~/api/user";
import { Role } from "~/consts/role";

export { action } from "./action";

const PAGE_SIZE = 30;

type MeterWithPR = Meter & {
  project: Project;
  Record: (Record & {
    user: User;
  })[];
}

type LoadData = {
  href: string;
  meterCount: number;
  meterCountSummary: number;
  successCount: number;
  notRecordCount: number;
  searchString: string;
  showRecord: boolean;
  projectListItems: Project[];
  meterListItem: MeterWithPR[];
  search: string;
} & PaginationProps

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  if(!user) return;
  let projectIdList = user.title === Role.ENG ?
    (await db.projectsOnUsers.findMany({where: {userId: user.id}})).map(({ projectId }) => projectId): [];

  const url = new URL(request.url);
  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  const page = +url.searchParams.get("page")! || 1;
  const search = url.searchParams.get("search") || '';
  const showRecord = Boolean(url.searchParams.get("showRecord")! || 0);

  const {
    where,
    meterCount,
    meterCountSummary,
    successCount,
    notRecordCount,
  } = await cache({ search, showRecord, projectIdList });

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
    showRecord,
    meterCountSummary,
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
  const { meterCountSummary, successCount, notRecordCount, search, href, pageTotal, meterListItem, projectListItems, showRecord } = useLoaderData<LoadData>();

  const handleChecked: MouseEventHandler = ({ target }) => {
    const DOM = (target as HTMLInputElement);
    const otherDOM = (document.getElementById(DOM.dataset.other as string) as HTMLInputElement);
    otherDOM.checked = false;
  }

  const handleSubmit = (meter: MeterWithPR, event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    if(formData.get('_method') === Status.success) {
      const inputContent = formData.has('content') ? +(formData.get('content') as string): 0;
      const lastRecord = meter.Record.shift();
      const lastContent = lastRecord ? +lastRecord.content: 0;
      const degree = inputContent - lastContent;
      if(degree >= 100 || degree <= -2) {
        alert("登錄度數超過100度 或 -2度");
      }
    }
    
    (document.getElementById(`success-${meter.id}`) as HTMLInputElement).checked = false;
    (document.getElementById(`notRecord-${meter.id}`) as HTMLInputElement).checked = false;
  }

  const toggleShowRecord = () => {
    let paramsObj = (
      location.search.slice(1).split('&').reduce((obj, str) => ({
        ...obj,
        [str.split('=')[0]]: str.split('=')[1],
      }), {} as {[key: string]: string})
    );
    if(showRecord) {
      delete paramsObj.showRecord;
    } else {
      paramsObj.showRecord = "1";
    }

    location.href = `/d/record?${(Object.keys(paramsObj).map(key => `${key}=${paramsObj[key]}`).join('&'))}`;
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
        <div className="df gap10 ph20 xs:fdc">
          <div className="toggle-block df">
            <input id="hadRecord" type="checkbox" defaultChecked={showRecord} onChange={toggleShowRecord} />
            <label className="df bg-gallery jcc aic ph20 xs:fx1 xs:p10" htmlFor="hadRecord">已登記水錶</label>
            {/* <input id="GPS" type="checkbox" />
            <label htmlFor="GPS">GPS</label> */}
          </div>
          <div className="fx1">
            <RecordBar {...{
              success: successCount,
              notRecord: notRecordCount,
              total: meterCountSummary,
              z: 1,
            }} />
            <ul className="sum-num df m0 p0 lsn mt5">
              <li className="f14">登錄: {successCount}</li>
              <li className="f14">異常: {notRecordCount}</li>
              <li className="f14">剩餘: {meterCountSummary - successCount - notRecordCount}</li>
              <li className="f14">
                抄見率:
                {~~(10000 * successCount / (meterCountSummary - notRecordCount))/100}%
              </li>
            </ul>
          </div>
        </div>
        todo:
        <ul>
          <li>登記順便把水錶內容改掉</li>
        </ul>
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
                              <div className={`tac content bg-${record.status}`}>
                                {record.status === Status.success? record.content: NotRecordReasonMap[record.content as keyof typeof NotRecordReasonMap]}
                              </div>
                              <div className="name">{record.user.fullname}</div>
                              <div className="time f12 mono-font">{format(new Date(record.createdAt), 'MM-dd HH:mm')}</div>
                            </div>
                          )}
                        </div>
                      </>
                    }
                    <div className="btn-block df gap5 f2r">
                      <label className="fx1 tac p10 color-mantis cp cf border-mantis" htmlFor={`success-${meter.id}`}>正常</label>
                      <label className="fx1 tac p10 color-zombie cp cf border-zombie" htmlFor={`notRecord-${meter.id}`}>異常</label>
                    </div>
                    <fetcher.Form onSubmit={handleSubmit.bind(null, meter)} method="post" className="success-form pa fill ttxp-100 tt150ms df fdc jcc p10 gap10">
                      <input type="hidden" name="_method" value={Status.success} />
                      <input type="hidden" name="meterId" defaultValue={meter.id} />
                      <input className="input f3r" type="tel" name="content" placeholder="度數" required />
                      <button className="btn primary f2r">登錄</button>
                    </fetcher.Form>
                    <fetcher.Form onSubmit={handleSubmit.bind(null, meter)} method="post" className="notRecord-form pa fill ttxp100 tt150ms df fdc jcc p10 gap10">
                      <input type="hidden" name="_method" value={Status.notRecord} />
                      <input type="hidden" name="meterId" defaultValue={meter.id} />
                      <select className="input f3r" name="content" required>
                        {Object.keys(NotRecordReasonMap).map(key =>
                          <option key={key} value={key}>
                            {NotRecordReasonMap[key as keyof typeof NotRecordReasonMap]}
                          </option>
                        )}
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
                    {Object.keys(NotRecordReasonMap).map(key =>
                      <option key={key} value={key}>
                        {NotRecordReasonMap[key as keyof typeof NotRecordReasonMap]}
                      </option>
                    )}
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