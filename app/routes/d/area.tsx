import { format } from "date-fns";
import { json, LoaderFunction, MetaFunction } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { query, AreaData } from "~/api/area";
import { isAdmin } from "~/api/user";
import { Pagination } from "~/component/Pagination";
import RecordBar from "~/component/RecordBar";

const PAGE_SIZE = 30;
const TITLE = '小區查詢';

export const meta: MetaFunction = () => ({
  title: TITLE,
});

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  const url = new URL(request.url);
  const page = +url.searchParams.get("page")! || 1;
  const search = url.searchParams.get("search") || '';

  const where = search ? {
    OR: [
      {area: { contains: search }},
    ]
  }: {}

  const {
    count,
    data: areaListItems,
  } = await query({
    where,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return json({
    search,
    areaListItems,
    href: url.href,
    pageTotal: ~~((count && (count - 1)) / PAGE_SIZE) + 1,
  });
};

const AreaPage = () => {
  const { areaListItems, href, pageTotal, search } = useLoaderData<{
    href: string;
    search: string;
    pageTotal: number;
    areaListItems: AreaData;
  }>();
  
  return (
    <div className="Page AreaPage">
      <div className="block">
        <div className="header">
          <h2 className="title">{TITLE}</h2>
          {pageTotal > 1 && <Pagination {...{pageTotal, href}} />}
        </div>
        <div className="search-form">
          <Form method="get">
            <input type="text" name="search" defaultValue={search} placeholder="搜尋小區" />
          </Form>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{width: 170, boxSizing: 'border-box'}}>標案</th>
              <th style={{width: 180, boxSizing: 'border-box'}}>小區</th>
              <th>登錄</th>
              <th style={{width: 80, boxSizing: 'border-box'}}>抄見率</th>
              <th style={{width: 110, boxSizing: 'border-box'}}>進度</th>
              <th>錶數</th>
              <th style={{width: 130, boxSizing: 'border-box'}}>登錄時間</th>
            </tr>
          </thead>
          <tbody>
            {areaListItems.map((area, index) =>
              <tr key={area.area}>
                <td>{area.projectName}</td>
                <td>{area.area}</td>
                <td>{area.success}</td>
                <td className='color-mantis'>{~~((area.success || 0) / area.total * 100)}%</td>
                <td>
                  <RecordBar {...{
                    success: area.success,
                    notRecord: area.notRecord,
                    total: area.total,
                    z: areaListItems.length - index,
                  }} />
                </td>
                <td>{area.total}</td>
                <td>{
                  area.lastRecordTime ? format(new Date(area.lastRecordTime), 'MM-dd HH:mm'): '未登錄'
                }</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AreaPage;
