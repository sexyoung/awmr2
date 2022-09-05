import bcrypt from "bcryptjs";
import { ActionFunction, json } from "@remix-run/node";
import { db } from "~/utils/db.server";
import * as api from "~/api/user";
import { Role } from "~/consts/role";

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  switch (form.get('_method')) {
    case 'update': return verb.update(form);
    case 'attach': return verb.attach(form);
    case 'toggle': return verb.toggle(form);
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
    return json({type: 'UPDATED', ts: +new Date()});
  },
  update: async (form: FormData): Promise<Response> => {
    const id = +form.get('id')!;
    const user = await db.user.findFirst({ where: { id }});

    if(!user) return json({type: 'NO_USER', ts: +new Date()});

    const data: {
      password?: string;
      fullname: string;
      title: string;
      email: string;
      phone: string;
      note: string;
      isDailyLink: boolean;
    } = {
      fullname: form.get('fullname') as string,
      title: form.get('title') as Role,
      email: form.get('email') as string,
      phone: form.get('phone') as string,
      note: form.get('note') as string,
      isDailyLink: !!form.get('isDailyLink'),
    }

    if(form.get('password')) {
      data.password = await bcrypt.hash(form.get('password') as string, 10);
    }

    api.update(id, data);
    
    return json({type: 'UPDATED', ts: +new Date()});
  },
  toggle: async (form: FormData): Promise<Response> => {
    const id = +form.get('id')!;
    const isActive = !form.get('isActive');
    
    await api.toggle({id, isActive});
    return json(true);
  },
}