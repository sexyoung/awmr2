import { ActionFunction, json } from "@remix-run/node";
import { db } from "~/utils/db.server";

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  switch (form.get('_method')) {
    case 'attach': return verb.attach(form);
    // case 'coordinate': return verb.coordinate();
  }
  return json(null);
}

const verb = {
  attach: async (form: FormData): Promise<Response> => {
    const userId = +form.get('userId')!;
    const projectId = +form.get('projectId')!;
    const data = { userId, projectId }

    const pou = await db.projectsOnUsers.findFirst({
      where: data
    });

    if(!pou) {
      await db.projectsOnUsers.create({ data });
    } else {
      await db.projectsOnUsers.deleteMany({ where: data });
    }
    return json(true);
  }
}