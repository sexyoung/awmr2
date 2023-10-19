import { ToChangeArea } from "@prisma/client";
import { ActionFunction, json } from "@remix-run/node";
import { changeArea, deleteChangeArea } from "~/api/area";
import { updateArea } from "~/api/meter";
import { requireUserId } from "~/api/user";
import { ActionDataGen } from "~/type/action.data";
import { db } from "~/utils/db.server";

type ActionData = ActionDataGen<ToChangeArea>

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const userId = await requireUserId(request);
  switch (form.get('_method')) {
    case 'create': return verb.create(form, userId);
    case 'change': return verb.change(form);
    case 'delete': return verb.delete(form);
  }
  return json(null);
}

const verb = {
  create: async (form: FormData, userId: number): Promise<Response> => {
    let fields: {[key: string]: string} = {}
  
    form.forEach((value, key) => {
      fields[key] = value as string;
    });

    await changeArea({
      projectId: +fields.projectId,
      fromArea: fields.fromArea,
      toArea: fields.toArea,
      userId: userId,
    });

    return json('OK');
  },
  change: async (form: FormData): Promise<Response> => {
    const id = +(form.get('id') || '') || 0;
    const toChangeArea = await db.toChangeArea.findUnique({where: {id}});
    await updateArea({
      fromArea: toChangeArea?.fromArea || '',
      toArea: toChangeArea?.toArea || '',
    });
    await deleteChangeArea(id);
    return json('OK');
  },
  delete: async (form: FormData): Promise<Response> => {
    const id = +(form.get('id') || '') || 0;
    await deleteChangeArea(id);
    return json('OK');
  }
}