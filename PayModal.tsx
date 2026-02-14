import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";

interface PayModalProps {
  currentUsername: string;
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
  prefilledRecipient?: string;
}

export default function PayModal({
  currentUsername,
  currentBalance,
  onClose,
  onSuccess,
  prefilledRecipient = "",
}: PayModalProps) {
  const [scannedId, setScannedId] = useState(prefilledRecipient ? `${prefilledRecipient}@coin` : "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(!prefilledRecipient);

  const handleScan = (result: string) => {
    if (result && result.includes("@coin")) {
      setScannedId(result);
      setShowScanner(false);
      setError("");
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payAmount = parseInt(amount);
    if (payAmount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    if (payAmount > currentBalance) {
      setError("Insufficient balance");
      return;
    }

    const recipientUsername = scannedId.replace("@coin", "");
    if (recipientUsername === currentUsername) {
      setError("Cannot pay yourself");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUsername,
          amount: payAmount,
          note,
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Payment failed");
      }
    } catch (err) {
      setError("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6 space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Pay</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {showScanner ? (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    handleScan(result[0].rawValue);
                  }
                }}
                constraints={{
                  facingMode: "environment",
                }}
                styles={{
                  container: {
                    width: "100%",
                    paddingTop: "100%",
                    position: "relative",
                  },
                  video: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  },
                }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">
              Scan the recipient's QR code to continue
            </p>
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowScanner(false);
                  setScannedId("");
                }}
              >
                Enter Payment ID Manually
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePay} className="space-y-4">
            {!scannedId && (
              <div>
                <Label htmlFor="payment-id">Payment ID</Label>
                <Input
                  id="payment-id"
                  placeholder="username@coin"
                  value={scannedId}
                  onChange={(e) => setScannedId(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="link"
                  className="mt-2 p-0 h-auto text-sm"
                  onClick={() => setShowScanner(true)}
                >
                  Scan QR Code Instead
                </Button>
              </div>
            )}

            {scannedId && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">Paying to:</p>
                <p className="font-semibold text-green-900">{scannedId}</p>
                <Button
                  type="button"
                  variant="link"
                  className="mt-2 p-0 h-auto text-sm text-green-700"
                  onClick={() => {
                    setScannedId("");
                    setShowScanner(true);
                  }}
                >
                  Scan Different Code
                </Button>
              </div>
            )}

            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                max={currentBalance}
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: ₹{currentBalance.toLocaleString()}
              </p>
            </div>

            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                placeholder="What's this for?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isProcessing || !scannedId}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Pay ₹{amount || "0"}
                </>
              )}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
