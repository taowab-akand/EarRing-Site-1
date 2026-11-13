"use client";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  ShoppingBag,
  Search,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { Category, Product, Settings, price, money } from "@/lib/types";
import Modal from "./Modal";
import SectionNav from "./SectionNav";
import {cartFeedback} from '@/lib/cart-feedback';
type Cart = Record<string, number>;
export default function Store({
  products,
  categories,
  settings: s,
  notice,
}: {
  products: Product[];
  categories: Category[];
  settings: Settings;
  notice: string;
}) {
  const [modal, M] = useState(""),
    [selected, P] = useState<Product | null>(null),
    [qty, Q] = useState(1),
    [photo, Photo] = useState(0),
    [cart, C] = useState<Cart>({}),
    [wish, W] = useState<string[]>([]),
    [ready, R] = useState(false),
    [search, S] = useState(""),
    [category, K] = useState(""),
    [sort, Sort] = useState("new"),
    [min, Min] = useState(""),
    [max, Max] = useState(""),
    [stock, Stock] = useState(false),
    [limit, L] = useState(12),
    [area, A] = useState("inside_dhaka"),
    [payment, Pay] = useState("cod"),
    [busy, B] = useState(false),
    [error, E] = useState(""),
    [reference, Ref] = useState("");
  const key = useRef("");
  const cartIcon = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("earring-cart") || "{}");
      const w = JSON.parse(localStorage.getItem("earring-wishlist") || "[]");
      C(
        Object.fromEntries(
          Object.entries(c).filter(
            ([id, n]) =>
              products.some((p) => p.id === id) &&
              Number.isInteger(n) &&
              Number(n) > 0,
          ),
        ) as Cart,
      );
      W(
        Array.isArray(w)
          ? w.filter((id) => products.some((p) => p.id === id))
          : [],
      );
    } catch {}
    R(true);
  }, [products]);
  useEffect(() => {
    if (ready) {
      localStorage.setItem("earring-cart", JSON.stringify(cart));
      localStorage.setItem("earring-wishlist", JSON.stringify(wish));
    }
  }, [cart, wish, ready]);
  const favorite = (id: string) =>
    W((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  const open = (p: Product) => {
    P(p);
    Q(1);
    Photo(0);
    M("product");
  };
  const add = (p: Product, n: number, source: HTMLButtonElement) => {
    const available = p.stock > (cart[p.id] || 0);
    if (available) C((c) => ({ ...c, [p.id]: Math.min(p.stock, (c[p.id] || 0) + n) }));
    cartFeedback(source, cartIcon.current, p.images[0], available);
  };
  const items = products.filter((p) => cart[p.id]);
  const subtotal = items.reduce((n, p) => n + price(p) * cart[p.id], 0);
  const delivery = Number(s[area] || 0);
  const matches = products
    .filter(
      (p) =>
        (!category || String(p.category_id) === category) &&
        `${p.name} ${p.sku} ${p.description}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!min || price(p) >= Number(min)) &&
        (!max || price(p) <= Number(max)) &&
        (!stock || p.stock > 0),
    )
    .sort((a, b) =>
      sort === "low"
        ? price(a) - price(b)
        : sort === "high"
          ? price(b) - price(a)
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : b.created_at.localeCompare(a.created_at),
    );
  const card = (p: Product, compact = false) => (
    <article className={`product ${compact ? "compact" : ""}`} key={p.id}>
      <div className="product-image">
        <button className="image-button" onClick={() => open(p)}>
          {p.images[0] ? (
            <img src={p.images[0]} alt={p.name} loading="lazy" />
          ) : (
            <span className="image-placeholder">◇</span>
          )}
        </button>
        <button
          className="heart"
          aria-label={`Save ${p.name}`}
          aria-pressed={wish.includes(p.id)}
          onClick={() => favorite(p.id)}
        >
          <Heart
            size={17}
            fill={wish.includes(p.id) ? "currentColor" : "none"}
          />
        </button>
        {(p.is_new || p.sale_price !== null) && (
          <span className="badge">
            {p.sale_price !== null ? "SALE" : "NEW"}
          </span>
        )}
        <button className="card-add" aria-label={`Add ${p.name} to cart`} disabled={!p.stock || (cart[p.id] || 0) >= p.stock} onClick={e => add(p, 1, e.currentTarget)}>+</button>
      </div>
      <button className="product-name" onClick={() => open(p)}>
        {p.name}
      </button>
      <p>
        {money(price(p))} {p.sale_price !== null && <del>{money(p.price)}</del>}{" "}
        {!p.stock && <small>Sold out</small>}
      </p>
    </article>
  );
  const checkout = () => {
    key.current = crypto.randomUUID();
    E("");
    M("checkout");
  };
  async function order(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    B(true);
    E("");
    try {
      const fields = Object.fromEntries(new FormData(e.currentTarget));
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          area,
          payment,
          idempotency_key: key.current,
          items: items.map((p) => ({ id: p.id, quantity: cart[p.id] })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Unable to place order.");
      Ref(data.reference);
      C({});
      M("success");
    } catch (err) {
      E((err as Error).message);
    } finally {
      B(false);
    }
  }
  return (
    <>
      <div className="announcement">{s.announcement}</div>
      <header>
        <a className="brand" href="#home">
          {s.store_name}
          <span>EVERYDAY BEAUTIFUL</span>
        </a>
        <SectionNav />
        <div className="nav-icons">
          <button
            aria-label="Search earrings"
            onClick={() => {
              document.getElementById("earrings")?.scrollIntoView();
              document.getElementById("search")?.focus();
            }}
          >
            <Search size={20} />
          </button>
          <button aria-label="Wishlist" onClick={() => M("wishlist")}>
            <Heart size={20} />
          </button>
          <button ref={cartIcon} aria-label="Shopping bag" onClick={() => M("cart")}>
            <ShoppingBag size={20} />
            <sup>{Object.values(cart).reduce((a, b) => a + b, 0)}</sup>
          </button>
        </div>
      </header>
      <main>
        <section id="home" className="hero">
          <div>
            <p className="eyebrow">SMALL DETAILS. ALL THE DIFFERENCE.</p>
            <h1>{s.hero_headline}</h1>
            <p className="hero-copy">{s.hero_description}</p>
            <a className="primary" href="#earrings">
              Explore Earrings <ArrowRight size={17} />
            </a>
            <p className="hero-note">A finishing touch that feels like you.</p>
          </div>
          <div className="hero-art">
            {s.hero_image ? (
              <img src={s.hero_image} alt="Our earring collection" />
            ) : (
              <>
                <div className="jewel jewel-one" />
                <div className="jewel jewel-two" />
                <span>THE EVERYDAY EDIT</span>
              </>
            )}
          </div>
        </section>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <section>
          <div className="section-title">
            <div>
              <p className="eyebrow">CHOSEN WITH CARE</p>
              <h2>A few favourites</h2>
            </div>
            <a href="#earrings">Discover the collection ↗</a>
          </div>
          <div className="grid">
            {products
              .filter((p) => p.featured)
              .slice(0, 4)
              .map((p) => card(p))}
          </div>
          {!products.some((p) => p.featured) && (
            <p className="empty">Our next favourites are on their way.</p>
          )}
        </section>
        <section id="earrings">
          <div className="section-title">
            <div>
              <p className="eyebrow">FIND YOUR FINISHING TOUCH</p>
              <h2>All Earrings</h2>
            </div>
            <span>{matches.length} pieces</span>
          </div>
          <div className="toolbar">
            <label className="search">
              <Search size={17} />
              <input
                id="search"
                placeholder="Search earrings or SKU"
                value={search}
                onChange={(e) => S(e.target.value)}
              />
            </label>
            <button onClick={() => M("filter")}>
              <SlidersHorizontal size={16} /> Filters
            </button>
            <select
              aria-label="Sort earrings"
              value={sort}
              onChange={(e) => Sort(e.target.value)}
            >
              <option value="new">Newest first</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
          <div className="chips">
            <button className={!category ? "active" : ""} onClick={() => K("")}>
              All earrings
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={category === String(c.id) ? "active" : ""}
                onClick={() => K(String(c.id))}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="grid">
            {matches.slice(0, limit).map((p) => card(p))}
          </div>
          {!matches.length && (
            <p className="empty">
              No earrings found. Try changing your search or filters.
            </p>
          )}
          {matches.length > limit && (
            <button onClick={() => L((n) => n + 12)}>Load more</button>
          )}
        </section>
        <section id="collections">
          <div className="section-title">
            <div>
              <p className="eyebrow">A STYLE FOR EVERY SIDE OF YOU</p>
              <h2>Explore the collections</h2>
            </div>
          </div>
          {categories.map((c) => (
            <Collection
              key={c.id}
              category={c}
              view={() => {
                K(String(c.id));
                document.getElementById("earrings")?.scrollIntoView();
              }}
            >
              {products
                .filter((p) => p.category_id === c.id)
                .map((p) => card(p, true))}
            </Collection>
          ))}
        </section>
      </main>
      <footer id="contact">
        <div>
          <h2>{s.store_name}</h2>
          <p>
            {s.store_description || "Little details, beautifully considered."}
          </p>
        </div>
        <div>
          <h3>Let’s stay in touch</h3>
          {s.contact_phone && (
            <a href={`tel:${s.contact_phone}`}>{s.contact_phone}</a>
          )}
          {["instagram", "facebook"].map(
            (k) =>
              s[k] && (
                <a key={k} href={s[k]} target="_blank" rel="noreferrer">
                  {k}
                </a>
              ),
          )}
          {s.whatsapp && (
            <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}>
              WhatsApp
            </a>
          )}
        </div>
        <div>
          <h3>The little details</h3>
          <button onClick={() => M("shipping_policy")}>
            Shipping & delivery
          </button>
          <button onClick={() => M("return_policy")}>
            Returns & exchanges
          </button>
          <a href="/admin/login">Admin Studio ↗</a>
        </div>
        <p className="copyright">
          © {new Date().getFullYear()} {s.store_name}. Made for your everyday.
        </p>
      </footer>
      {modal && (
        <Modal
          title={
            modal === "product"
              ? selected!.name
              : modal === "success"
                ? "Thank you for your order"
                : modal.replaceAll("_", " ")
          }
          close={() => M("")}
        >
          {modal === "filter" && (
            <div className="form">
              <label>
                Category
                <select value={category} onChange={(e) => K(e.target.value)}>
                  <option value="">All Earrings</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Minimum price
                <input
                  type="number"
                  min="0"
                  value={min}
                  onChange={(e) => Min(e.target.value)}
                />
              </label>
              <label>
                Maximum price
                <input
                  type="number"
                  min="0"
                  value={max}
                  onChange={(e) => Max(e.target.value)}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={stock}
                  onChange={(e) => Stock(e.target.checked)}
                />{" "}
                In stock only
              </label>
              <button
                onClick={() => {
                  K("");
                  Min("");
                  Max("");
                  Stock(false);
                  S("");
                  Sort("new");
                }}
              >
                Clear all filters
              </button>
              <button className="primary" onClick={() => M("")}>
                Show {matches.length} pieces
              </button>
            </div>
          )}
          {modal === "product" && selected && (
            <div className="detail">
              <div>
                {selected.images[photo] ? (
                  <img
                    className="detail-image"
                    src={selected.images[photo]}
                    alt={selected.name}
                  />
                ) : (
                  <div className="image-placeholder">◇</div>
                )}
                <div className="thumbs">
                  {selected.images.map((src, i) => (
                    <button
                      key={src}
                      onClick={() => Photo(i)}
                      aria-label={`Image ${i + 1}`}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow">
                  {categories.find((c) => c.id === selected.category_id)?.name}{" "}
                  · {selected.sku}
                </p>
                <h2>{money(price(selected))}</h2>
                <p>{selected.description}</p>
                <p>
                  {selected.material} · {selected.color} · {selected.dimensions}
                </p>
                <p>
                  {selected.stock ? `${selected.stock} available` : "Sold out"}
                </p>
                <label>
                  Quantity{" "}
                  <input
                    type="number"
                    min="1"
                    max={selected.stock || 1}
                    value={qty}
                    onChange={(e) =>
                      Q(
                        Math.max(
                          1,
                          Math.min(selected.stock, Number(e.target.value) || 1),
                        ),
                      )
                    }
                  />
                </label>
                <div className="actions">
                  <button
                    className="primary"
                    disabled={!selected.stock || (cart[selected.id] || 0) >= selected.stock}
                    onClick={e => add(selected, qty, e.currentTarget)}
                  >
                    Add to cart
                  </button>
                  <button onClick={() => favorite(selected.id)}>
                    {wish.includes(selected.id)
                      ? "Remove from wishlist"
                      : "Save to wishlist"}
                  </button>
                </div>
                <small>
                  Keep dry. Store separately and gently wipe after wear.
                  Delivery charges are shown at checkout.
                </small>
              </div>
            </div>
          )}
          {modal === "wishlist" && (
            <div className="grid">
              {products
                .filter((p) => wish.includes(p.id))
                .map((p) => (
                  <div key={p.id}>
                    {card(p)}
                  </div>
                ))}
              {!wish.length && <p>Your favourite pieces will live here.</p>}
            </div>
          )}
          {(modal === "cart" || modal === "checkout") && (
            <>
              <div>
                {items.map((p) => (
                  <div className="cart-row" key={p.id}>
                    <span>
                      {p.name}
                      <small>{money(price(p))} each</small>
                    </span>
                    <input
                      aria-label={`Quantity for ${p.name}`}
                      type="number"
                      min="1"
                      max={p.stock || 1}
                      value={cart[p.id]}
                      onChange={(e) =>
                        C({
                          ...cart,
                          [p.id]: Math.max(
                            1,
                            Math.min(p.stock, Number(e.target.value) || 1),
                          ),
                        })
                      }
                    />
                    <span>{money(price(p) * cart[p.id])}</span>
                    <button
                      aria-label={`Remove ${p.name}`}
                      onClick={() =>
                        C((c) => {
                          const copy = { ...c };
                          delete copy[p.id];
                          return copy;
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {!items.length ? (
                <p>Your bag is waiting for something lovely.</p>
              ) : (
                <>
                  <p className="total">
                    Subtotal <strong>{money(subtotal)}</strong>
                  </p>
                  {modal === "cart" ? (
                    <button className="primary" onClick={checkout}>
                      Continue to checkout →
                    </button>
                  ) : (
                    <form onSubmit={order} className="form">
                      <label>
                        Full name
                        <input name="name" required maxLength={120} />
                      </label>
                      <label>
                        Phone number
                        <input
                          name="phone"
                          type="tel"
                          required
                          placeholder="01712345678"
                        />
                      </label>
                      <label>
                        Delivery address
                        <textarea
                          name="address"
                          required
                          minLength={8}
                          maxLength={600}
                        />
                      </label>
                      <label>
                        Delivery area
                        <select
                          value={area}
                          onChange={(e) => A(e.target.value)}
                        >
                          <option value="inside_dhaka">Inside Dhaka</option>
                          <option value="outside_dhaka">Outside Dhaka</option>
                        </select>
                      </label>
                      <label>
                        Payment
                        <select
                          value={payment}
                          onChange={(e) => Pay(e.target.value)}
                        >
                          <option value="cod">Cash on delivery</option>
                          {s.bkash && (
                            <option value="bkash">Manual bKash</option>
                          )}
                          {s.nagad && (
                            <option value="nagad">Manual Nagad</option>
                          )}
                        </select>
                      </label>
                      {payment !== "cod" && (
                        <>
                          <p>
                            Send to {s[payment]}. Your payment remains
                            unverified until reviewed by the store.
                          </p>
                          <label>
                            Transaction reference
                            <input
                              name="transaction_ref"
                              required
                              maxLength={100}
                            />
                          </label>
                        </>
                      )}
                      <label>
                        Order note
                        <textarea name="note" maxLength={600} />
                      </label>
                      <p>
                        Delivery: {money(delivery)} · Total:{" "}
                        <strong>{money(subtotal + delivery)}</strong>
                      </p>
                      {error && <p role="alert">{error}</p>}
                      <button
                        className="primary"
                        disabled={busy || !items.length}
                      >
                        {busy ? "Placing order…" : "Place order"}
                      </button>
                    </form>
                  )}
                </>
              )}
            </>
          )}
          {modal === "success" && (
            <>
              <p>
                Your order reference is <strong>{reference}</strong>.
              </p>
              <p>
                We will contact you to confirm delivery. Manual payments are
                pending verification.
              </p>
            </>
          )}
          {["shipping_policy", "return_policy"].includes(modal) && (
            <p>{s[modal]}</p>
          )}
        </Modal>
      )}
    </>
  );
}
function Collection({
  category,
  children,
  view,
}: {
  category: Category;
  children: React.ReactNode;
  view: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [left, Left] = useState(false),
    [right, Right] = useState(false);
  useEffect(() => {
    const el = ref.current!;
    const update = () => {
      Left(el.scrollLeft > 2);
      Right(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    el.addEventListener("scroll", update);
    return () => {
      obs.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [children]);
  return (
    <div className="collection">
      <div className="collection-heading">
        <h3>{category.name}</h3>
        <button onClick={view}>View all ↗</button>
        <div>
          <button
            aria-label={`Scroll ${category.name} left`}
            disabled={!left}
            onClick={() =>
              ref.current?.scrollBy({ left: -350, behavior: "smooth" })
            }
          >
            ←
          </button>
          <button
            aria-label={`Scroll ${category.name} right`}
            disabled={!right}
            onClick={() =>
              ref.current?.scrollBy({ left: 350, behavior: "smooth" })
            }
          >
            →
          </button>
        </div>
      </div>
      <div className="rail" ref={ref}>
        {children}
        {!Array.isArray(children) || children.length ? null : (
          <p className="empty">New pieces coming soon.</p>
        )}
      </div>
    </div>
  );
}
