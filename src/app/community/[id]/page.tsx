"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ProductCard } from "@/components/shared/product-card";
import { DashboardSkeleton } from "@/components/shared/skeleton-loader";
import { EmptyState } from "@/components/shared/empty-state";
import { formatPrice, getInitials } from "@/lib/utils";
import type {
  Community,
  Membership,
  User,
  Product,
  Order,
  Poll,
  PollVote,
} from "@/lib/types";
import {
  Users,
  MapPin,
  MessageCircle,
  Crown,
  ShieldCheck,
  Package,
  Plus,
  BarChart3,
  Vote,
  Loader2,
  CheckCircle,
  Clock,
  Truck,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

export default function CommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<(Membership & { user: User })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<(Order & { product: Product })[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollVotes, setPollVotes] = useState<Record<string, PollVote[]>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<"none" | "pending" | "approved">("none");
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [kgAmount, setKgAmount] = useState("");
  const [contributing, setContributing] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderKgRequired, setOrderKgRequired] = useState("50");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      fetchAll(user);
    });
    return () => unsubscribe();
  }, [id]);

  const fetchAll = async (authUser: any) => {
    try {
      const communityRef = doc(db, "communities", id);
      const communitySnap = await getDoc(communityRef);
      if (!communitySnap.exists()) {
        setLoading(false);
        return;
      }
      const communityData = { id: communitySnap.id, ...communitySnap.data() } as Community;
      setCommunity(communityData);

      // Fetch all memberships to calculate counts and statuses
      const membershipsQuery = query(collection(db, "memberships"), where("community_id", "==", id));
      const membershipsSnap = await getDocs(membershipsQuery);
      
      let allMemberships: any[] = [];
      membershipsSnap.forEach((d) => allMemberships.push({ id: d.id, ...d.data() }));

      const approvedMemberships = allMemberships.filter(m => m.status === "approved");
      const membersList = await Promise.all(
        approvedMemberships.map(async (m) => {
          const userSnap = await getDoc(doc(db, "users", m.user_id));
          return { ...m, user: userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null };
        })
      );
      setMembers(membersList as any);

      const productsSnap = await getDocs(collection(db, "products"));
      let productsList: any[] = [];
      productsSnap.forEach((d) => productsList.push({ id: d.id, ...d.data() }));
      const productsWithVendors = await Promise.all(
        productsList.map(async (p) => {
          if (p.vendor_id) {
            const vendorSnap = await getDoc(doc(db, "vendors", p.vendor_id));
            if (vendorSnap.exists()) {
              return { ...p, vendor: { id: vendorSnap.id, ...vendorSnap.data() } };
            }
          }
          return p;
        })
      );
      setProducts(productsWithVendors as any);

      const ordersQuery = query(collection(db, "orders"), where("community_id", "==", id), orderBy("created_at", "desc"));
      const ordersSnap = await getDocs(ordersQuery);
      let ordersList: any[] = [];
      ordersSnap.forEach((d) => {
        const orderData = d.data();
        const productData = productsWithVendors.find(p => p.id === orderData.product_id) || null;
        ordersList.push({ id: d.id, ...orderData, product: productData });
      });
      setOrders(ordersList as any);

      const pollsQuery = query(collection(db, "polls"), where("community_id", "==", id), orderBy("created_at", "desc"));
      const pollsSnap = await getDocs(pollsQuery);
      let pollsList: any[] = [];
      const votesMap: Record<string, PollVote[]> = {};

      for (const d of pollsSnap.docs) {
        const pollId = d.id;
        pollsList.push({ id: pollId, ...d.data() });
        const votesQuery = query(collection(db, "poll_votes"), where("poll_id", "==", pollId));
        const votesSnap = await getDocs(votesQuery);
        let votesPart: any[] = [];
        votesSnap.forEach((v) => votesPart.push({ id: v.id, ...v.data() }));
        votesMap[pollId] = votesPart as PollVote[];
      }
      setPolls(pollsList as any);
      setPollVotes(votesMap);

      if (authUser) {
        const userSnap = await getDoc(doc(db, "users", authUser.uid));
        if (userSnap.exists()) {
          setCurrentUser({ id: userSnap.id, ...userSnap.data() } as User);
        } else {
          setCurrentUser({ id: authUser.uid, email: authUser.email, full_name: authUser.displayName, avatar_url: authUser.photoURL } as User);
        }
        setIsAdmin(communityData.admin_id === authUser.uid);
        
        const myMembership = allMemberships.find((m: any) => m.user_id === authUser.uid);
        if (myMembership) {
          setMembershipStatus(myMembership.status as any);
          setIsMember(myMembership.status === "approved");
        } else {
          setMembershipStatus("none");
          setIsMember(false);
        }
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!auth.currentUser) return;
    setJoining(true);
    try {
      await addDoc(collection(db, "memberships"), {
        community_id: id,
        user_id: auth.currentUser.uid,
        status: "pending",
        created_at: new Date().toISOString()
      });
      setMembershipStatus("pending");
    } catch (e) {
      console.error(e);
    } finally {
      setJoining(false);
    }
  };

  const handleContribute = async (orderId: string) => {
    if (!currentUser || !selectedProduct || !kgAmount) return;
    setContributing(true);
    const kg = parseFloat(kgAmount);
    const amount = kg * selectedProduct.wholesale_price;

    await addDoc(collection(db, "contributions"), {
      order_id: orderId,
      user_id: currentUser.id,
      kg_committed: kg,
      amount_paid: amount,
      created_at: new Date().toISOString()
    });

    const order = orders.find((o) => o.id === orderId);
    if (order) {
      await updateDoc(doc(db, "orders", orderId), {
        total_kg_committed: order.total_kg_committed + kg,
      });
    }

    const authUser = auth.currentUser;
    if (authUser) await fetchAll(authUser);
    
    setKgAmount("");
    setContributing(false);
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!currentUser) return;
    const existing = pollVotes[pollId]?.find(
      (v) => v.user_id === currentUser.id
    );
    if (existing) return;

    await addDoc(collection(db, "poll_votes"), {
      poll_id: pollId,
      user_id: currentUser.id,
      option_index: optionIndex,
      created_at: new Date().toISOString()
    });

    const votesQuery = query(collection(db, "poll_votes"), where("poll_id", "==", pollId));
    const votesSnap = await getDocs(votesQuery);
    let votesPart: any[] = [];
    votesSnap.forEach((v) => votesPart.push({ id: v.id, ...v.data() }));
    
    setPollVotes((prev) => ({ ...prev, [pollId]: votesPart as PollVote[] }));
  };

  const handleCreatePoll = async () => {
    if (!currentUser || !pollQuestion || pollOptions.filter(Boolean).length < 2)
      return;
    setCreatingPoll(true);

    await addDoc(collection(db, "polls"), {
      community_id: id,
      question: pollQuestion,
      options: pollOptions.filter(Boolean),
      created_at: new Date().toISOString(),
      is_active: true
    });

    const pollsQuery = query(collection(db, "polls"), where("community_id", "==", id), orderBy("created_at", "desc"));
    const pollsSnap = await getDocs(pollsQuery);
    let pollsList: any[] = [];
    pollsSnap.forEach((d) => pollsList.push({ id: d.id, ...d.data() }));
    
    setPolls(pollsList as any);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setCreatingPoll(false);
  };

  const handleCreateOrder = async () => {
    if (!selectedProduct || !currentUser) return;
    setCreatingOrder(true);

    await addDoc(collection(db, "orders"), {
      community_id: id,
      product_id: selectedProduct.id,
      total_kg_required: parseFloat(orderKgRequired),
      total_kg_committed: 0,
      status: "pooling",
      created_at: new Date().toISOString()
    });

    const authUser = auth.currentUser;
    if (authUser) await fetchAll(authUser);
    
    setCreatingOrder(false);
    setSelectedProduct(null);
    setActiveTab("orders");
  };

  if (loading) return <div className="p-8"><DashboardSkeleton /></div>;
  if (!community)
    return (
      <div className="p-8">
        <EmptyState
          icon={Users}
          title="Community Not Found"
          description="This community doesn't exist or has been removed."
        />
      </div>
    );

  const tabs = [
    { id: "overview", label: "Overview", icon: Users },
    { id: "orders", label: "Orders", icon: Package },
    { id: "polls", label: "Polls", icon: Vote },
    { id: "catalog", label: "Catalog", icon: ShoppingBag },
  ];

  const statusSteps = ["pooling", "ordered", "shipped", "delivered"];
  const statusIcons: Record<string, React.ReactNode> = {
    pooling: <Clock className="w-3.5 h-3.5" />,
    ordered: <ShoppingBag className="w-3.5 h-3.5" />,
    shipped: <Truck className="w-3.5 h-3.5" />,
    delivered: <CheckCircle className="w-3.5 h-3.5" />,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-scoop to-scoop-light flex items-center justify-center shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {community.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  {community.location_area}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {members.length} members
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {community.whatsapp_link && isMember && (
              <a
                href={community.whatsapp_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/20 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            )}
            
            {!isAdmin && membershipStatus === "none" && (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Join Community
              </button>
            )}

            {membershipStatus === "pending" && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-xl text-sm font-medium border border-yellow-500/20">
                <Clock className="w-4 h-4" />
                Request Pending
              </div>
            )}
          </div>
        </div>

        {community.description && (
          <p className="text-sm text-muted-foreground mt-4 max-w-2xl">
            {community.description}
          </p>
        )}
      </motion.div>

      <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Members ({members.length})
              </h2>
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {m.user?.avatar_url ? (
                          <img
                            src={m.user.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(m.user?.full_name || "?")
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {m.user?.full_name || "Member"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.user?.location_area || ""}
                        </p>
                      </div>
                    </div>
                    {m.user_id === community.admin_id && (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  Quick Stats
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {orders.filter((o) => o.status === "pooling").length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Active Orders
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {orders.filter((o) => o.status === "delivered").length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {polls.filter((p) => p.is_active).length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Active Polls
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {members.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Members
                    </p>
                  </div>
                </div>
              </div>

              {orders.filter((o) => o.status === "pooling").length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-3">
                    Current Pooling
                  </h2>
                  {orders
                    .filter((o) => o.status === "pooling")
                    .slice(0, 2)
                    .map((order) => {
                      const progress = Math.min(
                        (order.total_kg_committed / order.total_kg_required) *
                          100,
                        100
                      );
                      return (
                        <div key={order.id} className="mb-3 last:mb-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-foreground truncate">
                              {order.product?.name}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <div className="h-2.5 bg-accent rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1 }}
                              className="h-full bg-gradient-to-r from-scoop to-scoop-light rounded-full"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.total_kg_committed}kg / {order.total_kg_required}kg
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-6">
            {isAdmin && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Create New Order
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {products.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
                        selectedProduct?.id === p.id
                          ? "bg-primary/10 ring-2 ring-primary"
                          : "bg-secondary hover:bg-accent"
                      }`}
                    >
                      <p className="text-xs font-medium text-foreground truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-primary font-bold mt-1">
                        {formatPrice(p.wholesale_price)}
                      </p>
                    </button>
                  ))}
                </div>
                {selectedProduct && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={orderKgRequired}
                      onChange={(e) => setOrderKgRequired(e.target.value)}
                      placeholder="MOQ (kg)"
                      className="w-32 px-3 py-2 bg-secondary rounded-lg text-sm border border-border focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    />
                    <button
                      onClick={handleCreateOrder}
                      disabled={creatingOrder}
                      className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {creatingOrder ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Create Order
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => {
                  const progress = Math.min(
                    (order.total_kg_committed / order.total_kg_required) * 100,
                    100
                  );
                  const currentStep = statusSteps.indexOf(order.status);

                  return (
                    <div
                      key={order.id}
                      className="glass-card rounded-2xl p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">
                            {order.product?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(order.product?.wholesale_price || 0)} /
                            unit wholesale
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
                            {order.total_kg_committed}kg /{" "}
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

                      <div className="flex items-center gap-1.5">
                        {statusSteps.map((step, i) => (
                          <div key={step} className="flex items-center gap-1">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                i <= currentStep
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-accent text-muted-foreground"
                              }`}
                            >
                              {statusIcons[step]}
                            </div>
                            {i < statusSteps.length - 1 && (
                              <div
                                className={`w-6 sm:w-10 h-0.5 ${
                                  i < currentStep ? "bg-primary" : "bg-accent"
                                }`}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {order.status === "pooling" && isMember && (
                        <div className="flex items-center gap-3 pt-2 border-t border-border">
                          <input
                            type="number"
                            value={kgAmount}
                            onChange={(e) => setKgAmount(e.target.value)}
                            placeholder="KGs to commit"
                            min="0.5"
                            step="0.5"
                            className="w-40 px-3 py-2 bg-secondary rounded-lg text-sm border border-border focus:ring-2 focus:ring-primary/50 focus:outline-none"
                          />
                          <button
                            onClick={() => handleContribute(order.id)}
                            disabled={contributing || !kgAmount}
                            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-scoop to-scoop-light text-white rounded-lg text-sm font-semibold cursor-pointer hover:shadow-lg hover:shadow-scoop/20 transition-all disabled:opacity-50"
                          >
                            {contributing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Contribute"
                            )}
                          </button>
                          {kgAmount && selectedProduct && (
                            <span className="text-xs text-muted-foreground">
                              ≈{" "}
                              {formatPrice(
                                parseFloat(kgAmount) *
                                  (order.product?.wholesale_price || 0)
                              )}
                            </span>
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
                title="No Orders Yet"
                description={
                  isAdmin
                    ? "Create the first order for your community above."
                    : "The admin hasn't created any orders yet."
                }
              />
            )}
          </div>
        )}

        {activeTab === "polls" && (
          <div className="space-y-6">
            {isAdmin && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Create a Poll
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="What should we order this month?"
                    className="w-full px-4 py-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {pollOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="w-full px-4 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  ))}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      + Add option
                    </button>
                  </div>
                  <button
                    onClick={handleCreatePoll}
                    disabled={creatingPoll}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {creatingPoll ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Vote className="w-4 h-4" />
                        Create Poll
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {polls.length > 0 ? (
              <div className="space-y-4">
                {polls.map((poll) => {
                  const votes = pollVotes[poll.id] || [];
                  const totalVotes = votes.length;
                  const hasVoted = currentUser
                    ? votes.some((v) => v.user_id === currentUser.id)
                    : false;
                  const options = poll.options as string[];

                  return (
                    <motion.div
                      key={poll.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-2xl p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-foreground">
                          {poll.question}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {options.map((option: string, idx: number) => {
                          const optionVotes = votes.filter(
                            (v) => v.option_index === idx
                          ).length;
                          const percentage =
                            totalVotes > 0
                              ? Math.round((optionVotes / totalVotes) * 100)
                              : 0;

                          return (
                            <button
                              key={idx}
                              onClick={() => handleVote(poll.id, idx)}
                              disabled={hasVoted || !isMember}
                              className="w-full text-left relative overflow-hidden rounded-xl transition-all cursor-pointer disabled:cursor-default"
                            >
                              <div
                                className={`relative z-10 flex items-center justify-between px-4 py-3 ${
                                  hasVoted
                                    ? "bg-secondary/50"
                                    : "bg-secondary hover:bg-accent"
                                } rounded-xl`}
                              >
                                <span className="text-sm font-medium text-foreground">
                                  {option}
                                </span>
                                {hasVoted && (
                                  <span className="text-xs font-bold text-primary">
                                    {percentage}%
                                  </span>
                                )}
                              </div>
                              {hasVoted && (
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.8 }}
                                  className="absolute inset-0 bg-primary/10 rounded-xl"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {hasVoted && (
                        <p className="text-xs text-success mt-3 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          You voted
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Vote}
                title="No Polls Yet"
                description={
                  isAdmin
                    ? "Create a poll to let members vote on what to order."
                    : "No active polls right now. Check back later."
                }
              />
            )}
          </div>
        )}

        {activeTab === "catalog" && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Browse available products. {isAdmin && "Select one to create a new order."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={isAdmin ? setSelectedProduct : undefined}
                  selected={selectedProduct?.id === product.id}
                />
              ))}
            </div>
            {isAdmin && selectedProduct && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-card rounded-2xl px-6 py-4 flex items-center gap-4 shadow-2xl z-50"
              >
                <p className="text-sm font-medium text-foreground">
                  {selectedProduct.name}
                </p>
                <input
                  type="number"
                  value={orderKgRequired}
                  onChange={(e) => setOrderKgRequired(e.target.value)}
                  placeholder="MOQ (kg)"
                  className="w-24 px-3 py-2 bg-secondary rounded-lg text-sm border border-border focus:ring-2 focus:ring-primary/50 focus:outline-none"
                />
                <button
                  onClick={handleCreateOrder}
                  disabled={creatingOrder}
                  className="px-5 py-2 bg-gradient-to-r from-scoop to-scoop-light text-white rounded-lg text-sm font-semibold cursor-pointer hover:shadow-lg hover:shadow-scoop/20 transition-all disabled:opacity-50"
                >
                  {creatingOrder ? "Creating..." : "Create Order"}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
