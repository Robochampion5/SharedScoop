"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, getDoc, doc, updateDoc, orderBy } from "firebase/firestore";
import { StatsCard } from "@/components/shared/stats-card";
import { DashboardSkeleton } from "@/components/shared/skeleton-loader";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductCard } from "@/components/shared/product-card";
import { formatPrice, generateOTP, getInitials } from "@/lib/utils";
import type { Community, Membership, User, Order, Product, Vendor } from "@/lib/types";
import {
  Users,
  ShieldCheck,
  Check,
  X,
  Package,
  Star,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Lock,
  Truck,
  Key,
} from "lucide-react";

const DEMO_PRODUCTS: Product[] = [
  {
    id: "demo-1",
    name: "Titan Nutrition Ultra Whey Isolate",
    description: "Premium chocolate fudge flavor, 25g protein per serving.",
    retail_price: 1800,
    wholesale_price: 1250,
    image_url: "/demo/whey.png",
    weight: "1kg",
    rating: 4.8
  },
  {
    id: "demo-2",
    name: "Natural Harvest Vegan Pea Protein",
    description: "Clean vanilla flavor, plant-based and gluten-free.",
    retail_price: 1650,
    wholesale_price: 1200,
    image_url: "/demo/vegan.png",
    weight: "1kg",
    rating: 4.7
  },
  {
    id: "demo-3",
    name: "Elite Micellar Casein",
    description: "Slow-release strawberry flavor, perfect for muscle growth.",
    retail_price: 1950,
    wholesale_price: 1350,
    image_url: "/demo/casein.png",
    weight: "1kg",
    rating: 4.9
  },
  {
    id: "demo-4",
    name: "Grit High-Calorie Mass Gainer",
    description: "Delicious cookies and cream flavor with real cookie bits.",
    retail_price: 1700,
    wholesale_price: 1300,
    image_url: "/demo/gainer.png",
    weight: "1kg",
    rating: 4.6
  }
];

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  const [pendingMembers, setPendingMembers] = useState<(Membership & { user: User })[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<(Order & { product: Product })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [generatedOtp, setGeneratedOtp] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "communities"),
          where("admin_id", "==", user.uid)
        );
        const adminSnap = await getDocs(q);
        const adminList = adminSnap.docs.map(d => ({ id: d.id, ...d.data() } as Community));
        
        if (adminList.length > 0) {
          setCommunities(adminList);
          setSelectedCommunity(adminList[0].id);
        }

        const vendorSnap = await getDocs(query(collection(db, "vendors"), orderBy("rating", "desc")));
        setVendors(vendorSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));

        const productSnap = await getDocs(collection(db, "products"));
        const productsList = productSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        setProducts([...DEMO_PRODUCTS, ...productsList]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedCommunity) return;
    const fetchCommunityData = async () => {
      try {
        const [memberSnap, orderSnap] = await Promise.all([
          getDocs(query(collection(db, "memberships"), where("community_id", "==", selectedCommunity), where("status", "==", "pending"))),
          getDocs(query(collection(db, "orders"), where("community_id", "==", selectedCommunity), orderBy("created_at", "desc")))
        ]);

        const membersList = await Promise.all(memberSnap.docs.map(async (d) => {
          const data = d.data();
          const userSnap = await getDoc(doc(db, "users", data.user_id));
          return { id: d.id, ...data, user: userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null } as any;
        }));

        const ordersList = await Promise.all(orderSnap.docs.map(async (d) => {
          const data = d.data();
          const prodSnap = await getDoc(doc(db, "products", data.product_id));
          return { id: d.id, ...data, product: prodSnap.exists() ? { id: prodSnap.id, ...prodSnap.data() } : null } as any;
        }));

        setPendingMembers(membersList);
        setOrders(ordersList);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCommunityData();
  }, [selectedCommunity]);

  const handleMembership = async (membershipId: string, status: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "memberships", membershipId), { status });
      setPendingMembers((prev) => prev.filter((m) => m.id !== membershipId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleOrderAction = async (orderId: string, action: string) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      if (action === "lock") {
        await updateDoc(orderRef, { status: "ordered" });
      } else if (action === "ship") {
        await updateDoc(orderRef, { status: "shipped" });
      } else if (action === "generate_otp") {
        const otp = generateOTP();
        setGeneratedOtp({ ...generatedOtp, [orderId]: otp });
        await updateDoc(orderRef, { delivery_otp: otp });
      } else if (action === "deliver") {
        await updateDoc(orderRef, { status: "delivered" });
      }

      const orderSnap = await getDocs(query(collection(db, "orders"), where("community_id", "==", selectedCommunity), orderBy("created_at", "desc")));
      const ordersList = await Promise.all(orderSnap.docs.map(async (d) => {
        const data = d.data();
        const prodSnap = await getDoc(doc(db, "products", data.product_id));
        return { id: d.id, ...data, product: prodSnap.exists() ? { id: prodSnap.id, ...prodSnap.data() } : null } as any;
      }));
      setOrders(ordersList);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <DashboardSkeleton />;

  if (communities.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No Communities to Manage"
        description="Create a community to access admin features."
        action={{
          label: "Create Community",
          onClick: () => (window.location.href = "/community/create"),
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your communities, members, and orders
          </p>
        </div>

        {communities.length > 1 && (
          <select
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            className="px-4 py-2 bg-secondary rounded-xl text-sm text-foreground border border-border focus:ring-2 focus:ring-primary/50 focus:outline-none"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Pending Approvals"
          value={pendingMembers.length}
          icon={Clock}
        />
        <StatsCard
          title="Active Orders"
          value={orders.filter((o) => o.status !== "delivered").length}
          icon={Package}
        />
        <StatsCard
          title="Total Orders"
          value={orders.length}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Pending Approvals
          </h2>
          {pendingMembers.length > 0 ? (
            <div className="space-y-3">
              {pendingMembers.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {m.user?.avatar_url ? (
                        <img
                          src={m.user.avatar_url}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(m.user?.full_name || m.user?.email || "?")
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {m.user?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMembership(m.id, "approved")}
                      className="w-8 h-8 rounded-lg bg-success/10 hover:bg-success/20 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-success" />
                    </button>
                    <button
                      onClick={() => handleMembership(m.id, "rejected")}
                      className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-success/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                All caught up! No pending approvals.
              </p>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Vendor Rolodex
          </h2>
          <div className="space-y-3">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">
                    {vendor.name}
                  </p>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 rounded-full">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {vendor.rating}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {vendor.contact_info.split("|").map((info, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i === 0 ? (
                        <Mail className="w-3 h-3" />
                      ) : (
                        <Phone className="w-3 h-3" />
                      )}
                      {info.trim()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Order Management
        </h2>
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => {
              const progress = Math.min(
                (order.total_kg_committed / order.total_kg_required) * 100,
                100
              );

              return (
                <div
                  key={order.id}
                  className="p-5 bg-secondary/50 rounded-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {order.product?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.product?.weight} •{" "}
                        {formatPrice(order.product?.wholesale_price || 0)}/unit
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === "delivered"
                          ? "bg-success/10 text-success"
                          : order.status === "shipped"
                          ? "bg-blue-500/10 text-blue-500"
                          : order.status === "ordered"
                          ? "bg-orange-500/10 text-orange-500"
                          : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>
                        Committed: {order.total_kg_committed}kg /{" "}
                        {order.total_kg_required}kg MOQ
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-3 bg-accent rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1 }}
                        className={`h-full rounded-full ${
                          progress >= 100
                            ? "bg-gradient-to-r from-success to-emerald-400"
                            : "bg-gradient-to-r from-scoop to-scoop-light"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.status === "pooling" && progress >= 100 && (
                      <button
                        onClick={() => handleOrderAction(order.id, "lock")}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Lock Order
                      </button>
                    )}
                    {order.status === "ordered" && (
                      <button
                        onClick={() => handleOrderAction(order.id, "ship")}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Mark Shipped
                      </button>
                    )}
                    {order.status === "shipped" && (
                      <>
                        <button
                          onClick={() =>
                            handleOrderAction(order.id, "generate_otp")
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <Key className="w-3.5 h-3.5" />
                          Generate OTP
                        </button>
                        <button
                          onClick={() =>
                            handleOrderAction(order.id, "deliver")
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-success text-white rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Mark Delivered
                        </button>
                      </>
                    )}
                    {generatedOtp[order.id] && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
                        <Key className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-mono font-bold text-foreground">
                          {generatedOtp[order.id]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="No Orders Yet"
            description="Create an order from your community page to get started."
          />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Protein Catalog
          </h2>
          <span className="text-xs text-muted-foreground">
            Products available for your communities
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
