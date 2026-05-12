import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-void">
      <Sidebar />
      <main className="md:ml-64 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
