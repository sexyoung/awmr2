import type {
  ActionFunction,
  LoaderFunction,
} from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { logout } from "~/api/user";

// 從別的地方 submit 到此會執行這個
export const action: ActionFunction = async ({
  request,
}) => {
  return logout(request);
};

// 或是，你直接網址打這個，會執行這個（導頁但不登出）
export const loader: LoaderFunction = async () => {
  return redirect("/");
};