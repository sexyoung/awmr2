import { ActionFunction, json } from "@remix-run/node";
import * as api from "~/api/record";
import { Status } from "~/consts/reocrd";
import { requireUserId } from "~/api/user";

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const userId = await requireUserId(request);
  await api.create({
    userId,
    meterId: +form.get('meterId')!,
    status: form.get('_method') as Status,
    content: form.get('content') as string,
  });
  return json(true);
}
