import { requireAdmin } from "@/lib/db";
import { defaults, money, Product } from "@/lib/types";
import { saveCategory, saveSettings, saveOrder } from "../../actions";
import { notFound } from "next/navigation";
export default async function Studio({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ q?: string; customer?: string; sort?: string }>;
}) {
  const { section } = await params;
  const query = await searchParams;
  const client = await requireAdmin();
  if (section === "products") {
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw Error("Unable to load products");
    return (
      <>
        <h1>Products</h1>
        <a className="primary" href="/admin/products/new">
          Add product
        </a>
        <table>
          <thead>
            <tr>
              <th>Product / SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Visibility</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data
              ?.filter(
                (p) =>
                  !query.q ||
                  `${p.name} ${p.sku}`
                    .toLowerCase()
                    .includes(query.q.toLowerCase()),
              )
              .map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    <small>{p.sku}</small>
                  </td>
                  <td>{money(p.sale_price ?? p.price)}</td>
                  <td>{p.stock}</td>
                  <td>{p.active ? "Active" : "Hidden / archived"}</td>
                  <td>
                    <a href={`/admin/products/${p.id}/edit`}>Edit</a>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </>
    );
  }
  if (section === "categories") {
    const { data } = await client.from("categories").select("*,products(id)");
    return (
      <>
        <h1>Collections</h1>
        {data?.map((c) => (
          <form action={saveCategory} className="admin-card form" key={c.id}>
            <input type="hidden" name="id" value={c.id} />
            <label>
              Name
              <input name="name" defaultValue={c.name} required />
            </label>
            <label>
              Display order
              <input
                name="display_order"
                type="number"
                min="1"
                max="4"
                defaultValue={c.display_order}
              />
            </label>
            <small>{c.products.length} products</small>
            <button>Save collection</button>
          </form>
        ))}
      </>
    );
  }
  if (section === "settings") {
    const { data } = await client.from("settings").select("*");
    const s = {
      ...defaults,
      ...Object.fromEntries((data || []).map((x) => [x.key, x.value])),
    };
    return (
      <>
        <h1>Store settings</h1>
        <form action={saveSettings} className="form">
          {[
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
          ].map((k) => (
            <label key={k}>
              {k.replaceAll("_", " ")}
              <textarea name={k} defaultValue={s[k] || ""} />
            </label>
          ))}
          <button className="primary">Save settings</button>
        </form>
      </>
    );
  }
  const { data: orders, error } = await client
    .from("orders")
    .select("*,order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw Error("Unable to load orders");
  if (section === "orders")
    return (
      <>
        <h1>Orders</h1>
        <form>
          <input
            name="q"
            placeholder="Reference, name or phone"
            defaultValue={query.q}
          />
          <button>Search</button>
        </form>
        {orders
          .filter(
            (o) =>
              !query.q ||
              `${o.reference} ${o.name} ${o.phone}`
                .toLowerCase()
                .includes(query.q.toLowerCase()),
          )
          .map((o) => (
            <details className="admin-card" key={o.id}>
              <summary>
                {o.reference} · {o.name} · {money(o.total)} · {o.status}
              </summary>
              <p>
                {o.phone} · {o.address} ·{" "}
                {new Date(o.created_at).toLocaleString()}
              </p>
              <p>
                {o.payment}: {o.payment_status} · Reference:{" "}
                {o.transaction_ref || "—"}
              </p>
              {o.order_items.map(
                (i: {
                  id: string;
                  name: string;
                  quantity: number;
                  unit_price: number;
                }) => (
                  <p key={i.id}>
                    {i.name} × {i.quantity} · {money(i.unit_price)} each
                  </p>
                ),
              )}
              <p>
                Subtotal {money(o.subtotal)} + delivery {money(o.delivery)} ={" "}
                {money(o.total)}
              </p>
              <p>Customer note: {o.note || "—"}</p>
              <a href={`/admin/customers?customer=${o.customer_id}`}>
                View customer history ↗
              </a>
              <form action={saveOrder} className="form">
                <input type="hidden" name="id" value={o.id} />
                <label>
                  Fulfillment
                  <select name="status" defaultValue={o.status}>
                    {[
                      "pending",
                      "confirmed",
                      "shipped",
                      "delivered",
                      "cancelled",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Payment verification
                  <select name="payment_status" defaultValue={o.payment_status}>
                    {["unverified", "paid", "refunded"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Internal notes
                  <textarea name="admin_notes" defaultValue={o.admin_notes} />
                </label>
                <button>Save order</button>
              </form>
            </details>
          ))}
        {!orders.length && <p>No orders yet.</p>}
      </>
    );
  if (section === "customers") {
    const { data: customers } = await client
      .from("customers")
      .select("*")
      .order("last_order_at", { ascending: false });
    const normalized = (query.q || "").replace(/\D/g, "").replace(/^880/, "0");
    return (
      <>
        <h1>Customers</h1>
        <form>
          <input
            name="q"
            placeholder="Search phone number"
            defaultValue={query.q}
          />
          <button>Search</button>
        </form>
        {customers
          ?.filter(
            (c) =>
              (!query.customer || c.id === query.customer) &&
              c.normalized_phone.includes(normalized),
          )
          .map((c) => {
            const history = orders.filter((o) => o.customer_id === c.id);
            const delivered = history.filter((o) => o.status === "delivered");
            const total = delivered
              .filter((o) => o.payment_status === "paid")
              .reduce((n, o) => n + Number(o.total), 0);
            return (
              <details
                className="admin-card"
                key={c.id}
                open={query.customer === c.id}
              >
                <summary>
                  {c.latest_name} · {c.normalized_phone} · {history.length}{" "}
                  orders {history.length > 1 ? "· Returning customer" : ""}
                </summary>
                <p>{c.latest_address}</p>
                <p>
                  First order: {c.first_order_at} · Latest: {c.last_order_at}
                </p>
                <p>
                  Delivered: {delivered.length} · Cancelled:{" "}
                  {history.filter((o) => o.status === "cancelled").length} ·
                  Completed spending: {money(total)}
                </p>
                {history.map((o) => (
                  <div key={o.id}>
                    <a href={`/admin/orders?q=${o.reference}`}>
                      {o.reference} ↗
                    </a>
                    <p>
                      {o.created_at} · {money(o.total)} · {o.status} ·{" "}
                      {o.payment} / {o.payment_status}
                    </p>
                    <p>{o.address}</p>
                    {o.order_items.map(
                      (i: { id: string; name: string; quantity: number }) => (
                        <small key={i.id}>
                          {i.name} × {i.quantity}
                        </small>
                      ),
                    )}
                  </div>
                ))}
              </details>
            );
          })}
      </>
    );
  }
  if (section === "dashboard") {
    const { data } = await client.from("products").select("*");
    const products = (data || []) as Product[];
    return (
      <>
        <h1>Your store, at a glance.</h1>
        <div className="grid">
          {[
            ["Total products", products.length],
            ["Active products", products.filter((p) => p.active).length],
            ["Out of stock", products.filter((p) => !p.stock).length],
            ["Total orders", orders.length],
            [
              "Pending orders",
              orders.filter((o) => o.status === "pending").length,
            ],
            [
              "Delivered orders",
              orders.filter((o) => o.status === "delivered").length,
            ],
          ].map(([label, n]) => (
            <div className="admin-card" key={label}>
              <p>{label}</p>
              <h2>{n}</h2>
            </div>
          ))}
        </div>
        <h2>Low stock</h2>
        {products
          .filter((p) => p.stock < 5)
          .map((p) => (
            <p key={p.id}>
              {p.name} — {p.stock} remaining
            </p>
          ))}
        <h2>Recent orders</h2>
        {orders.slice(0, 5).map((o) => (
          <p key={o.id}>
            <a href={`/admin/orders?q=${o.reference}`}>
              {o.reference} · {money(o.total)} · {o.status}
            </a>
          </p>
        ))}
      </>
    );
  }
  notFound();
}
