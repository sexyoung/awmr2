import { from, concatMap } from "rxjs";
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
const sheetHeader = [ "waterID", "area", "meterID", "address", "status", "type", "location"];

const UploadPage = () => {
  const params = useParams();
  const fetcher = useFetcher<string[]>(); // meterId list

  const handleChooseFile: React.ChangeEventHandler<HTMLInputElement> = async ({ currentTarget }) => {
    const [ file = null ] = currentTarget.files as FileList;
    if(!file) return console.log('no file');

    const workbook = read(await file.arrayBuffer());
    data = utils.sheet_to_json(workbook.Sheets.data);
    if(!data.length) return console.log('no data');

    if(!Object.keys(data[0]).every(col => sheetHeader.includes(col))) {
      return console.log('missing field');
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
    from(uploadMeterList.slice(0, 100))
      .pipe(
        concatMap(async ({waterID: waterId, meterID: meterId, ...meter}) => {
          const formData = new FormData();
          formData.append('_method', 'upload');
          formData.append('data', JSON.stringify({
            projectId: +params.projectId!,
            ...meter,
            waterId,
            meterId,
          }));
          return (
            await (await fetch(`${location.href}?_data=routes%2Fd%2Fmeter%2Fupload%2F%24projectId`, {
              method: 'post',
              body: formData
            })).json()
          )
        }),
      )
      .subscribe(console.log);
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
            <div key={meter}>{meter}</div>
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
      <ul>
        <li>v 讀取xlsx, data sheet</li>
        <li>v 傳送所有水號錶號去檢查</li>
        <li>v 略過已存在水錶 (水號or錶號相同)</li>
        <li>分析地址</li>
        <li>上傳水錶</li>
      </ul>
    </div>
  )
}

export default UploadPage