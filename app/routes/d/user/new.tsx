import { LoaderFunction, redirect } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { Form, useActionData, useSearchParams } from "@remix-run/react";

import { Role } from "~/consts/role";
import { isAdmin, register } from "~/api/user";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request";
import type { ActionDataGen } from "~/type/action.data";

type ActionData = ActionDataGen<{
  name: string;
  password: string;
}>

function validateName(name: unknown) {
  if (typeof name !== "string" || name.length < 3) {
    return `names must be at least 3 characters long`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
}

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
}

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  
  const name = form.get("name");
  const password = form.get("password");
  const title = form.get("title") as Role;

  const redirectTo = form.get("redirectTo") || "/d/user";
  if (
    typeof name !== "string" ||
    typeof password !== "string" ||
    typeof title !== "string" ||
    typeof redirectTo !== "string"
  ) {
    return badRequest<ActionData>({
      formError: `Form not submitted correctly.`,
    });
  }

  const fields = { name, password };
  const fieldErrors = {
    name: validateName(name),
    password: validatePassword(password),
  };
  if (Object.values(fieldErrors).some(Boolean))
    return badRequest<ActionData>({ fieldErrors, fields });

  const userExists = await db.user.findFirst({ where: { name }});
  if (userExists) {
    return badRequest<ActionData>({
      fields,
      formError: `User with name ${name} already exists`,
    });
  }
  const user = await register({ name, password, title });
  if (!user) {
    return badRequest<ActionData>({
      fields,
      formError: `Something went wrong trying to create a new user.`,
    });
  }
  return redirect('/d/user');
};

const NewUserPage = () => {
  const [searchParams] = useSearchParams();
  const actionData = useActionData<ActionData>();
  return (
    <div>
      <h2>NewUserPage</h2>
      <Form method="post">
          <input type="hidden" name="redirectTo" value={searchParams.get("redirectTo") ?? undefined} />
          <input type="text" id="name-input" name="name" />
          {actionData?.fieldErrors?.name && <p>{actionData.fieldErrors.name}</p>}
          <input id="password-input" name="password" defaultValue={actionData?.fields?.password} type="password" />
          {actionData?.fieldErrors?.password && <p>{actionData.fieldErrors.password}</p>}
          <select name="title" id="title">
            {Object.values(Role).map(role =>
              <option key={role}>{role}</option>
            )}
          </select>
          <div id="form-error-message">
            {actionData?.formError && <p>{actionData.formError}</p>}
          </div>
          <button type="submit" className="button">Submit</button>
      </Form>
    </div>
  )
}

export default NewUserPage;