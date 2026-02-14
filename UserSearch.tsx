import { useState, useEffect, useRef } from "react";
import { Search, User, X } from "lucide-react";
import { Input } from "@/react-app/components/ui/input";
import { Card } from "@/react-app/components/ui/card";

interface UserResult {
  user_id: string;
  username: string;
  displayName: string;
  bio: string;
  contactNumber: string | null;
}

interface UserSearchProps {
  onUserSelect: (username: string) => void;
}

export default function UserSearch({ onUserSelect }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 1) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/search-users?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = (username: string) => {
    onUserSelect(username);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const handleClear = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search User ID (e.g., dost@coin)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length > 0 && setShowResults(true)}
          className="pl-12 pr-10 h-12 rounded-full border-2 border-gray-200 focus:border-[#1e3a8a] bg-white shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <Card className="absolute top-full mt-2 w-full bg-white shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-50">
          {searchResults.map((user) => (
            <button
              key={user.user_id}
              onClick={() => handleSelectUser(user.username)}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#1e3a8a]" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{user.displayName}</div>
                <div className="text-xs text-gray-500">{user.username}@coin</div>
                {user.bio && <div className="text-xs text-gray-400 mt-1 line-clamp-1">{user.bio}</div>}
                {user.contactNumber && (
                  <div className="text-xs text-green-600 mt-1">📞 {user.contactNumber}</div>
                )}
              </div>
            </button>
          ))}
        </Card>
      )}

      {showResults && searchQuery.length > 0 && searchResults.length === 0 && !isSearching && (
        <Card className="absolute top-full mt-2 w-full bg-white shadow-lg border border-gray-200 p-4 z-50">
          <p className="text-sm text-gray-500 text-center">No users found</p>
        </Card>
      )}
    </div>
  );
}
