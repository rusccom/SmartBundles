import { Form } from "react-router";

export function ShopLoginForm() {
  return <Form method="post" action="/auth/login">
    <s-stack gap="base">
      <s-text-field label="Shop domain" name="shop" placeholder="example.myshopify.com" required />
      <s-button variant="primary" type="submit">Log in</s-button>
    </s-stack>
  </Form>;
}
