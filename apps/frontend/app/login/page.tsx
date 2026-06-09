'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import logo from "@/public/logo.png"
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login({ email, password }) as { token: string; user: any };
      localStorage.setItem('token', res.token);
      setAuth({ user: res.user, isAuthenticated: true });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('admin@samayak.in');
    setPassword('demo1234');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: `
        radial-gradient(1200px 600px at 85% -5%, #e9f3ff 0%, transparent 55%),
        radial-gradient(900px 500px at -10% 10%, #eaf2fd 0%, transparent 50%),
        #cfe1f5
      `,
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: 32 }} className="fade-up">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: 'white', borderRadius: 'var(--r-pill)',
            padding: '10px 18px 10px 10px',
            boxShadow: 'var(--sh-md)',
            border: '1px solid var(--line)',
            width:'200px', justifyContent: 'center', margin: '0 auto',
          }}>
            <Image src={logo} alt="Logo" width={28} height={28} style={{ borderRadius: 6 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                Samayak
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                by Anugat AI
              </div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="card fade-up fade-up-delay-1" style={{ padding: '32px 32px 28px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500, marginBottom: 28 }}>
            Sign in to the Admin Panel
          </p>

          {error && (
            <div style={{
              background: '#fdecee', color: '#b3303c',
              border: '1px solid #f9c8cc',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 13, fontWeight: 600, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                className="input"
                type="email"
                placeholder="admin@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', padding: 2,
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 22px', fontSize: 15, marginTop: 4 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <div className="fade-up fade-up-delay-2" style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>
            Don't have an account?{' '}
          </span>
          <Link href="/signup" style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-deep)', textDecoration: 'none' }}>
            Sign up
          </Link>
        </div>

        {/* Demo login */}
        <div
          className="fade-up fade-up-delay-2"
          style={{
            marginTop: 16,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '14px 20px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Demo Login
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>admin@samayak.in</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>demo1234</div>
            </div>
            <button
              className="btn-secondary"
              style={{ fontSize: 13, padding: '7px 14px' }}
              onClick={fillDemo}
            >
              Use Demo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}