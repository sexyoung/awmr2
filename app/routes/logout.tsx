import type {
  ActionFunction,
  LoaderFunction,
} from "@remix-run/node";

import { logout } from "~/api/user";

// 從別的地方 submit 到此會執行這個
export const action: ActionFunction = async ({
  request,
}) => {
  return logout(request);
};

export const loader: LoaderFunction = async ({ request }) => {
  return logout(request);
};