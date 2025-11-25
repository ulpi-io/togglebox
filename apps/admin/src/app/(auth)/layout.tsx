export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">ToggleBox</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Remote Config & Feature Flags
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
