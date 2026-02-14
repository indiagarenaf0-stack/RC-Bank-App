import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { QrCode, Scan, User, Shield, LogOut, Loader2, Share2 } from "lucide-react";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import AdminPanel from "@/react-app/components/AdminPanel";
import PayModal from "@/react-app/components/PayModal";
import ReceiveModal from "@/react-app/components/ReceiveModal";
import UserSearch from "@/react-app/components/UserSearch";

interface WalletData {
  username: string;
  balance: number;
  isAdmin: boolean;
  name: string;
  displayName: string;
}

interface Transaction {
  id: number;
  from_user_id: string | null;
  to_user_id: string;
  from_username: string | null;
  to_username: string;
  amount: number;
  type: string;
  note: string | null;
  created_at: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, isPending, redirectToLogin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState("");

  useEffect(() => {
    if (user) {
      loadWallet();
      loadTransactions();
    }
  }, [user]);

  const loadWallet = async () => {
    try {
      const response = await fetch("/api/wallet");
      if (response.ok) {
        const data = await response.json();
        setWallet(data);
      }
    } catch (error) {
      console.error("Failed to load wallet:", error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch("/api/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setWallet(null);
    setTransactions([]);
  };

  const handlePaymentSuccess = () => {
    loadWallet();
    loadTransactions();
  };

  const handleUserSelect = (username: string) => {
    setSelectedRecipient(username);
    setShowPayModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a8a]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <img 
                src="https://019c53f4-b8f3-758f-8abf-b2f2c49c7462.mochausercontent.com/rc-wallet-logo.png" 
                alt="RC Bank Logo" 
                className="w-32 h-32"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                RC Bank App
              </h1>
              <p className="text-gray-600 mt-2">Premium digital banking experience</p>
            </div>
            <Button
              onClick={redirectToLogin}
              className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white"
              size="lg"
            >
              Sign in with Google
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a8a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Dark Navy Blue */}
      <div className="bg-[#1e3a8a] shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://019c53f4-b8f3-758f-8abf-b2f2c49c7462.mochausercontent.com/rc-wallet-logo.png" 
              alt="RC Bank Logo" 
              className="w-10 h-10"
            />
            <span className="text-xl font-bold text-white">
              RC Bank App
            </span>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => navigate("/profile")}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                {wallet.displayName?.charAt(0).toUpperCase() || "U"}
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:bg-white/10 ml-2"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <User className="w-5 h-5" />
            </Button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="font-medium text-sm">{wallet.name}</div>
                  <div className="text-xs text-gray-500">{wallet.username}@coin</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${wallet.isAdmin ? "grid-cols-2" : "grid-cols-1"} mb-6 bg-white`}>
            <TabsTrigger value="home" className="data-[state=active]:bg-[#1e3a8a] data-[state=active]:text-white">Home</TabsTrigger>
            {wallet.isAdmin && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-[#1e3a8a] data-[state=active]:text-white">
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="home" className="space-y-6">
            {/* Logo and App Name - Centered */}
            <div className="text-center space-y-4 mb-6">
              <div className="flex justify-center">
                <img 
                  src="https://019c53f4-b8f3-758f-8abf-b2f2c49c7462.mochausercontent.com/rc-wallet-logo.png" 
                  alt="RC Bank Logo" 
                  className="w-24 h-24"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">RC Bank App</h2>
            </div>

            {/* User Search Bar */}
            <UserSearch onUserSelect={handleUserSelect} />

            {/* Balance Card with Glassmorphism */}
            <Card className="relative overflow-hidden border-0 shadow-xl">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700"></div>
              
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 backdrop-blur-sm bg-white/10"></div>
              
              {/* Content */}
              <div className="relative p-8 text-white text-center">
                <p className="text-sm opacity-90 mb-2">Your Balance</p>
                <div className="mb-4">
                  <span className="text-5xl font-bold">₹{wallet.balance.toLocaleString()}</span>
                </div>
                <div className="pt-4 flex items-center justify-center gap-2 text-sm opacity-90">
                  <QrCode className="w-4 h-4" />
                  <span>{wallet.username}@coin</span>
                </div>
              </div>
            </Card>

            {/* Share App Button */}
            <Button
              onClick={() => {
                const shareText = encodeURIComponent("Check out RC Bank App - Premium digital banking experience!");
                const shareUrl = encodeURIComponent("https://ujtbikjtudb4c.mocha.app");
                window.open(`https://wa.me/?text=${shareText}%20${shareUrl}`, '_blank');
              }}
              variant="outline"
              className="w-full border-2 border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share App on WhatsApp
            </Button>

            {/* Action Buttons with Dark Navy Blue */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setShowPayModal(true)}
                className="h-auto p-6 bg-[#1e3a8a] hover:bg-[#1e40af] text-white flex flex-col gap-3"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <Scan className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="font-semibold">Pay</div>
                  <div className="text-xs opacity-90">Scan QR Code</div>
                </div>
              </Button>

              <Button
                onClick={() => setShowReceiveModal(true)}
                className="h-auto p-6 bg-[#1e3a8a] hover:bg-[#1e40af] text-white flex flex-col gap-3"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <QrCode className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="font-semibold">Receive</div>
                  <div className="text-xs opacity-90">Show QR Code</div>
                </div>
              </Button>
            </div>

            {/* Recent Transactions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <Card className="p-8 text-center text-gray-500 bg-white">
                  <p>No transactions yet</p>
                </Card>
              ) : (
                <Card className="divide-y divide-gray-100 bg-white">
                  {transactions.map((tx) => {
                    const isReceived = tx.to_user_id === user.id;
                    const otherUser = isReceived ? tx.from_username : tx.to_username;
                    
                    return (
                      <div key={tx.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${isReceived ? "bg-green-100" : "bg-red-100"} flex items-center justify-center`}>
                            <span className="text-lg">{isReceived ? "💰" : "💸"}</span>
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {tx.type === "mint" ? "Minted by Admin" : isReceived ? `Received from ${otherUser}` : `Paid to ${otherUser}`}
                            </div>
                            <div className="text-xs text-gray-500">{formatDate(tx.created_at)}</div>
                          </div>
                        </div>
                        <div className={`${isReceived ? "text-green-600" : "text-red-600"} font-semibold`}>
                          {isReceived ? "+" : "-"}₹{tx.amount.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            {wallet.isAdmin && <AdminPanel />}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showPayModal && wallet && (
        <PayModal
          currentUsername={wallet.username}
          currentBalance={wallet.balance}
          onClose={() => {
            setShowPayModal(false);
            setSelectedRecipient("");
          }}
          onSuccess={handlePaymentSuccess}
          prefilledRecipient={selectedRecipient}
        />
      )}

      {showReceiveModal && wallet && (
        <ReceiveModal
          username={wallet.username}
          onClose={() => setShowReceiveModal(false)}
        />
      )}
    </div>
  );
}
