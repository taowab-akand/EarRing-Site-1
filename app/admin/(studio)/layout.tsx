import { requireAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { logout } from "../actions";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
  return (
    <main className="admin">
      <h2>
        EarRing <small>ADMIN STUDIO</small>
      </h2>
      <nav className="admin-nav">
        {[
          "dashboard",
          "products",
          "categories",
          "orders",
          "customers",
          "settings",
        ].map((k) => (
          <a key={k} href={`/admin/${k}`}>
            {k[0].toUpperCase() + k.slice(1)}
          </a>
        ))}
        <a href="/">View store ↗</a>
        <form action={logout}>
          <button>Logout</button>
        </form>
      </nav>
      {children}
    </main>
  );
}
