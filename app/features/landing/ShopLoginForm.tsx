import { Form } from "react-router";
import styles from "./landing.module.css";

export function ShopLoginForm() {
  return <Form className={styles.form} method="post" action="/auth/login">
    <label className={styles.label}>
      <span>Shop domain</span>
      <input className={styles.input} type="text" name="shop" placeholder="example.myshopify.com" required />
    </label>
    <button className={styles.button} type="submit">Log in</button>
  </Form>;
}
