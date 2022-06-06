import { ActionFunction, json, LinksFunction, LoaderFunction, MetaFunction, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useSearchParams } from "@remix-run/react"
import { createUserSession, getUser, login } from "~/api/user";
import stylesUrl from "~/style/login.css";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const meta: MetaFunction = () => {
  return {
    title: "登入",
    description: "登入小區抄錶系統",
  };
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  if(user) return redirect('/d');
  return '';
}

function validateUsername(name: unknown) {
  if (typeof name !== "string" || name.length < 3) {
    return `names must be at least 3 characters long`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
}

function validateUrl(url: any) {
  if (["/d", "/"].includes(url)) return url;
  return "/d";
}

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

const badRequest = (data: ActionData) =>
  json(data, { status: 400 });

export const action: ActionFunction = async ({
  request,
}) => {
  const form = await request.formData();
  const name = form.get("name");
  const password = form.get("password");
  const redirectTo = (
    form.get("redirectTo") || "/d"
  );
  if (
    typeof name !== "string" ||
    typeof password !== "string" ||
    typeof redirectTo !== "string"
  ) {
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }

  const fields = { name, password };
  const fieldErrors = {
    name: validateUsername(name),
    password: validatePassword(password),
  };
  if (Object.values(fieldErrors).some(Boolean)) return badRequest({ fieldErrors, fields });

    const user = await login({ name, password });
    if (!user) {
      return badRequest({
        fields,
        formError: `Username/Password combination is incorrect`,
      });
    }
    return createUserSession(user.id, redirectTo);
};

export default () => {
  const [searchParams] = useSearchParams();
  const actionData = useActionData<ActionData>();
  const { user } = useLoaderData();
  
  return (
    <div>
      <h2>LoginPage</h2>
      <Form method="post">
        <input
          type="hidden"
          name="redirectTo"
          value={searchParams.get("redirectTo") ?? undefined}
        />
        <input
          type="text"
          id="name-input"
          name="name"
          required
          defaultValue={actionData?.fields?.name}
          aria-invalid={Boolean(actionData?.fieldErrors?.name)}
          aria-errormessage={actionData?.fieldErrors?.name ? "name-error": undefined}
        />
        {actionData?.fieldErrors?.name && <p>{actionData.fieldErrors.name}</p>}

        <input
          id="password-input"
          name="password"
          defaultValue={actionData?.fields?.password}
          type="password"
          required
          aria-invalid={Boolean(actionData?.fieldErrors?.password) || undefined}
          aria-errormessage={actionData?.fieldErrors?.password ? "password-error" : undefined}
        />
        {actionData?.fieldErrors?.password && <p>{actionData.fieldErrors.password}</p>}

        <div id="form-error-message">
          {actionData?.formError && <p>{actionData.formError}</p>}
        </div>
        <button type="submit" className="button">
          Submit
        </button>
      </Form>
    </div>
  )
}
