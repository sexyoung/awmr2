import { LoaderFunction, MetaFunction, redirect } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";

import { Role } from "~/consts/role";
import { isAdmin, register } from "~/api/user";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request";
import type { ActionDataGen } from "~/type/action.data";
import { UserForm } from "./form";

type ActionData = ActionDataGen<{
  name: string;
  password: string;
}>

const TITLE = '新增人事';

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
  return null;
}

export const meta: MetaFunction = () => ({
  title: TITLE,
});

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();

  const newUserData = {
    name: form.get("name") as string,
    password: form.get("password") as string,
    fullname: form.get("fullname") as string,
    email: form.get("email") as string,
    phone: form.get("phone") as string,
    note: form.get("note") as string,
    title: form.get("title") as Role,
  }
  
  for (const key in newUserData) {
    if (Object.prototype.hasOwnProperty.call(newUserData, key)) {
      const element = newUserData[key as keyof typeof newUserData];
      if(!element) delete newUserData[key as keyof typeof newUserData];
    }
  }

  const redirectTo = form.get("redirectTo") || "/d/user";
  if (
    typeof newUserData.name !== "string" ||
    typeof newUserData.password !== "string" ||
    typeof newUserData.title !== "string" ||
    typeof redirectTo !== "string"
  ) {
    return badRequest<ActionData>({
      formError: `Form not submitted correctly.`,
    });
  }

  const fields = { name: newUserData.name, password: newUserData.password };
  const fieldErrors = {
    name: validateName(newUserData.name),
    password: validatePassword(newUserData.password),
  };
  if (Object.values(fieldErrors).some(Boolean))
    return badRequest<ActionData>({ fieldErrors, fields });

  const userExists = await db.user.findFirst({ where: { name: newUserData.name }});
  if (userExists) {
    return badRequest<ActionData>({
      fields,
      formError: `帳號 ${name} 已存在，請用別的`,
    });
  }
  const user = await register(newUserData);
  if (!user) {
    return badRequest<ActionData>({
      fields,
      formError: `Something went wrong trying to create a new user.`,
    });
  }
  return redirect(`/d/user?title=${newUserData.title}`);
};

const NewUserPage = () => {
  const [searchParams] = useSearchParams();
  const actionData = useActionData<ActionData>();
  return (
    <div className="Page UserNewPage">
      <div className="block">
        <div className="header">
          <h2 className="title">
            <Link to="/d/user">人事查詢</Link> &gt; {TITLE}
          </h2>
        </div>
        <div className="ph20">
          {actionData?.fieldErrors?.name && <p style={{color: '#f00'}}>{actionData.fieldErrors.name}</p>}
          {actionData?.fieldErrors?.password && <p style={{color: '#f00'}}>{actionData.fieldErrors.password}</p>}
          <p style={{color: '#f00'}}>
            {actionData?.formError && <p>{actionData.formError}</p>}
          </p>
          <Form method="post">
            <input type="hidden" name="redirectTo" value={searchParams.get("redirectTo") ?? undefined} />

            <div className="df gap10" style={{maxWidth: 650, margin: '10px auto'}}>
              <div className="df aic fx1 gap10">帳號 <input className="input fx1" type="text" name="name" required /></div>
            </div>
            <UserForm />
          </Form>
        </div>
      </div>
    </div>
  )
}

export default NewUserPage;