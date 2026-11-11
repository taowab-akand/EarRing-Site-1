import "./globals.css";
export const metadata = {
  title: "EarRing — Little details, beautiful moments",
  description:
    "Discover thoughtfully chosen stud, hoop, drop and jhumka earrings.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
