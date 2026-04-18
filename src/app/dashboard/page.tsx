"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, getDoc, doc, orderBy, limit } from "firebase/firestore";
import { StatsCard } from "@/components/shared/stats-card";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/skeleton-loader";
import { formatPrice, calculateSavings } from "@/lib/utils";
import type { Contribution, Community, Membership, Product, Order } from "@/lib/types";
import {
  IndianRupee,
  Package,
  Users,
  TrendingDown,
  ExternalLink,
  MessageCircle,
  CheckCircle,
  Clock,
  Truck,
  ShoppingBag,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [contributions, setContributions] = useState<(Contribution & { order: Order & { product: Product } })[]>([]);
  const [communities, setCommunities] = useState<(Membership & { community: Community })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeOrders, setActiveOrders] = useState<(Order & { product: Product; community: Community })[]>([]);
  const [showOtp, setShowOtp] = useState<Record<string, boolean>>({});
  const [otpInput, setOtpInput] = useState<Record<string, string>>({});
  const [otpVerified, setOtpVerified] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const [contribSnap, memberSnap, productsSnap, ordersSnap] = await Promise.all([
          getDocs(query(collection(db, "contributions"), where("user_id", "==", user.uid), orderBy("created_at", "desc"))),
          getDocs(query(collection(db, "memberships"), where("user_id", "==", user.uid), where("status", "==", "approved"))),
          getDocs(query(collection(db, "products"), limit(8))),
          getDocs(query(collection(db, "orders"), where("status", "in", ["pooling", "ordered", "shipped"]), orderBy("created_at", "desc"), limit(5))),
        ]);

        const contribsList = await Promise.all(contribSnap.docs.map(async (d) => {
          const data = d.data();
          const orderRef = doc(db, "orders", data.order_id);
          const orderSnap = await getDoc(orderRef);
          let orderData: any = orderSnap.exists() ? { id: orderSnap.id, ...orderSnap.data() } : null;
          
          if (orderData) {
            const productSnap = await getDoc(doc(db, "products", orderData.product_id));
            orderData.product = productSnap.exists() ? { id: productSnap.id, ...productSnap.data() } : null;
          }
          return { id: d.id, ...data, order: orderData } as any;
        }));

        const membersList = await Promise.all(memberSnap.docs.map(async (d) => {
          const data = d.data();
          const commSnap = await getDoc(doc(db, "communities", data.community_id));
          return { id: d.id, ...data, community: commSnap.exists() ? { id: commSnap.id, ...commSnap.data() } : null } as any;
        }));

        const productsList = await Promise.all(productsSnap.docs.map(async (d) => {
          const data = d.data();
          if (data.vendor_id) {
            const vendorSnap = await getDoc(doc(db, "vendors", data.vendor_id));
            return { id: d.id, ...data, vendor: vendorSnap.exists() ? { id: vendorSnap.id, ...vendorSnap.data() } : null } as any;
          }
          return { id: d.id, ...data } as any;
        }));

        const ordersList = await Promise.all(ordersSnap.docs.map(async (d) => {
          const data = d.data();
          const [prodSnap, commSnap] = await Promise.all([
            getDoc(doc(db, "products", data.product_id)),
            getDoc(doc(db, "communities", data.community_id))
          ]);
          return {
            id: d.id,
            ...data,
            product: prodSnap.exists() ? { id: prodSnap.id, ...prodSnap.data() } : null,
            community: commSnap.exists() ? { id: commSnap.id, ...commSnap.data() } : null
          } as any;
        }));

        setContributions(contribsList);
        setCommunities(membersList);
        setProducts([...DEMO_PRODUCTS, ...productsList]);
        setActiveOrders(ordersList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const totalSaved = contributions.reduce((acc, c) => {
    if (c.order?.product) {
      const saving = c.order.product.retail_price - c.order.product.wholesale_price;
      return acc + saving * c.kg_committed;
    }
    return acc;
  }, 0);

  const totalSpent = contributions.reduce((acc, c) => acc + c.amount_paid, 0);

  const handleVerifyOtp = (orderId: string, actualOtp: string) => {
    if (otpInput[orderId] === actualOtp) {
      setOtpVerified({ ...otpVerified, [orderId]: true });
    }
  };

  if (loading) return <DashboardSkeleton />;

  const statusSteps = ["pooling", "ordered", "shipped", "delivered"];
  const statusIcons: Record<string, React.ReactNode> = {
    pooling: <Clock className="w-4 h-4" />,
    ordered: <ShoppingBag className="w-4 h-4" />,
    shipped: <Truck className="w-4 h-4" />,
    delivered: <CheckCircle className="w-4 h-4" />,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Track your orders, savings, and community activity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Saved"
          value={formatPrice(totalSaved)}
          icon={TrendingDown}
          trend={{ value: 24, positive: true }}
        />
        <StatsCard
          title="Total Spent"
          value={formatPrice(totalSpent)}
          icon={IndianRupee}
        />
        <StatsCard
          title="Communities"
          value={communities.length}
          icon={Users}
        />
        <StatsCard
          title="Orders"
          value={contributions.length}
          icon={Package}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              My Communities
            </h2>
            <Link
              href="/community/browse"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Browse <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {communities.length > 0 ? (
            <div className="space-y-3">
              {communities.map((m) => (
                <Link
                  key={m.id}
                  href={`/community/${m.community.id}`}
                  className="flex items-center justify-between p-4 bg-secondary/50 hover:bg-secondary rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {m.community.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.community.location_area}
                      </p>
                    </div>
                  </div>
                  {m.community.whatsapp_link && (
                    <a
                      href={m.community.whatsapp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center hover:bg-green-500/20 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-green-500" />
                    </a>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No Communities Yet"
              description="Join a community to start saving on protein supplements."
              action={{
                label: "Browse Communities",
                onClick: () => (window.location.href = "/community/browse"),
              }}
            />
          )}
        </div>

        <div className="glass-card rounded-2xl p-6" id="orders">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Active Orders
          </h2>
          {activeOrders.length > 0 ? (
            <div className="space-y-4">
              {activeOrders.map((order) => {
                const progress = Math.min(
                  (order.total_kg_committed / order.total_kg_required) * 100,
                  100
                );
                const currentStep = statusSteps.indexOf(order.status);

                return (
                  <div
                    key={order.id}
                    className="p-4 bg-secondary/50 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {order.product?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.community?.name}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          order.status === "delivered"
                            ? "bg-success/10 text-success"
                            : order.status === "shipped"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                    </div>

                    {order.status === "pooling" && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>
                            {order.total_kg_committed}kg / {order.total_kg_required}kg
                          </span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-accent rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-scoop to-scoop-light rounded-full"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {statusSteps.map((step, i) => (
                        <div key={step} className="flex items-center gap-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              i <= currentStep
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent text-muted-foreground"
                            }`}
                          >
                            {statusIcons[step]}
                          </div>
                          {i < statusSteps.length - 1 && (
                            <div
                              className={`w-8 h-0.5 ${
                                i < currentStep
                                  ? "bg-primary"
                                  : "bg-accent"
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {order.status === "delivered" && order.delivery_otp && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter OTP"
                          value={otpInput[order.id] || ""}
                          onChange={(e) =>
                            setOtpInput({ ...otpInput, [order.id]: e.target.value })
                          }
                          className="flex-1 px-3 py-2 bg-card rounded-lg text-sm border border-border focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        />
                        <button
                          onClick={() =>
                            handleVerifyOtp(order.id, order.delivery_otp)
                          }
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          Verify
                        </button>
                        {otpVerified[order.id] && (
                          <CheckCircle className="w-5 h-5 text-success" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="No Active Orders"
              description="Join a community and contribute to a bulk order to get started."
            />
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            My Contributions
          </h2>
        </div>
        {contributions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    KGs
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    Paid
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    Retail Would Be
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                    Saved
                  </th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => {
                  const retailCost = c.order?.product
                    ? c.order.product.retail_price * c.kg_committed
                    : 0;
                  const saved = retailCost - c.amount_paid;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {c.order?.product?.name || "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {c.kg_committed}kg
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {formatPrice(c.amount_paid)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground line-through">
                        {formatPrice(retailCost)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-success font-semibold">
                          {formatPrice(saved)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={IndianRupee}
            title="No Contributions Yet"
            description="Once you contribute to an order, your savings will show up here."
          />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Protein Catalog
          </h2>
          <span className="text-xs text-muted-foreground">
            Available for group orders
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
