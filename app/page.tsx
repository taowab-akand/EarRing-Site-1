import { configured, db } from "@/lib/db";
import { defaults } from "@/lib/types";
import Store from "@/components/Store";
export const dynamic = "force-dynamic";
export default async function Page() {
  let products = [],
    categories = [
      { id: 1, name: "Stud Earrings", display_order: 1 },
      { id: 2, name: "Hoop Earrings", display_order: 2 },
      { id: 3, name: "Drop Earrings", display_order: 3 },
      { id: 4, name: "Jhumka Earrings", display_order: 4 },
    ],
    settings = { ...defaults };
  let notice = "";
  if (configured()) {
    const client = await db();
    const [p, c, s] = await Promise.all([
      client
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(500),
      client.from("categories").select("*").order("display_order"),
      client.from("settings").select("*"),
    ]);
    if (p.error || c.error || s.error)
      notice =
        "The collection is temporarily unavailable. Please try again shortly.";
    else {
      products = p.data;
      categories = c.data;
      settings = {
        ...settings,
        ...Object.fromEntries(s.data.map((x) => [x.key, x.value])),
      };
    }
  } else
    notice =
      "Store setup is in progress. Products and checkout will be available after Supabase is connected.";
  return (
    <Store
      products={products}
      categories={categories}
      settings={settings}
      notice={notice}
    />
  );
}
