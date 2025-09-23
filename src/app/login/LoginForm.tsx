"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <img src="/logo-s.jpg" alt="Logo" className="mx-auto mb-4 w-20 h-20 object-contain" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">LOGIN</h1>
              <p className="text-gray-500">Welcome back to admin panel</p>
            </div>
            
            {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
            
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Username"
                  required
                />
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-medium disabled:opacity-50 hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
              >
                {loading ? "Signing in..." : "Login Now"}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Right Side - Purple Background with Glassmorphism */}
      <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-purple-600 to-purple-800">
        <div className="absolute inset-0 bg-purple-900/20"></div>
        <div className="relative z-10 flex items-center justify-center p-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="text-center text-white">
              <img src="/logo-s.jpg" alt="Logo" className="mx-auto mb-6 w-24 h-24 object-contain rounded" />
              <h2 className="text-2xl font-bold mb-4">Welcome to Hotel Admin</h2>
              <p className="text-purple-100">Manage your hotel operations efficiently with our comprehensive admin panel</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-4 text-white/80 text-sm">
          <p>@hoteladmin</p>
        </div>
        <div className="absolute bottom-4 right-4 text-white/80 text-sm">
          <p>admin@hotel.com</p>
        </div>
      </div>
    </div>
  );
}


