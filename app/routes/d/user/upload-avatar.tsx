import {
  ActionFunction,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { update } from "~/api/user";
import { uploadHandlerFun } from "~/utils/upload";

export const action: ActionFunction = async ({ request }) => {
  const uploadHandler = uploadHandlerFun('./public/avatar', `${Math.random().toString().slice(2)+Math.random().toString().slice(2)}`);
  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler
  );
  const image = formData.get("image") as File;
  await update(+formData.get('id')!, { avatar: image.name });
  
  return image.name;
};