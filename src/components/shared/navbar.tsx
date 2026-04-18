"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, LayoutDashboard, Users, Plus } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { db, auth } from "@/lib/firebase/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getInitials } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string; avatar_url?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDoc = await getDoc(doc(db, "users", authUser.uid));
        const profile = userDoc.data();
        setUser({
          id: authUser.uid,
          email: authUser.email || "",
          full_name: profile?.full_name || authUser.displayName || "",
          avatar_url: profile?.avatar_url || authUser.photoURL || "",
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    window.location.href = "/";
  };

  const navLinks = [
    { href: "/community/browse", label: "Communities", icon: Users },
    { href: "/community/create", label: "Create", icon: Plus },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const isLanding = pathname === "/";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isLanding ? "glass" : "bg-card/90 backdrop-blur-xl border-b border-border"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-scoop to-scoop-light flex items-center justify-center shadow-lg group-hover:shadow-scoop/30 transition-shadow">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg text-foreground">
              Shared<span className="text-primary">Scoop</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-scoop to-scoop-light flex items-center justify-center text-white font-semibold text-xs cursor-pointer hover:shadow-lg hover:shadow-scoop/20 transition-all"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(user.full_name || user.email)
                  )}
                </button>
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 glass-card rounded-xl overflow-hidden shadow-xl"
                    >
                      <div className="p-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.full_name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="p-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors w-full cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="px-4 py-2 bg-gradient-to-r from-scoop to-scoop-light text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-scoop/30 transition-all duration-200"
              >
                Get Started
              </Link>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors cursor-pointer"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-border bg-card/95 backdrop-blur-xl"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
