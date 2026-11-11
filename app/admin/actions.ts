"use server";
import { db, configured, requireAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AdminAccessError, authenticationStage, diagnostic, type AuthStage } from '@/lib/auth-errors';
export async function login(form: FormData) {
  let failure: {stage: AuthStage; reference: string} | undefined;
  let client: Awaited<ReturnType<typeof db>> | undefined;
  try {
    if (!configured()) throw new AdminAccessError('configuration');
    client = await db(true);
    const {error} = await client.auth.signInWithPassword({
      email: String(form.get('email') || '').trim(),
      password: String(form.get('password') || ''),
    });
    if (error) {
      const stage = authenticationStage(error.code);
      failure = {stage, reference: diagnostic(stage, error)};
    } else {
      // Reuse the authenticated client; do not reconstruct the session from cookies here.
      await requireAdmin(client);
    }
  } catch (error) {
    const stage = error instanceof AdminAccessError ? error.stage : 'unavailable';
    failure = {stage, reference: diagnostic(stage, error)};
  }
  if (failure) {
    if (client) { try { await client.auth.signOut({scope:'local'}); } catch { /* Preserve original diagnostic. */ } }
    redirect(`/admin/login?error=${failure.stage}&reference=${failure.reference}`);
  }
  redirect("/admin/dashboard");
}
export async function logout() {
  const client = await db();
  await client.auth.signOut();
  redirect("/admin/login");
}
export async function saveProduct(form: FormData) {
  const client = await requireAdmin();
  const text = (k: string) => String(form.get(k) || "");
  const data = z
    .object({
      name: z.string().min(1).max(150),
      sku: z.string().min(1).max(80),
      category_id: z.number().int().min(1).max(4),
      price: z.number().nonnegative().max(10000000),
      sale_price: z.number().nonnegative().nullable(),
      stock: z.number().int().nonnegative().max(1000000),
      description: z.string().max(5000),
      material: z.string().max(200),
      color: z.string().max(200),
      dimensions: z.string().max(200),
      active: z.boolean(),
      featured: z.boolean(),
      is_new: z.boolean(),
      bestseller: z.boolean(),
      images: z.array(z.url()).max(12),
    })
    .refine(
      (p) => p.sale_price === null || p.sale_price < p.price,
      "Sale price must be lower than regular price.",
    )
    .parse({
      name: text("name"),
      sku: text("sku"),
      category_id: Number(text("category_id")),
      price: Number(text("price")),
      sale_price: text("sale_price") ? Number(text("sale_price")) : null,
      stock: Number(text("stock")),
      description: text("description"),
      material: text("material"),
      color: text("color"),
      dimensions: text("dimensions"),
      active: form.has("active"),
      featured: form.has("featured"),
      is_new: form.has("is_new"),
      bestseller: form.has("bestseller"),
      images: text("images")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  for (const file of form.getAll("uploads")) {
    if (!(file instanceof File) || !file.size) continue;
    if (
      file.size > 5242880 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw Error("Use JPEG, PNG or WebP under 5 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid =
      file.type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216
        : file.type === "image/png"
          ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78
          : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!valid) throw Error("Invalid image contents.");
    const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const { error } = await client.storage
      .from("products")
      .upload(path, file, { contentType: file.type });
    if (error) throw Error("Image upload failed");
    data.images.push(
      client.storage.from("products").getPublicUrl(path).data.publicUrl,
    );
  }
  if (data.images.length > 12) throw Error("Maximum 12 images.");
  const id = text("id");
  const { error } = id
    ? await client.from("products").update(data).eq("id", z.uuid().parse(id))
    : await client.from("products").insert(data);
  if (error) throw Error("Unable to save product. Check that SKU is unique.");
  revalidatePath("/");
  redirect("/admin/products");
}
export async function saveCategory(form: FormData) {
  const client = await requireAdmin();
  const data = z
    .object({
      name: z.string().trim().min(1).max(100),
      display_order: z.coerce.number().int().min(1).max(4),
    })
    .parse(Object.fromEntries(form));
  const { error } = await client
    .from("categories")
    .update(data)
    .eq("id", Number(form.get("id")));
  if (error) throw Error("Category update failed");
  revalidatePath("/");
  revalidatePath("/admin/categories");
}
export async function saveSettings(form: FormData) {
  const client = await requireAdmin();
  const keys = [
    "store_name",
    "store_description",
    "hero_headline",
    "hero_description",
    "hero_image",
    "logo",
    "announcement",
    "contact_phone",
    "whatsapp",
    "instagram",
    "facebook",
    "bkash",
    "nagad",
    "inside_dhaka",
    "outside_dhaka",
    "shipping_policy",
    "return_policy",
  ];
  const rows = keys.map((key) => {
    const value = z
      .string()
      .max(4000)
      .parse(form.get(key) || "");
    if (["inside_dhaka", "outside_dhaka"].includes(key))
      z.coerce.number().min(0).max(10000).parse(value);
    if (
      ["hero_image", "logo", "instagram", "facebook"].includes(key) &&
      value &&
      !/^https:\/\//.test(value)
    )
      throw Error("Image and social links must use HTTPS.");
    return { key, value };
  });
  const { error } = await client.from("settings").upsert(rows);
  if (error) throw Error("Settings update failed");
  revalidatePath("/");
  revalidatePath("/admin/settings");
}
export async function saveOrder(form: FormData) {
  const client = await requireAdmin();
  const { error } = await client.rpc("update_order", {
    oid: z.uuid().parse(form.get("id")),
    new_status: z
      .enum(["pending", "confirmed", "shipped", "delivered", "cancelled"])
      .parse(form.get("status")),
    new_payment: z
      .enum(["unverified", "paid", "refunded"])
      .parse(form.get("payment_status")),
    notes: z
      .string()
      .max(4000)
      .parse(form.get("admin_notes") || ""),
  });
  if (error)
    throw Error(
      "Update failed. Restoring a cancelled order requires available stock.",
    );
  revalidatePath("/admin/orders");
}
