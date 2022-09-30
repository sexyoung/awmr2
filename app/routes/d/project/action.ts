import { ActionFunction, json } from "@remix-run/node";

import * as api from "~/api/project";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request";
import type { NewProjectForm } from "~/type/project";
import type { ActionDataGen } from "~/type/action.data";

type ActionData = ActionDataGen<NewProjectForm>

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  switch (form.get('_method')) {
    case 'create': return verb.create(form);
    case 'toggle': return verb.toggle(form);
    case 'remove': return verb.remove(form);
  }
  return json(null);
}

const verb = {
  create: async (form: FormData): Promise<Response> => {
    let fields: {[key: string]: string} = {}
  
    form.forEach((value, key) => {
      fields[key] = value as string;
    })
  
    if(fields.code) {
      const projectExists = await db.project.findFirst({ where: { code: fields.code }});
      if(projectExists) {
        return badRequest<ActionData>({
          fields: fields as NewProjectForm,
          formError: `標案代號 ${fields.code} 已存在，請用別的`,
        });
      }
    }
  
    const project = await api.create(fields as NewProjectForm);
    if (!project) {
      return badRequest<ActionData>({
        fields: fields as NewProjectForm,
        formError: `Something went wrong trying to create a new user.`,
      });
    }
    return json(project);
  },

  toggle: async (form: FormData): Promise<Response> => {
    const id = +form.get('id')!;
    const isActive = !form.get('isActive');
    await api.toggle({id, isActive});
    return json(true);
  },

  remove: async (form: FormData): Promise<Response> => {
    const id = +form.get('id')!;
    await api.remove({id});
    return json(true);
  },
}