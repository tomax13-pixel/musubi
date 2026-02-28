import { Toaster } from '@/components/ui/sonner';

export default function InviteLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-white px-4">
            <div className="w-full max-w-sm">
                {children}
            </div>
            <Toaster />
        </div>
    );
}
