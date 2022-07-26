import { from, concatMap, scan, distinctUntilChanged, map } from "rxjs";
import { useState } from "react";
import { read, utils } from "xlsx";
import { useParams, useFetcher, useLoaderData } from "@remix-run/react"
import { Caliber } from "~/consts/meter";
import { LinksFunction, LoaderFunction } from "@remix-run/node";
import { isAdmin } from "~/api/user";
import { db } from "~/utils/db.server";
import { Project } from "@prisma/client";
export { action } from "./action";

import stylesUrl from "~/styles/meter-upload.css";

type UploadMeter = {
  area: string;
  waterID: string;
  meterID: string;
  address: string;
  status: number;
  type: string;
  location: string;
}

type LoaderData = {
  projectListItems: Project[]
};

let data: UploadMeter[];
let fileName: string = '';
const caliber = Object.values(Caliber).filter(v => typeof v === 'string');
const sheetHeader = ["waterID", "area", "meterID", "address", "status", "type", "location"];

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  return {
    projectListItems,
  };
}

const UploadPage = () => {
  const params = useParams();
  const [percent, setPercent] = useState(0);
  const [isUpLoading, setIsUpLoading] = useState(false);
  const fetcher = useFetcher<string[]>(); // meterId list
  const { projectListItems } = useLoaderData<LoaderData>();

  const handleChangeProject: React.ChangeEventHandler<HTMLSelectElement> = ({ currentTarget }) => {
    location.href = `/d/meter/upload/${currentTarget.value}`;
  }

  const handleChooseFile: React.ChangeEventHandler<HTMLInputElement> = async ({ currentTarget }) => {
    const [ file = null ] = currentTarget.files as FileList;
    if(!file) return console.log('no file');

    const workbook = read(await file.arrayBuffer());
    data = utils.sheet_to_json(workbook.Sheets.data);
    if(!data.length) return console.log('no data');

    const cols = Object.keys(data[0]);
    for (let i = 0; i < sheetHeader.length; i++) {
      if(!cols.includes(sheetHeader[i])) {
        return console.log(`invalid field: ${sheetHeader[i]}`);
      }
    }

    const validList = [];

    for (let i = 0; i < data.length; i++) {
      if(!caliber.includes(data[i].meterID[0])) {
        return console.log(`meterId: ${data[i].meterID} is not correct!`);
      }
      validList.push({
        waterId: data[i].waterID,
        meterId: data[i].meterID,
      })
    };

    fileName = file.name;

    fetcher.submit({
      _method: 'check',
      data: JSON.stringify(validList)
    }, {
      method: 'post',
    });
  }

  const handleUpload: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const { data: existMeterIdList = []} = fetcher;
    if(!existMeterIdList) return;

    const uploadMeterList = data.filter(item =>
      !existMeterIdList.includes(item.meterID)
    );

    setIsUpLoading(true);
    const uploadMeterList$ = from(uploadMeterList)
      .pipe(
        concatMap(async ({waterID: waterId, meterID: meterId, ...meter}) => {
          const formData = new FormData();
          formData.append('_method', 'upload');
          formData.append('data', JSON.stringify({
            projectId: +params.projectId!,
            waterId,
            meterId,
            area: meter.area,
            address: meter.address,
            suppy: +meter.status,
            type: +meter.type,
            location: meter.location,
          }));
          return (
            await (await fetch(`${location.href}?_data=routes%2Fd%2Fmeter%2Fupload%2F%24projectId`, {
              method: 'post',
              body: formData
            })).json()
          )
        }),
        scan(sum => sum + 1, 0),
        map(sum => ~~(sum/uploadMeterList.length * 100)),
        distinctUntilChanged()
      );
      
      uploadMeterList$.subscribe(percent => {
        if(percent < 100) return setPercent(percent);
        data = [];
        setIsUpLoading(false);
        location.reload();
      });
  }

  const handleClearData = () => {
    location.reload();
  }

  // console.log('fetcher.state', fetcher.state);
  // console.log('fetcher.type', fetcher.type);
  // console.log('fetcher.submission', fetcher.submission);
  // console.log('fetcher.data', fetcher.data);

  return (
    <div className="Page MeterUploadPage">
      <div className="block">
        <div className="header">
          <h2 className="title">上傳水錶頁</h2>
        </div>
        <div className="wrap">
          {fetcher.state === 'idle' &&
            <fetcher.Form method="post" className="check-form">
              <select onChange={handleChangeProject} defaultValue={params.projectId}>
                {projectListItems.map(project =>
                  <option key={project.id} value={project.id}>{project.name}</option>
                )}
              </select>
              <label className={`label ${data && data.length ? 'disabled': ''}`} htmlFor="file">
                <input type="file" id="file" onChange={handleChooseFile} accept=".xlsx, application/vnd.openxmlfetcher.Formats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                <div className="choose">選擇檔案</div>
              </label>
            </fetcher.Form>
          }
          {!!data && !!data.length && !!fetcher.data &&
            <fetcher.Form method="post" className="upload-form" onSubmit={handleUpload}>
              <input type="hidden" name="_method" value="upload" />
              <div>{fileName} 上傳水錶: <span className="color-mantis">{data.length - fetcher.data.length}</span></div>
              <div className="btn-list">
                <button className="f1r btn bg-mantis cf" disabled={!(data.length - fetcher.data.length)}>開始上傳</button>
                <button className="f1r btn bg-zombie" type="button" onClick={handleClearData}>重選檔案</button>
              </div>
            </fetcher.Form>
          }
          
          {isUpLoading &&
          <div className="progress-block">
            <div className="progress">
              <div className="bar bg-mantis" style={{width: `${percent}%`}} />
            </div>
            <div style={{ marginLeft: `${percent}%`}}>{percent}%</div>
          </div>
          }

          {!!fetcher.data && !!fetcher.data.length && (
            <div className="skip-upload">
              <div className="title">略過的資料 ({fetcher.data.length})</div>
              {fetcher.data.map(meter =>
                <span className="dib" key={meter}>{meter}, </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UploadPage