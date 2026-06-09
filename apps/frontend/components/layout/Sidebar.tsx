'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Building2, DoorOpen, BookOpen,
  Users, FileUp, LogOut,
} from 'lucide-react';
import logo from "@/public/logo.png"
import Image from 'next/image';

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/departments', label: 'Departments',     icon: Building2 },
  { href: '/rooms',       label: 'Rooms',           icon: DoorOpen },
  { href: '/courses',     label: 'Courses',         icon: BookOpen },
  { href: '/users',       label: 'Faculty & Users', icon: Users },
  { href: '/timetable',   label: 'PDF Ingestion',   icon: FileUp },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { auth, logout } = useAuth();

  return (
    <>
      <style>{`
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 14px;
          margin-bottom: 4px;
          font-weight: 500;
          font-size: 14.5px;
          color: #454a5c;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          position: relative;
        }
        .sidebar-link:hover {
          background: #f0f5fb;
          color: #232635;
        }
        .sidebar-link.active {
          background: linear-gradient(105deg, #256199 0%, #3DA1FF 100%);
          color: white;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(37,97,153,0.22);
        }
        .sidebar-link.active svg {
          opacity: 1;
        }
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 13px 16px;
          background: #0b0b0d;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          color: white;
          font-size: 14.5px;
          font-weight: 700;
          font-family: 'Figtree', sans-serif;
          transition: opacity 0.15s;
          letter-spacing: -0.01em;
        }
        .logout-btn:hover { opacity: 0.85; }
      `}</style>

      <aside style={{
        width: 248,
        height: '100vh',
        background: 'white',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{ padding: '22px 18px 18px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Image src={logo} alt="Logo" width={32} height={32} style={{ borderRadius: 8 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.02em', color: '#0b0b0d' }}>
                Anugat AI
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.04em' }}>
                Admin Panel
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-link${active ? ' active' : ''}`}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--line)', margin: '0 16px', flexShrink: 0 }} />

        {/* User + Logout */}
        <div style={{ padding: '14px 12px 18px', flexShrink: 0 }}>
          {auth.user && (
            <div style={{
              padding: '8px 12px 12px',
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                {auth.user.name || auth.user.email}
              </div>
              <span className="badge badge-blue" style={{ fontSize: 10 }}>
                {auth.user.role}
              </span>
            </div>
          )}
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}