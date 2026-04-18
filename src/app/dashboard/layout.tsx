"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { db, auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

const userLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/community/browse", label: "Communities", icon: Users },
  { href: "/dashboard#orders", label: "My Orders", icon: Package },
];

const adminLinks = [
  { href: "/dashboard/admin", label: "Admin Panel", icon: ShieldCheck },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(
          collection(db, "communities"),
          where("admin_id", "==", user.uid),
          limit(1)
        );
        const snapshot = await getDocs(q);
        setIsAdmin(!snapshot.empty);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const allLinks = [...userLinks, ...(isAdmin ? adminLinks : [])];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.2 }}
        className="hidden md:flex flex-col border-r border-border bg-card/50 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-semibold text-foreground"
            >
              Navigation
            </motion.span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors cursor-pointer"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {allLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <link.icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {link.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>
      </motion.aside>

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
