import { AuthProvider } from '@/components/auth/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-white">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r md:flex md:flex-col">
          <Sidebar />
        </aside>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          <Header />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10">
            <div className="mx-auto max-w-3xl">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </AuthProvider>
  );
}
