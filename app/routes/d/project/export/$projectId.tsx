import * as XLSX from 'xlsx-js-style'
import { useState, ChangeEventHandler, useRef } from "react";
import { startOfDay, endOfDay, format } from 'date-fns';
import { useLoaderData, useParams } from "@remix-run/react";
import { LinksFunction, LoaderFunction } from "@remix-run/node";
import { DateRangePicker, RangeKeyDict, Range } from 'react-date-range';
import { zhTW } from "date-fns/locale";

import rdrStyle from 'react-date-range/dist/styles.css'; // main style file
import rdrTheme from 'react-date-range/dist/theme/default.css'; // theme css file
import { db } from "~/utils/db.server";
import { Meter, Project, Record, Status, User } from "@prisma/client";
import { Caliber } from "~/consts/meter";
import { getUser, isAdmin } from "~/api/user";
import { cacheAll } from "~/api/cache/area.cache";
import { NotRecordReasonMap } from "~/consts/reocrd";

type LoaderData = {
  DOMAIN: string;
  areaListItems: {
    area: string;
    _count: { area: number },
  }[];
  projectListItems: Project[];
};

type RecordQuery = Record & {
  user: User;
  meter: Meter & {
    project: Project;
  };
}

const Type = {
  0: '直接錶',
  1: '總錶',
  2: '分錶',
}

const Suppy = {
  1: '正常',
  3: '中止',
  5: '停水',
}

const StatusMap = {
  success: '正常',
  notRecord: '異常',
}

let count = 0;

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: rdrStyle },
    { rel: "stylesheet", href: rdrTheme },
  ]
}

export const loader: LoaderFunction = async ({ params: { projectId = 0 }, request }) => {
  await isAdmin(request);
  const user = await getUser(request);
  if(!user) return;

  const projectListItems = user.projects.map(({ project }) => ({id: project.id, name: project.name}));

  const areaListItems = await db.meter.groupBy({
    by: ['area'],
    _count: {
      area: true,
    },
    where: {
      projectId: +projectId,
    }
  });

  const cacheArea = await cacheAll();
  /** @ts-ignore */
  areaListItems.sort((a, b) => {
    return (
      +new Date(cacheArea[b.area as string].lastRecordTime || 0) -
      +new Date(cacheArea[a.area as string].lastRecordTime || 0)
    );
  });

  return {
    DOMAIN: process.env.DOMAIN,
    areaListItems,
    projectListItems,
  }
}

const projectExportPage = () => {
  const params = useParams();
  const selectDOM = useRef<HTMLSelectElement>(null);
  const [canDownLoad, setCanDownLoad] = useState(false);
  const [selection, setSelection] = useState<Range>({
    endDate: endOfDay(new Date()),
    startDate: startOfDay(new Date()),
    key: 'selection',
  });
  const { projectListItems, areaListItems, DOMAIN } = useLoaderData<LoaderData>();

  const getQuery = (selection: Range) => {
    const endDate = format(selection.endDate as Date, 'yyyy-MM-dd');
    const startDate = format(selection.startDate as Date, 'yyyy-MM-dd');
    const data = {
      projectId: params.projectId,
      area: selectDOM.current!.value,
      endDate,
      startDate,
    };
    return Object.keys(data).map(key => `${key}=${data[key as keyof typeof data]}`).join('&');
  }

  const handleSelect = async ({ selection }: RangeKeyDict) => {
    setSelection(selection);
    // const endDate = format(selection.endDate as Date, 'yyyy-MM-dd');
    // const startDate = format(selection.startDate as Date, 'yyyy-MM-dd');
    // const data = {
    //   projectId: params.projectId,
    //   area: selectDOM.current!.value,
    //   endDate,
    //   startDate,
    // };
    const search = getQuery(selection);

    count = await (await (await fetch(`/d/project/export/query/count?${search}`)).json());
    setCanDownLoad(count > 0);
  }

  const handleChangeProject: ChangeEventHandler<HTMLSelectElement> = ({ currentTarget }) => {
    location.href = `/d/project/export/${currentTarget.value}`;
  }

  const handleDownload = async () => {
    const search = getQuery(selection);
    const recordList: RecordQuery[] = await (await (await fetch(`/d/project/export/query/record?${search}`)).json());
    let colMaxWidth = [
      12, 16, 13, 13, 40, 6, 4, 9, 0, 0, 6, 9, 10, 11, 14, 80
    ];
    let lastWaterId = '';
    const sheetData = recordList.map(record => {
      const s = lastWaterId === record.meter.waterId ? { font: { color: { rgb: "CCCCCC" } } }: {}
      const data: {[key: string]: any} = ({
        標案: {v: record.meter.project.name, s},
        小區: {v: record.meter.area, s},
        水號: {v: record.meter.waterId, s},
        錶號: {v: record.meter.meterId, s},
        地址: {v: record.meter.address, s},
        供水: {v: Suppy[record.meter.suppy as keyof typeof Suppy], s},
        口徑: {v: Caliber[record.meter.meterId.replace(/[0-9]/g, '') as keyof typeof Caliber], s},
        錶種: {v: Type[record.meter.type as keyof typeof Type], s},
        錶位: {v: record.meter.location, s},
        備註: {v: record.meter.note, s},
        狀態: {v: StatusMap[record.status], s},
        內容: {v: record.status === Status.success ? record.content: NotRecordReasonMap[record.content as keyof typeof NotRecordReasonMap], s},
        工程師: {v: record.user.fullname, s},
        日期: {v: format(+ new Date(record.createdAt), 'yyyy/MM/dd'), s},
        時間: {v: format(+ new Date(record.createdAt), 'HH:mm:ss'), s},
        照片: {v: record.picture ? `${DOMAIN}/record${record.picture}`: '', s},
      });
      lastWaterId = record.meter.waterId;
      return data;
    });
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    
    worksheet["!cols"] = colMaxWidth.map(width => ({width}));
    
    // const count = await (await (await fetch(`/d/project/export/query/count?${search}`)).json());
    // const worksheet = XLSX.utils.json_to_sheet([
    //   {a: 1, b: 2, c: 3},
    //   {a: 4, b: 5, c: 6},
    // ]);
    const workbook = XLSX.utils.book_new();

// STEP 2: Create data rows and styles
let row = [
	{ v: "Courier: 24", t: "s", s: { font: { name: "Courier", sz: 24 } } },
	{ v: "bold & color", t: "s", s: { font: { bold: true, color: { rgb: "FF0000" } } } },
	{ v: "fill: color", t: "s", s: { fill: { fgColor: { rgb: "E9E9E9" } } } },
	{ v: "line\nbreak", t: "s", s: { alignment: { wrapText: true } } },
];

// STEP 3: Create worksheet with rows; Add worksheet to workbook
const ws = XLSX.utils.aoa_to_sheet([row]);

    XLSX.utils.book_append_sheet(workbook, worksheet, "record");
    // console.log(sheetData);
    
    XLSX.writeFile(workbook, "records.xlsx");
  }

  return (
    <div className="Page ProjectExportPage">
      <div className="block">
        <div className="header">
          <h2 className="title">標案匯出頁</h2>
        </div>
        <div className="wrap">
          <div className="df gap10">
            <select className="input fx1 f1r" name="projectId" onChange={handleChangeProject} defaultValue={params.projectId}>
              {projectListItems.map(project =>
                <option key={project.id} value={project.id}>{project.name}</option>
              )}
            </select>
            <select className="input fx1 f1r" name="area" ref={selectDOM}>
              {areaListItems.map(({ area, _count }) =>
                <option key={area} value={area}>{area}({_count.area})</option>
              )}
            </select>
          </div>
          <div className="mt10 mb10">
            <DateRangePicker
              className="dateRanger input wp100"
              locale={zhTW}
              ranges={[selection]}
              onChange={handleSelect}
            />
          </div>
          <div className="tac">
            <button className="btn primary wp100 f1.5r" disabled={!canDownLoad} onClick={handleDownload}>
              下載報告 (Excel) {Boolean(count) && `(${count})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default projectExportPage