import { X } from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";

interface ReceiveModalProps {
  username: string;
  onClose: () => void;
}

export default function ReceiveModal({ username, onClose }: ReceiveModalProps) {
  const paymentId = `${username}@coin`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6 space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Receive Payment</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
            <QRCode
              value={paymentId}
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox="0 0 256 256"
            />
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Your Payment ID</p>
            <div className="px-4 py-3 bg-gray-100 rounded-lg">
              <p className="font-mono font-semibold text-lg">{paymentId}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Ask others to scan this QR code to send you money
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
