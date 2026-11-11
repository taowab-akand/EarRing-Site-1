import { requireAdmin } from "@/lib/db";
import ProductForm from "@/components/ProductForm";
export default async function New() {
  const c = await requireAdmin();
  const { data } = await c
    .from("categories")
    .select("*")
    .order("display_order");
  return (
    <>
      <h1>Add a piece</h1>
      <ProductForm categories={data || []} />
    </>
  );
}
