import test from "node:test";
import assert from "node:assert/strict";
import { checkoutSchema, normalizePhone } from "../lib/validation.ts";
const order = {
  idempotency_key: "d1000000-0000-4000-8000-000000000001",
  name: "Test Customer",
  phone: "01712345678",
  address: "House 12, Road 4, Dhaka",
  area: "inside_dhaka",
  payment: "cod",
  items: [{ id: "d1000000-0000-4000-8000-000000000002", quantity: 1 }],
};
test("Bangladesh phone variants match", () => {
  for (const phone of ["01712345678", "+8801712345678", "8801712345678"])
    assert.equal(normalizePhone(phone), "01712345678");
});
test("reject invalid phones and carts", () => {
  for (const patch of [
    { phone: "123" },
    { items: [] },
    { items: [{ ...order.items[0], quantity: -1 }] },
    { area: "elsewhere" },
  ])
    assert.equal(
      checkoutSchema.safeParse({ ...order, ...patch }).success,
      false,
    );
});
test("manual payment requires a reference", () => {
  assert.equal(
    checkoutSchema.safeParse({ ...order, payment: "bkash" }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({
      ...order,
      payment: "bkash",
      transaction_ref: "ABC123",
    }).success,
    true,
  );
});
test("strip client prices and totals", () => {
  const parsed = checkoutSchema.parse({
    ...order,
    total: 1,
    items: [{ ...order.items[0], price: 1 }],
  });
  assert.equal("total" in parsed, false);
  assert.equal("price" in parsed.items[0], false);
});
