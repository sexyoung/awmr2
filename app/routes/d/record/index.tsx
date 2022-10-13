import { format } from "date-fns";
import imageCompression from 'browser-image-compression';
import { Meter, Project, Record, User } from "@prisma/client";
import { LinksFunction, LoaderFunction, MetaFunction } from "@remix-run/node";
import { useState, Fragment, MouseEventHandler, FormEvent, useEffect } from "react";
import { Form, Link, useFetcher, useLoaderData, useTransition } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { Suppy, Type } from "~/consts/meter";
import { NotRecordReasonMap, Status } from "~/consts/reocrd";
import { Pagination, Props as PaginationProps } from "~/component/Pagination";

import RecordBar from "~/component/RecordBar";
import { cache } from "./cache";
import stylesUrl from "~/styles/record-page.css";
import { getUser } from "~/api/user";
import { Role } from "~/consts/role";
import Modal from "~/component/Modal";

export { action } from "./action";

const TITLE = '水錶登錄';
const IMAGE = "/image.svg";
const PAGE_SIZE = 30;
let blob: File | null;

type MeterWithPR = Meter & {
  project: Project;
  Record: (Record & {
    user: User;
  })[];
}

type LoadData = {
  userTitle: Role;
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

export const meta: MetaFunction = () => ({
  title: TITLE,
});

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  if(!user) return;
  let projectIdList = (await db.projectsOnUsers.findMany({where: {userId: user.id}})).map(({ projectId }) => projectId);

  const url = new URL(request.url);
  const projectListItems = await db.project.findMany({
    where: { id: {in: projectIdList}},
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
    userTitle: user.title,
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
  const transition = useTransition();
  const [preview, setPreview] = useState('');
  const [modifyDOM, setModifyDOM] = useState<{[key: string]: string}>({});
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<Status>(Status.success);
  const { meterCountSummary, successCount, notRecordCount, search, href, pageTotal, meterListItem, projectListItems, showRecord, userTitle } = useLoaderData<LoadData>();

  useEffect(() => {
    (document.getElementById('search') as HTMLInputElement).value = '';
  });

  const handleChecked: MouseEventHandler = ({ target }) => {
    const DOM = (target as HTMLInputElement);
    const otherDOM = (document.getElementById(DOM.dataset.other as string) as HTMLInputElement);
    otherDOM.checked = false;
  }

  const handleSubmit = async (meter: MeterWithPR, event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    if(formData.get('_method') === Status.success) {
      const inputContent = formData.has('content') ? +(formData.get('content') as string): 0;
      const lastRecord = meter.Record.shift();
      const lastContent = lastRecord ? +lastRecord.content: 0;
      const degree = inputContent - lastContent;
      if(lastContent && (degree >= 100 || degree <= -2)) {
        alert("登錄度數超過100度 或 -2度");
      }
    }

    if(preview && blob) {
      const formDataImage = new FormData();
      formDataImage.append('picture', blob);
      const picture = await(await fetch(`/d/record/upload?name=${document.querySelector<HTMLInputElement>(`[class=picture-${meter.id}]`)!.value}`, {
        method: 'post',
        body: formDataImage,
      })).json();
      blob = null;
      setPreview('');
    }
    
    (document.getElementById(`success-${meter.id}`) as HTMLInputElement).checked = false;
    (document.getElementById(`notRecord-${meter.id}`) as HTMLInputElement).checked = false;
    setModifyDOM({});
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

  const handleCompression = async (meter: MeterWithPR, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files![0];
    if(!file) {
      document.querySelectorAll<HTMLInputElement>(`[class=picture-${meter.id}]`).forEach(input => {
        input.value = '';
      });
      return setPreview('');
    }
    blob = await imageCompression(file, {maxSizeMB: 0.1, maxWidthOrHeight: 1000});
    setPreview(URL.createObjectURL(blob));

    // 還是把設定檔名的部分在上傳時就指定好吧
    document.querySelectorAll<HTMLInputElement>(`[class=picture-${meter.id}]`).forEach(input => {
      input.value = `${meter.waterId}-${meter.meterId}.${blob!.name.split('.').pop()}`;
    });
  }

  const handleToggle: MouseEventHandler<HTMLInputElement> = ({ currentTarget }) => {
    const InputDOM = document.querySelector(`[data-id=${currentTarget.getAttribute('id')!.slice(9)}]`) as HTMLInputElement;
    InputDOM.focus();
    InputDOM.selectionStart = InputDOM.selectionEnd = InputDOM.value.length;
  }

  const handleKeyUp: React.KeyboardEventHandler<HTMLInputElement> = ({ currentTarget, key }) => {
    if(!['Enter', 'Escape'].includes(key)) return;
    const CheckBoxDOM = document.getElementById("checkbox-" + currentTarget.getAttribute('data-id') as string) as HTMLInputElement;
    if(key === 'Enter') {
      if(currentTarget.value !== currentTarget.dataset.value) {
        setModifyDOM(modifyDOM => ({
          ...modifyDOM,
          [currentTarget.getAttribute('data-id')!]: currentTarget.value,
        }))
      } else {
        setModifyDOM(modifyDOM => {
          delete modifyDOM[currentTarget.getAttribute('data-id')!];
          return {...modifyDOM};
        });
      }
    }
    CheckBoxDOM.click();
  }

  const handleQuery = async (event: FormEvent<HTMLFormElement>) => {
    const DOM = (document.getElementById('search') as HTMLInputElement);
    DOM.value = search ? search.split(',').concat(DOM.value).join(','): DOM.value;
  }

  return (
    <div className="Page RecordPage">
      <div className="block">
        <div className="header">
          <h2 className="title">{TITLE}</h2>
          {pageTotal > 1 && <Pagination {...{pageTotal, href}} />}
        </div>
        <div className="search-form">
          <Form method="get" onSubmit={handleQuery}>
            {search &&
              <div>
                {search.split(',').map((key, i) =>
                  <Link to={`/d/record?search=${[...search.split(',').slice(0, i), ...search.split(',').slice(i +1)].join(',')}`} className="key tdn dif bg-mantis cf aic" key={i}>{key}</Link>
                )}
              </div>
            }
            <input type="text" className="xs:f1.2r" name="search" id="search" placeholder="搜尋小區、地址、錶號、水號、位置..." />
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
              z: 0,
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
        <div className="df fww item-list">
          {meterListItem.length ?
            meterListItem.map(meter =>
              <Fragment key={meter.id}>
                <div className="fg1 fbp50 mwp50 xs:fbp100 xs:mwp100">
                  <div className="item m0a pr ovh">
                    <input type="checkbox" id={`toggle-record-${meter.id}`} className="toggle-record" />
                    <input onClick={handleChecked} data-other={`notRecord-${meter.id}`} type="checkbox" id={`success-${meter.id}`} className="toggle-success" />
                    <input onClick={handleChecked} data-other={`success-${meter.id}`} type="checkbox" id={`notRecord-${meter.id}`} className="toggle-notRecord" />
                    <div className="df aic gap10">
                      <span className="wsn">水號</span>
                      <label className="value fx1 df">
                        <input type="checkbox" className="dn" id={`checkbox-waterId-${meter.id}`} onClick={handleToggle} />
                        {modifyDOM[`waterId-${meter.id}`] ?
                          <span className="bg-zombie">{modifyDOM[`waterId-${meter.id}`]}</span>:
                          <span className="cp">{meter.waterId}</span>
                        }
                        <input required type="text" className="input dn fx1" name="waterId" data-id={`waterId-${meter.id}`} data-value={meter.waterId} onKeyUp={handleKeyUp} defaultValue={meter.waterId} />
                      </label>
                    </div>
                    <div className="df aic gap10">
                      <span className="wsn">錶號</span>
                      <label className="value fx1 df">
                        <input type="checkbox" className="dn" id={`checkbox-meterId-${meter.id}`} onClick={handleToggle} />
                        {modifyDOM[`meterId-${meter.id}`] ?
                          <span className="bg-zombie">{modifyDOM[`meterId-${meter.id}`]}</span>:
                          <span className="cp">{meter.meterId}</span>
                        }
                        <input required type="text" className="input dn fx1" name="meterId" data-id={`meterId-${meter.id}`} data-value={meter.meterId} onKeyUp={handleKeyUp} defaultValue={meter.meterId} />
                      </label>
                    </div>
                    <div className="df aic gap10">
                      <span className="wsn">地址</span>
                      <label className="value fx1 df">
                        <input type="checkbox" className="dn" id={`checkbox-address-${meter.id}`} onClick={handleToggle} />
                        {modifyDOM[`address-${meter.id}`] ?
                          <span className="bg-zombie">{modifyDOM[`address-${meter.id}`]}</span>:
                          <span className="cp">{meter.address}</span>
                        }
                        <input required type="text" className="input dn fx1" name="address" data-id={`address-${meter.id}`} data-value={meter.address} onKeyUp={handleKeyUp} defaultValue={meter.address || ''} />
                      </label>
                    </div>
                    <div className="df aic gap10">
                      <span className="wsn">錶位</span>
                      <label className="value fx1 df">
                        <input type="checkbox" className="dn" id={`checkbox-location-${meter.id}`} onClick={handleToggle} />
                        {modifyDOM[`location-${meter.id}`] ?
                          <span className="bg-zombie">{modifyDOM[`location-${meter.id}`]}</span>:
                          <span className="cp">{meter.location || "新增錶位"}</span>
                        }
                        <input type="text" className="input dn fx1" name="location" data-id={`location-${meter.id}`} data-value={meter.location} onKeyUp={handleKeyUp} defaultValue={meter.location || ''} />
                      </label>
                    </div>
                    <div className="df aic gap10">
                      <span className="wsn">備註</span>
                      <label className="value fx1 df">
                        <input type="checkbox" className="dn" id={`checkbox-note-${meter.id}`} onClick={handleToggle} />
                        {modifyDOM[`note-${meter.id}`] ?
                          <span className="bg-zombie">{modifyDOM[`note-${meter.id}`]}</span>:
                          <span className="cp">{meter.note || "新增備註"}</span>
                        }
                        <input type="text" className="input dn fx1" name="note" data-id={`note-${meter.id}`} data-value={meter.note} onKeyUp={handleKeyUp} defaultValue={meter.note || ''} />
                      </label>
                    </div>
                    {!!meter.Record.length &&
                      <>
                        <label className={`last-record pa bg-${meter.Record[0].status}`} htmlFor={`toggle-record-${meter.id}`}>
                          {meter.Record[0].user.fullname}({meter.Record.length})
                        </label>
                        <div className="record-list pa fill ova ttyp-100 tt150ms">
                          <div className="tar">
                            <label className="close cp" htmlFor={`toggle-record-${meter.id}`}>
                              <span>×</span>
                              關閉
                            </label>
                          </div>
                          {meter.Record.map(record =>
                            <div key={record.id} className="record df jcsb">
                              <div className={`tac content bg-${record.status} df aic jcse`}>
                                {record.picture && <Link target="_blank" to={`/p/${record.id}`}><div className="bgrn bgpc w20 h20 pl5" style={{backgroundImage: `url(${IMAGE})`}} /></Link>}
                                {record.status === Status.success? record.content: NotRecordReasonMap[record.content as keyof typeof NotRecordReasonMap]}
                              </div>
                              <div className="name">{record.user.fullname}</div>
                              <div className="time f12 mono-font df aic">{format(new Date(record.createdAt), 'MM-dd HH:mm')}</div>
                            </div>
                          )}
                        </div>
                      </>
                    }
                    <div className="btn-block df gap5 f1r xs:f2r">
                      <label className="fx1 tac p4 color-mantis cp cf border-mantis xs:p10" htmlFor={`success-${meter.id}`}>正常</label>
                      <label className="fx1 tac p4 color-zombie cp cf border-zombie xs:p10" htmlFor={`notRecord-${meter.id}`}>異常</label>
                    </div>
                    <fetcher.Form encType="multipart/form-data" onSubmit={handleSubmit.bind(null, meter)} method="post" className="success-form pa fill p10p50 ttxp-100 tt150ms df fdc jcc xs:p10 gap10">
                      <input type="hidden" name="_method" value={Status.success} />
                      <input type="hidden" name="meterId" defaultValue={meter.id} />
                      <input type="hidden" name="search" defaultValue={search} />
                      <input type="hidden" name="showRecord" defaultValue={showRecord ? "1": ""} />
                      <input type="hidden" name="projectIdList" defaultValue={userTitle !== Role.ADM ? projectListItems.map(({ id }) => id).join(','): ""} />
                      {modifyDOM[`waterId-${meter.id}`] && <input name="updateMeter[waterId]" type="hidden" value={modifyDOM[`waterId-${meter.id}`]} />}
                      {modifyDOM[`meterId-${meter.id}`] && <input name="updateMeter[meterId]" type="hidden" value={modifyDOM[`meterId-${meter.id}`]} />}
                      {modifyDOM[`address-${meter.id}`] && <input name="updateMeter[address]" type="hidden" value={modifyDOM[`address-${meter.id}`]} />}
                      {modifyDOM[`location-${meter.id}`] && <input name="updateMeter[location]" type="hidden" value={modifyDOM[`location-${meter.id}`]} />}
                      {modifyDOM[`note-${meter.id}`] && <input name="updateMeter[note]" type="hidden" value={modifyDOM[`note-${meter.id}`]} />}
                      <div className="df">
                        <input className="input fx2 f1r xs:f3r wp100" type="tel" name="content" placeholder="度數" required />
                        <label className="fx1 db bgpc bgrn bgsct" style={{backgroundImage: `url(${preview || IMAGE})`}}>
                          <input type="file" className="dn" onChange={handleCompression.bind(null, meter)} accept="image/*" />
                        </label>
                        <input type="hidden" name="picture" className={`picture-${meter.id}`} />
                      </div>
                      <button className="btn primary f1r xs:f2r">登錄</button>
                    </fetcher.Form>
                    <fetcher.Form encType="multipart/form-data" onSubmit={handleSubmit.bind(null, meter)} method="post" className="notRecord-form pa fill p10p50 ttxp100 tt150ms df fdc jcc xs:p10 gap10">
                      <input type="hidden" name="_method" value={Status.notRecord} />
                      <input type="hidden" name="meterId" defaultValue={meter.id} />
                      <input type="hidden" name="search" defaultValue={search} />
                      <input type="hidden" name="showRecord" defaultValue={showRecord ? "1": ""} />
                      <input type="hidden" name="projectIdList" defaultValue={userTitle !== Role.ADM ? projectListItems.map(({ id }) => id).join(','): ""} />
                      {modifyDOM[`waterId-${meter.id}`] && <input name="updateMeter[waterId]" type="hidden" value={modifyDOM[`waterId-${meter.id}`]} />}
                      {modifyDOM[`meterId-${meter.id}`] && <input name="updateMeter[meterId]" type="hidden" value={modifyDOM[`meterId-${meter.id}`]} />}
                      {modifyDOM[`address-${meter.id}`] && <input name="updateMeter[address]" type="hidden" value={modifyDOM[`address-${meter.id}`]} />}
                      {modifyDOM[`location-${meter.id}`] && <input name="updateMeter[location]" type="hidden" value={modifyDOM[`location-${meter.id}`]} />}
                      {modifyDOM[`note-${meter.id}`] && <input name="updateMeter[note]" type="hidden" value={modifyDOM[`note-${meter.id}`]} />}
                      <div className="df">
                        <select className="input fx2 f1r xs:f3r wp100" name="content" required>
                          {Object.keys(NotRecordReasonMap).map(key =>
                            <option key={key} value={key}>
                              {NotRecordReasonMap[key as keyof typeof NotRecordReasonMap]}
                            </option>
                          )}
                        </select>
                        <label className="fx1 db bgpc bgrn bgsc" style={{backgroundImage: `url(${preview || IMAGE})`}}>
                          <input type="file" className="dn" onChange={handleCompression.bind(null, meter)} accept="image/*" />
                        </label>
                        <input type="hidden" name="picture" className={`picture-${meter.id}`} />
                      </div>
                      <button className="btn primary f1r xs:f2r">登錄</button>
                    </fetcher.Form>
                  </div>
                </div>
                <div className="break" />
              </Fragment>
            ):
            <div className="m0a xs:wp100">
              <h3 className="tac">新增未存在水錶</h3>
              <fetcher.Form method="post" onSubmit={setShowModal.bind(null, true)}>
                <input type="hidden" name="_method" value={'create'} />
                <div className="df gap10 xs:fdc xs:f1.2r">
                  <div className="fx1 df fdc gap10">
                    <div className="df aic gap10">
                      標案: <select name="projectId" className="input fx1" defaultValue={fetcher.data?.fields?.projectId}>
                        {projectListItems.map(project =>
                          <option key={project.id} value={project.id}>{project.name}</option>
                        )}
                      </select>
                    </div>
                    <div className="df aic gap10">水號: <input type="text" className="input fx1" name="waterId" defaultValue={fetcher.data?.fields?.waterId} placeholder="waterId" required /></div>
                    {fetcher.data?.fieldErrors?.waterId && <p>{fetcher.data?.fieldErrors.waterId}</p>}
                    <div className="df aic gap10">錶號: <input type="text" className="input fx1" name="meterId" defaultValue={fetcher.data?.fields?.meterId} placeholder="meterId" required /></div>
                    {fetcher.data?.fieldErrors?.meterId && <p>{fetcher.data?.fieldErrors.meterId}</p>}
                    <div className="df aic gap10">小區: <input type="text" className="input fx1" name="area" defaultValue={fetcher.data?.fields?.area} placeholder="area" /></div>
                    <div className="df aic gap10">地址: <input type="text" className="input fx1" name="address" defaultValue={fetcher.data?.fields?.address} placeholder="address" /></div>
                  </div>
                  <div className="fx1 df fdc gap10">
                    <div className="df aic gap10">供水: <select className="input fx1" name="type" required>
                        <option value={Suppy.NOM}>正常</option>
                        <option value={Suppy.END}>中止</option>
                        <option value={Suppy.PAU}>停水</option>
                      </select>
                    </div>
                    <div className="df aic gap10">錶種: <select className="input fx1" name="suppy" required>
                        <option value={Type.DRT}>直接錶</option>
                        <option value={Type.TTL}>總錶</option>
                        <option value={Type.BCH}>分錶</option>
                      </select>
                    </div>
                    <div className="df aic gap10">錶位: <input type="text" className="input fx1" name="location" defaultValue={fetcher.data?.fields?.location} placeholder="location" /></div>
                    <div className="df aic gap10">備註: <input type="text" className="input fx1" name="note" defaultValue={fetcher.data?.fields?.note} placeholder="note" /></div>
                    <div className="df aic gap10">
                      <button className="btn bg-mantis wsn cf xs:f1.2r" type="button" onClick={setStatus.bind(null, Status.success)}>成功</button>
                      <button className="btn bg-zombie wsn xs:f1.2r" type="button" onClick={setStatus.bind(null, Status.notRecord)}>未記</button>
                      {status === Status.success && <>
                        <input type="hidden" name="status" value={Status.success} readOnly />
                        <input className="input fx1" style={{width: 70}} type="tel" name="content" defaultValue={fetcher.data?.fields?.content} placeholder="度數" required />
                      </>}
                      {status === Status.notRecord && <>
                        <input type="hidden" name="status" value={Status.notRecord} readOnly />
                        <select className="input fx1" name="content" defaultValue={fetcher.data?.fields?.content} required>
                          {Object.keys(NotRecordReasonMap).map(key =>
                            <option key={key} value={key}>
                              {NotRecordReasonMap[key as keyof typeof NotRecordReasonMap]}
                            </option>
                          )}
                        </select>
                      </>}
                    </div>
                  </div>
                </div>
                <button className="btn primary wp100 mt10 p10 f1.5r">登記</button>
              </fetcher.Form>
              {showModal && <Modal onClose={setShowModal.bind(null, false)}>新增水錶中</Modal>}
            </div>
          }
          {(fetcher.state === 'submitting') && <Modal>登錄中</Modal>}
          {([fetcher.state, transition.state].includes('loading') || transition.state === 'submitting') && <Modal>讀取中</Modal>}
        </div>
      </div>
    </div>
  )
}

export default RecordPage;