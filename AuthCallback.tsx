import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { exchangeCodeForSessionToken } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        navigate("/");
      } catch (error) {
        console.error("Authentication failed:", error);
        navigate("/");
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
