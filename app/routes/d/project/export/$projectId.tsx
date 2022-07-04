import * as XLSX from "xlsx";
import { useState, ChangeEventHandler, useRef } from "react";
import { startOfDay, endOfDay, format } from 'date-fns';
import { useLoaderData, useParams } from "@remix-run/react";
import { LinksFunction, LoaderFunction } from "@remix-run/node";
import { DateRangePicker, RangeKeyDict, Range } from 'react-date-range';
import { zhTW } from "date-fns/locale";

import rdrStyle from 'react-date-range/dist/styles.css'; // main style file
import rdrTheme from 'react-date-range/dist/theme/default.css'; // theme css file
import { db } from "~/utils/db.server";
import { Meter, Project, Record, User } from "@prisma/client";
import { Caliber } from "~/consts/meter";

type LoaderData = {
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

const Status = {
  success: '正常',
  notRecord: '異常',
}

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: rdrStyle },
    { rel: "stylesheet", href: rdrTheme },
  ]
}

export const loader: LoaderFunction = async ({ params: { projectId = 0 } }) => {
  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });

  const areaListItems = await db.meter.groupBy({
    by: ['area'],
    _count: {
      area: true,
    },
    where: {
      projectId: +projectId,
    }
  });

  return {
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
  const { projectListItems, areaListItems } = useLoaderData<LoaderData>();

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

    const count = await (await (await fetch(`/d/project/export/query/count?${search}`)).json());
    setCanDownLoad(count > 0);
  }

  const handleChangeProject: ChangeEventHandler<HTMLSelectElement> = ({ currentTarget }) => {
    location.href = `/d/project/export/${currentTarget.value}`;
  }

  const handleDownload = async () => {
    const search = getQuery(selection);
    const recordList: RecordQuery[] = await (await (await fetch(`/d/project/export/query/record?${search}`)).json());
    const sheetData = recordList.map(record => ({
      標案: record.meter.project.name,
      小區: record.meter.area,
      水號: record.meter.waterId,
      錶號: record.meter.meterId,
      地址: record.meter.address,
      供水: Suppy[record.meter.suppy as keyof typeof Suppy],
      口徑: Caliber[record.meter.meterId[0] as keyof typeof Caliber],
      錶種: Type[record.meter.type as keyof typeof Type],
      錶位: record.meter.location,
      備註: record.meter.note,
      狀態: Status[record.status],
      內容: record.content,
      工程師: record.user.fullname,
      日期: new Date(record.createdAt).toLocaleString().split(' ')[0],
      時間: new Date(record.createdAt).toLocaleString().split(' ')[1],
    }))
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    
    // const count = await (await (await fetch(`/d/project/export/query/count?${search}`)).json());
    // const worksheet = XLSX.utils.json_to_sheet([
    //   {a: 1, b: 2, c: 3},
    //   {a: 4, b: 5, c: 6},
    // ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "record");
    // console.log(sheetData);
    
    XLSX.writeFileXLSX(workbook, "records.xlsx");
  }

  return (
    <div>
      <h2>標案匯出頁</h2>
      <select name="projectId" onChange={handleChangeProject} defaultValue={params.projectId}>
        {projectListItems.map(project =>
          <option key={project.id} value={project.id}>{project.name}</option>
        )}
      </select><br />
      <select name="area" ref={selectDOM}>
        {areaListItems.map(({ area, _count }) =>
          <option key={area} value={area}>{area}({_count.area})</option>
        )}
      </select>
      <br />
      <DateRangePicker
        locale={zhTW}
        ranges={[selection]}
        onChange={handleSelect}
      />
      <button disabled={!canDownLoad} onClick={handleDownload}>download</button>
    </div>
  )
}

export default projectExportPage