import { z } from "zod";
export const normalizePhone = (value: string) =>
  value.replace(/\D/g, "").replace(/^880/, "0");
export const checkoutSchema = z
  .object({
    idempotency_key: z.uuid(),
    name: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .transform(normalizePhone)
      .pipe(
        z
          .string()
          .regex(/^01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number."),
      ),
    address: z.string().trim().min(8).max(600),
    area: z.enum(["inside_dhaka", "outside_dhaka"]),
    payment: z.enum(["cod", "bkash", "nagad"]),
    transaction_ref: z.string().max(100).optional(),
    note: z.string().max(600).optional(),
    items: z
      .array(
        z.object({ id: z.uuid(), quantity: z.number().int().min(1).max(999) }),
      )
      .min(1)
      .max(50),
  })
  .refine(
    (x) => x.payment === "cod" || !!x.transaction_ref?.trim(),
    "A transaction reference is required.",
  );
