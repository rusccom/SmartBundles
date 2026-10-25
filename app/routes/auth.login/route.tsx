import { POLARIS_URL } from "../../features/shell/polaris";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <>
      <script src={POLARIS_URL} />
      <s-page heading="Log in">
        <Form method="post">
          <s-section heading="Log in">
            <s-text-field name="shop" label="Shop domain" details="example.myshopify.com" value={shop}
              onChange={(event) => setShop(event.currentTarget.value)} autocomplete="on" error={errors.shop} />
            <s-button type="submit">Log in</s-button>
          </s-section>
        </Form>
      </s-page>
    </>
  );
}
