'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import logo from "@/public/logo.png"
import Image from 'next/image';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.registerAdmin({ name, email, password, adminSecret });
      router.push('/login?registered=1');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
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

        {/* Logo */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <ShieldCheck size={20} style={{ color: 'var(--brand-blue)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
              Register Admin
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500, marginBottom: 28 }}>
            Requires the admin secret key to proceed.
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
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                Full Name
              </label>
              <input className="input" placeholder="e.g. Ashutosh Sharma"
                value={name} onChange={e => setName(e.target.value)} required autoFocus />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                Email
              </label>
              <input className="input" type="email" placeholder="admin@university.edu"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'}
                  placeholder="Min 6 characters" style={{ paddingRight: 40 }}
                  value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                Admin Secret
              </label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showSecret ? 'text' : 'password'}
                  placeholder="Secret key from .env"
                  style={{ paddingRight: 40 }}
                  value={adminSecret} onChange={e => setAdminSecret(e.target.value)} required />
                <button type="button" onClick={() => setShowSecret(v => !v)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                }}>
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>
                Set via <code style={{ fontFamily: 'monospace' }}>ADMIN_SECRET</code> in your backend <code style={{ fontFamily: 'monospace' }}>.env</code>
              </p>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 22px', fontSize: 15, marginTop: 4 }}>
              {loading ? 'Creating account…' : 'Create Admin Account'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        {/* Link to login */}
        <div className="fade-up fade-up-delay-2" style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>
            Already have an account?{' '}
          </span>
          <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-deep)', textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>

      </div>
    </div>
  );
}