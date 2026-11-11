import { saveProduct } from "@/app/admin/actions";
import { Category, Product } from "@/lib/types";
export default function ProductForm({
  product: p,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  return (
    <form action={saveProduct} className="form">
      <input type="hidden" name="id" value={p?.id || ""} />
      {(
        [
          "name",
          "sku",
          "description",
          "price",
          "sale_price",
          "stock",
          "material",
          "color",
          "dimensions",
        ] as const
      ).map((k) => (
        <label key={k}>
          {k.replaceAll("_", " ")}
          <input
            name={k}
            defaultValue={p?.[k] ?? ""}
            required={["name", "sku", "price", "stock"].includes(k)}
            type={
              ["price", "sale_price", "stock"].includes(k) ? "number" : "text"
            }
            min="0"
            step={k === "stock" ? "1" : "0.01"}
          />
        </label>
      ))}
      <label>
        Category
        <select name="category_id" defaultValue={p?.category_id}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {(["active", "featured", "is_new", "bestseller"] as const).map((k) => (
        <label key={k}>
          <input type="checkbox" name={k} defaultChecked={p?.[k] || false} />
          {k.replaceAll("_", " ")}
        </label>
      ))}
      <label>
        Images (one HTTPS URL per line; first is primary). Reorder lines to
        reorder images; remove lines to detach.
        <textarea name="images" defaultValue={p?.images.join("\n") || ""} />
      </label>
      <div className="thumbs">
        {p?.images.map((src) => (
          <img key={src} src={src} alt="Current product image" />
        ))}
      </div>
      <label>
        Upload additional images (JPEG, PNG, WebP; 5 MB each)
        <input
          type="file"
          name="uploads"
          accept="image/jpeg,image/png,image/webp"
          multiple
        />
      </label>
      <button className="primary">Save product</button>
    </form>
  );
}
