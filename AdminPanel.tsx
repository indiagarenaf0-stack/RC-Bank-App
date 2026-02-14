import { useState, useEffect } from "react";
import { Shield, Coins, Edit, Plus } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Textarea } from "@/react-app/components/ui/textarea";

interface User {
  user_id: string;
  username: string;
  balance: number;
  created_at: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [mintNote, setMintNote] = useState("");
  const [editUserId, setEditUserId] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !mintAmount) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          amount: parseInt(mintAmount),
          note: mintNote,
        }),
      });

      if (response.ok) {
        setMintAmount("");
        setMintNote("");
        setSelectedUser("");
        await loadUsers();
      }
    } catch (error) {
      console.error("Failed to mint coins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId || !newBalance) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/edit-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editUserId,
          newBalance: parseInt(newBalance),
        }),
      });

      if (response.ok) {
        setEditUserId("");
        setNewBalance("");
        await loadUsers();
      }
    } catch (error) {
      console.error("Failed to edit balance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-bold">Admin Panel</h2>
            <p className="text-sm opacity-90">Manage currency and balances</p>
          </div>
        </div>
      </Card>

      {/* Mint Coins */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold">Mint Coins</h3>
        </div>
        <form onSubmit={handleMint} className="space-y-4">
          <div>
            <Label htmlFor="mint-user">Select User</Label>
            <select
              id="mint-user"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a user...</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.username} (₹{user.balance})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="mint-amount">Amount (₹)</Label>
            <Input
              id="mint-amount"
              type="number"
              min="1"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
          </div>
          <div>
            <Label htmlFor="mint-note">Note (optional)</Label>
            <Textarea
              id="mint-note"
              value={mintNote}
              onChange={(e) => setMintNote(e.target.value)}
              placeholder="Reason for minting..."
              rows={2}
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Mint Coins
          </Button>
        </form>
      </Card>

      {/* Edit Balance */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Edit className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Edit Balance</h3>
        </div>
        <form onSubmit={handleEditBalance} className="space-y-4">
          <div>
            <Label htmlFor="edit-user">Select User</Label>
            <select
              id="edit-user"
              value={editUserId}
              onChange={(e) => {
                setEditUserId(e.target.value);
                const user = users.find((u) => u.user_id === e.target.value);
                if (user) setNewBalance(user.balance.toString());
              }}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a user...</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.username} (₹{user.balance})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="new-balance">New Balance (₹)</Label>
            <Input
              id="new-balance"
              type="number"
              min="0"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              placeholder="Enter new balance"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Update Balance
          </Button>
        </form>
      </Card>

      {/* All Users */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">All Users</h3>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <div className="font-medium">{user.username}</div>
                <div className="text-sm text-gray-500">{user.username}@coin</div>
              </div>
              <div className="text-lg font-bold text-blue-600">
                ₹{user.balance.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
