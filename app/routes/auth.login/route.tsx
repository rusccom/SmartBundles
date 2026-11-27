import { POLARIS_URL } from "../../features/shell/polaris";
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
  const { errors } = useActionData<typeof action>() ?? loaderData;
  return (
    <>
      <script src={POLARIS_URL} />
      <s-page heading="Log in">
        <Form method="post">
          <s-section>
            <s-stack gap="base">
              <s-text-field name="shop" label="Shop domain" details="example.myshopify.com"
                autocomplete="on" error={errors.shop} required />
              <s-button variant="primary" type="submit">Log in</s-button>
            </s-stack>
          </s-section>
        </Form>
      </s-page>
    </>
  );
}
