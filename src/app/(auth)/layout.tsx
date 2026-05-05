export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-xl">HR</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HR OS</h1>
          <p className="text-gray-500 text-sm mt-1">ISO-Ready HR Operating System</p>
        </div>
        {children}
      </div>
    </div>
  );
}
