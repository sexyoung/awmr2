import { json } from "@remix-run/node";
import type { ActionFunction, LinksFunction } from "@remix-run/node";

import { useActionData, useSearchParams, Link } from "@remix-run/react";

import { db } from "~/utils/db.server";
import { createUserSession, login, register } from "~/api/user";

type ActionData = {
  formError?: string;
  fieldErrors?: {
    name: string | undefined;
    password: string | undefined;
  };
  fields?: {
    // loginType: string;
    name: string;
    password: string;
  };
};

function validateName(username: unknown) {
  if (typeof username !== "string" || username.length < 3) {
    return `Usernames must be at least 3 characters long`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
}

function validateUrl(url: any) {
  let urls = ["/jokes", "/", "https://remix.run"];
  if (urls.includes(url)) {
    return url;
  }
  return "/jokes";
}

const badRequest = (data: ActionData) =>
  json(data, { status: 400 });

export const action: ActionFunction = async ({
  request,
}) => {
  const form = await request.formData();
  // const loginType = form.get("loginType");
  const name = form.get("name");
  const password = form.get("password");
  const redirectTo = validateUrl(
    form.get("redirectTo") || "/jokes"
  );
  if (
    // typeof loginType !== "string" ||
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
    name: validateName(name),
    password: validatePassword(password),
  };
  if (Object.values(fieldErrors).some(Boolean))
    return badRequest({ fieldErrors, fields });

  switch (loginType) {
    case "login": {
      const user = await login({ username, password });
      if (!user) {
        return badRequest({
          fields,
          formError: `Username/Password combination is incorrect`,
        });
      }
      return createUserSession(user.id, redirectTo);
    }
    case "register": {
      const userExists = await db.user.findFirst({
        where: { username },
      });
      if (userExists) {
        return badRequest({
          fields,
          formError: `User with username ${username} already exists`,
        });
      }
      const user = await register({ username, password });
      if (!user) {
        return badRequest({
          fields,
          formError: `Something went wrong trying to create a new user.`,
        });
      }
      return createUserSession(user.id, redirectTo);
    }
    default: {
      return badRequest({
        fields,
        formError: `Login type invalid`,
      });
    }
  }
};

const NewUserPage = () => {
  console.log('newPage');
  const [searchParams] = useSearchParams();
  const actionData = useActionData<ActionData>();
  return (
    <div>
      <h2>NewUserPage</h2>
      <form method="post">
          <input
            type="hidden"
            name="redirectTo"
            value={searchParams.get("redirectTo") ?? undefined}
          />

          <input type="text" id="name-input" name="name" />
          <input id="password-input" name="password" defaultValue={actionData?.fields?.password} type="password" />
          <button type="submit" className="button">
            Submit
          </button>
      </form>
    </div>
  )
}

export default NewUserPage;