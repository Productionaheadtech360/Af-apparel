import { Header } from "@/components/layout/Header";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
