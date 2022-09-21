import { ActionFunction, unstable_parseMultipartFormData } from "@remix-run/node";
import { formatYmd } from "~/utils/time";
import { uploadHandlerFun } from "~/utils/upload";

export const action: ActionFunction = async ({ request }) => {
  const url = new URL(request.url)
  const waterId = url.searchParams.get('waterId')!;
  const meterId = url.searchParams.get('meterId')!;

  const fileName = `${waterId}-${meterId}`;
  const [Y, M, D] = formatYmd().split('/');
  const uploadHandler = uploadHandlerFun(
    `./public/record/${Y}-${M}/${D}`,
    fileName
  );
  await unstable_parseMultipartFormData(request, uploadHandler);
  return true; // `/record/${Y}-${M}/${D}/${fileName}.png`;
};