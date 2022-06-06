import { json, redirect } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";

import { useActionData, useSearchParams } from "@remix-run/react";

import { Role } from "~/consts/role";
import { db } from "~/utils/db.server";
import { register } from "~/api/user";

type ActionData = {
  formError?: string;
  fieldErrors?: {
    name: string | undefined;
    password: string | undefined;
  };
  fields?: {
    name: string;
    password: string;
  };
};

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

const badRequest = (data: ActionData) =>
  json(data, { status: 400 });

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
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }

  const fields = { name, password };
  const fieldErrors = {
    name: validateName(name),
    password: validatePassword(password),
  };
  if (Object.values(fieldErrors).some(Boolean))
    return badRequest({ fieldErrors, fields });

  const userExists = await db.user.findFirst({ where: { name }});
  if (userExists) {
    return badRequest({
      fields,
      formError: `User with name ${name} already exists`,
    });
  }
  const user = await register({ name, password, title });
  if (!user) {
    return badRequest({
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
      <form method="post">
          <input type="hidden" name="redirectTo" value={searchParams.get("redirectTo") ?? undefined} />
          <input type="text" id="name-input" name="name" />
          {actionData?.fieldErrors?.name && <p>{actionData.fieldErrors.name}</p>}
          <input id="password-input" name="password" defaultValue={actionData?.fields?.password} type="password" />
          {actionData?.fieldErrors?.password && <p>{actionData.fieldErrors.name}</p>}
          <select name="title" id="title">
            {Object.values(Role).map(role =>
              <option key={role}>{role}</option>
            )}
          </select>
          <div id="form-error-message">
            {actionData?.formError && <p>{actionData.formError}</p>}
          </div>
          <button type="submit" className="button">Submit</button>
      </form>
    </div>
  )
}

export default NewUserPage;