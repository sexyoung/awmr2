import { ActionFunction, json } from "@remix-run/node";
import * as api from "~/api/meter";

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  switch (form.get('_method')) {
    // case 'create': return verb.create(form);
    case 'toggle': return verb.toggle(form);
    case 'update': return verb.update(form);
    // case 'remove': return verb.remove(form);
  }
  return json(null);
}

const verb = {
  toggle: async (form: FormData): Promise<Response> => {
    const id = +form.get('id')!;
    const isActive = !form.get('isActive');
    await api.toggle({id, isActive});
    return json(true);
  },

  update: async (form: FormData): Promise<Response> => {
    const id = +form.get('id')!;
    const data = {
      projectId: +form.get('projectId')!,
      waterId: form.get('waterId'),
      meterId: form.get('meterId'),
      area: form.get('area'),
      address: form.get('address'),
      type: +form.get('type')!,
      suppy: +form.get('suppy')!,
      location: form.get('location'),
      note: form.get('note'),
    }
    try {
      await api.update({id, data});
      return json(true);
    } catch (e) {
      return json(e, 500);
    }
  }
}