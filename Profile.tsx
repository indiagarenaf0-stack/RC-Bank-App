import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, Check, X } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Textarea } from "@/react-app/components/ui/textarea";

interface ProfileData {
  username: string;
  displayName: string;
  bio: string;
  gender: string;
  contactNumber: string;
  showContact: boolean;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<ProfileData>({
    username: "",
    displayName: "",
    bio: "",
    gender: "",
    contactNumber: "",
    showContact: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData(data);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  const checkUsername = async (username: string) => {
    if (username === profile?.username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    try {
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
    } catch (err) {
      console.error("Failed to check username:", err);
    } finally {
      setUsernameChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Only allow lowercase letters and numbers
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    setFormData({ ...formData, username: cleaned });
    
    // Debounce username check
    const timer = setTimeout(() => checkUsername(cleaned), 500);
    return () => clearTimeout(timer);
  };

  const handleSave = async () => {
    setError("");
    setSaveSuccess(false);

    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (usernameAvailable === false) {
      setError("Username is already taken");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSaveSuccess(true);
        await loadProfile();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save profile");
      }
    } catch (err) {
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a8a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1e3a8a] shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-xl font-bold text-white">Profile Settings</span>
        </div>
      </div>

      {/* Profile Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card className="p-6 space-y-6 bg-white">
          {/* Profile Picture Placeholder */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
              {formData.displayName.charAt(0).toUpperCase() || "U"}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Your name"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">This is how others will see your name</p>
          </div>

          {/* Username */}
          <div>
            <Label htmlFor="username">User ID</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="username"
                value={formData.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameChecking && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                {!usernameChecking && usernameAvailable === true && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
                {!usernameChecking && usernameAvailable === false && (
                  <X className="w-4 h-4 text-red-600" />
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Your payment ID: {formData.username}@coin</p>
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell others about yourself"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">Others can see this when they search for you</p>
          </div>

          {/* Gender */}
          <div>
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Contact Number */}
          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              type="tel"
              placeholder="+91 XXXXXXXXXX"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-sm">Show Contact Number</div>
              <div className="text-xs text-gray-500">Allow others to see your contact number when they search for you</div>
            </div>
            <button
              onClick={() => setFormData({ ...formData, showContact: !formData.showContact })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.showContact ? "bg-[#1e3a8a]" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formData.showContact ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Success Message */}
          {saveSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Profile updated successfully!
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || usernameAvailable === false}
            className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
