import { requireAdmin } from "@/lib/db";
import ProductForm from "@/components/ProductForm";
import { notFound } from "next/navigation";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await requireAdmin();
  const [{ data: p }, { data: categories }] = await Promise.all([
    c.from("products").select("*").eq("id", id).single(),
    c.from("categories").select("*").order("display_order"),
  ]);
  if (!p) notFound();
  return (
    <>
      <h1>Edit {p.name}</h1>
      <ProductForm product={p} categories={categories || []} />
    </>
  );
}
