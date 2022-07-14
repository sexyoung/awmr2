import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { query, AreaData } from "~/api/area";
import { isAdmin } from "~/api/user";

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  return json(await query());
};

const AreaPage = () => {
  const areaListItems = useLoaderData<AreaData>();
  
  return (
    <div>
      <h2>小區頁</h2>
      {areaListItems.map(area =>
        <div key={area.area}>
          專案: {area.projectName} /
          小區: {area.area} /
          登記: {area.success} /
          未登: {area.notRecord} /
          錶數: {area.total}
        </div>
      )}
    </div>
  )
}

export default AreaPage;
