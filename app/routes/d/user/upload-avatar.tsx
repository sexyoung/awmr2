import {
  ActionFunction,
  json,
  unstable_composeUploadHandlers,
  unstable_createFileUploadHandler,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { update } from "~/api/user";
import { db } from "~/utils/db.server";

// 或是，你直接網址打這個，會執行這個（導頁但不登出）
export const action: ActionFunction = async ({ request }) => {
  const uploadHandler = unstable_composeUploadHandlers(
    unstable_createFileUploadHandler({
      maxPartSize: 5_000_000,
      directory: './public/avatar',
      file: (f) =>
        `${Math.random().toString().slice(2)+Math.random().toString().slice(2)}.${f.contentType.split('/').pop()}`
      ,
    }),
    // parse everything else into memory
    unstable_createMemoryUploadHandler()
  );
  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler
  );
  const image = formData.get("image") as File;
  await update(+formData.get('id')!, { avatar: image.name });
  
  return image.name;
};