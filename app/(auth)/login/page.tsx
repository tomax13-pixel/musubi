import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-xs">
        {/* Logo / Branding */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-foreground">結</h1>
          <p className="mt-2 text-sm text-muted-foreground">むすび</p>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-medium">ログイン</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              サークルの出欠・集金管理をかんたんに
            </p>
          </div>

          <GoogleSignInButton />
        </div>

        <p className="mt-10 text-center text-[11px] text-muted-foreground">
          ログインすることで、利用規約・プライバシーポリシーに同意します
        </p>
      </div>
    </main>
  );
}
