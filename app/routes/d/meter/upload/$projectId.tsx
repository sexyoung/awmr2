import { from, concatMap, scan, distinctUntilChanged, map } from "rxjs";
import { useState } from "react";
import { read, utils } from "xlsx";
import { useParams, useFetcher } from "@remix-run/react"
import { Caliber } from "~/consts/meter";
export { action } from "./action";

type UploadMeter = {
  area: string;
  waterID: string;
  meterID: string;
  address: string;
  status: number;
  type: string;
  location: string;
}

let data: UploadMeter[];
const caliber = Object.values(Caliber).filter(v => typeof v === 'string');
const sheetHeader = ["waterID", "area", "meterID", "address", "status", "type", "location"];

const UploadPage = () => {
  const params = useParams();
  const [percent, setPercent] = useState(0);
  const [isUpLoading, setIsUpLoading] = useState(false);
  const fetcher = useFetcher<string[]>(); // meterId list

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

    console.log('uploadMeterList', uploadMeterList);
    setIsUpLoading(true);
    const uploadMeterList$ = from(uploadMeterList)
      .pipe(
        concatMap(async ({waterID: waterId, meterID: meterId, ...meter}) => {
          const formData = new FormData();
          console.log('!!!!');
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
          console.log('????');
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
      });
  }

  // console.log('fetcher.state', fetcher.state);
  // console.log('fetcher.type', fetcher.type);
  // console.log('fetcher.submission', fetcher.submission);
  console.log('fetcher.data', fetcher.data);

  return (
    <div>
      <h2>上傳水錶頁</h2>
      {params.projectId}
      {fetcher.state === 'idle' &&
        <fetcher.Form method="post">
          <input type="file" onChange={handleChooseFile} accept=".xlsx, application/vnd.openxmlfetcher.Formats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
        </fetcher.Form>
      }

      {!!fetcher.data && !!fetcher.data.length && (
        <div>
          <h2>略過的資料</h2>
          {fetcher.data.map(meter =>
            <span key={meter}>{meter}, </span>
          )}
        </div>
      )}

      {data && data.length && fetcher.data &&
        <fetcher.Form method="post" onSubmit={handleUpload}>
          <div>要上傳筆數: {data.length - fetcher.data.length}</div>
          <input type="hidden" name="_method" value="upload" />
          <button>上傳</button>
        </fetcher.Form>
      }
      {isUpLoading && <div>{percent}%</div>}
      <ul>
        <li>v 讀取xlsx, data sheet</li>
        <li>v 傳送所有水號錶號去檢查</li>
        <li>v 略過已存在水錶 (水號or錶號相同)</li>
        <li>v 分析地址</li>
        <li>v 上傳水錶</li>
        <li>v 評估上傳時間</li>
      </ul>
    </div>
  )
}

export default UploadPage