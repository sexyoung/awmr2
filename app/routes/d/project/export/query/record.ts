import {
  json,
  LoaderFunction,
} from "@remix-run/node";
import { whereCase } from "./util";
import { db } from "~/utils/db.server";

// 或是，你直接網址打這個，會執行這個（導頁但不登出）
export const loader: LoaderFunction = async ({ request }) => {
  const where = await whereCase(request);
  const recordList = await db.record.findMany({
    where,
    include: {
      user: true,
      meter: {
        include: {
          project: true
        }
      },
    }
  });
  return json(recordList);
};