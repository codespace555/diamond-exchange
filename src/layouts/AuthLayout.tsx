export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent-gold/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-gold to-orange-500 rounded-xl flex items-center justify-center font-display font-bold text-black">
              D
            </div>
            <span className="font-display text-3xl font-bold gradient-text">DIAMOND</span>
          </div>
          <p className="text-text-muted text-sm">Sports Betting & Casino Exchange Platform</p>
        </div>

        <div className="card p-6 shadow-2xl border-bg-border">
          {children}
        </div>

        <p className="text-center text-text-muted text-xs mt-4">
          © 2025 Diamond Exchange. All rights reserved.
        </p>
      </div>
    </div>
  )
}
