import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import {
  getOAuthRedirectUrl,
  exchangeCodeForSessionToken,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Auth endpoints
app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60,
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Create wallet if it doesn't exist
  const wallet = await c.env.DB.prepare(
    "SELECT * FROM wallets WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  if (!wallet) {
    // Extract username from email (part before @)
    const username = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    
    await c.env.DB.prepare(
      "INSERT INTO wallets (user_id, username, balance) VALUES (?, ?, ?)"
    )
      .bind(user.id, username, 0)
      .run();
  }

  return c.json(user);
});

app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Wallet endpoints
app.get("/api/wallet", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const wallet = await c.env.DB.prepare(
    "SELECT * FROM wallets WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  if (!wallet) {
    return c.json({ error: "Wallet not found" }, 404);
  }

  // Check if user is admin by email
  const isAdmin = user.email === "rrana199864@gmail.com";

  return c.json({
    ...wallet,
    isAdmin,
    name: user.google_user_data.name || user.email,
    displayName: wallet.display_name || user.google_user_data.name || user.email,
  });
});

app.get("/api/transactions", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const { results } = await c.env.DB.prepare(
    `SELECT t.*, 
      w_from.username as from_username,
      w_to.username as to_username
     FROM transactions t
     LEFT JOIN wallets w_from ON t.from_user_id = w_from.user_id
     LEFT JOIN wallets w_to ON t.to_user_id = w_to.user_id
     WHERE t.from_user_id = ? OR t.to_user_id = ?
     ORDER BY t.created_at DESC
     LIMIT 20`
  )
    .bind(user.id, user.id)
    .all();

  return c.json(results);
});

// Search users endpoint with public profile info
app.get("/api/search-users", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const query = c.req.query("q");
  if (!query || query.length < 1) {
    return c.json([]);
  }
  
  const { results } = await c.env.DB.prepare(
    `SELECT user_id, username, display_name, bio, contact_number, show_contact 
     FROM wallets 
     WHERE (username LIKE ? OR display_name LIKE ?) AND user_id != ?
     LIMIT 10`
  )
    .bind(`%${query}%`, `%${query}%`, user.id)
    .all();

  // Filter contact info based on privacy settings
  const filteredResults = results.map((result: any) => ({
    user_id: result.user_id,
    username: result.username,
    displayName: result.display_name || result.username,
    bio: result.bio || "",
    contactNumber: result.show_contact ? result.contact_number : null,
  }));

  return c.json(filteredResults);
});

// Get user profile
app.get("/api/profile", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const wallet = await c.env.DB.prepare(
    "SELECT * FROM wallets WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  if (!wallet) {
    return c.json({ error: "Wallet not found" }, 404);
  }

  return c.json({
    username: wallet.username,
    displayName: wallet.display_name || user.google_user_data.name || user.email,
    bio: wallet.bio || "",
    gender: wallet.gender || "",
    contactNumber: wallet.contact_number || "",
    showContact: wallet.show_contact === 1,
  });
});

// Update user profile
app.post("/api/profile", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { username, displayName, bio, gender, contactNumber, showContact } = body;

  // Check if username is being changed and if it's available
  if (username) {
    const currentWallet = await c.env.DB.prepare(
      "SELECT username FROM wallets WHERE user_id = ?"
    )
      .bind(user.id)
      .first();

    if (currentWallet && username !== currentWallet.username) {
      const existing = await c.env.DB.prepare(
        "SELECT user_id FROM wallets WHERE username = ? AND user_id != ?"
      )
        .bind(username, user.id)
        .first();

      if (existing) {
        return c.json({ error: "Username already taken" }, 400);
      }
    }
  }

  await c.env.DB.prepare(
    `UPDATE wallets 
     SET username = ?, display_name = ?, bio = ?, gender = ?, contact_number = ?, show_contact = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`
  )
    .bind(
      username || "",
      displayName || "",
      bio || "",
      gender || "",
      contactNumber || "",
      showContact ? 1 : 0,
      user.id
    )
    .run();

  return c.json({ success: true });
});

// Check username availability
app.get("/api/check-username", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const username = c.req.query("username");
  if (!username) {
    return c.json({ available: false, error: "Username required" }, 400);
  }

  // Check if it's the user's current username
  const currentWallet = await c.env.DB.prepare(
    "SELECT username FROM wallets WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  if (currentWallet && username === currentWallet.username) {
    return c.json({ available: true });
  }

  // Check if username exists
  const existing = await c.env.DB.prepare(
    "SELECT user_id FROM wallets WHERE username = ?"
  )
    .bind(username)
    .first();

  return c.json({ available: !existing });
});

// Payment endpoint
app.post("/api/pay", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { recipientUsername, amount, note } = body;

  if (!recipientUsername || !amount || amount <= 0) {
    return c.json({ error: "Invalid payment details" }, 400);
  }

  // Get sender's wallet
  const senderWallet = await c.env.DB.prepare(
    "SELECT user_id, username, balance FROM wallets WHERE user_id = ?"
  )
    .bind(user.id)
    .first();

  if (!senderWallet) {
    return c.json({ error: "Wallet not found" }, 404);
  }

  // Check balance
  if ((senderWallet.balance as number) < amount) {
    return c.json({ error: "Insufficient balance" }, 400);
  }

  // Get recipient's wallet
  const recipientWallet = await c.env.DB.prepare(
    "SELECT user_id, username, balance FROM wallets WHERE username = ?"
  )
    .bind(recipientUsername)
    .first();

  if (!recipientWallet) {
    return c.json({ error: "Recipient not found" }, 404);
  }

  if (senderWallet.user_id === recipientWallet.user_id) {
    return c.json({ error: "Cannot pay yourself" }, 400);
  }

  // Update balances
  await c.env.DB.prepare(
    "UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  )
    .bind(amount, senderWallet.user_id)
    .run();

  await c.env.DB.prepare(
    "UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  )
    .bind(amount, recipientWallet.user_id)
    .run();

  // Create transaction record
  await c.env.DB.prepare(
    `INSERT INTO transactions (from_user_id, to_user_id, amount, type, note, created_at, updated_at)
     VALUES (?, ?, ?, 'payment', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  )
    .bind(senderWallet.user_id, recipientWallet.user_id, amount, note || null)
    .run();

  return c.json({ success: true });
});

// Admin endpoints - only for Rajesh
app.get("/api/admin/users", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Check if user is admin by email
  if (user.email !== "rrana199864@gmail.com") {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const { results } = await c.env.DB.prepare(
    "SELECT user_id, username, balance, created_at FROM wallets ORDER BY username"
  ).all();

  return c.json(results);
});

app.post("/api/admin/mint", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Check if user is admin by email
  if (user.email !== "rrana199864@gmail.com") {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const body = await c.req.json();
  const { userId, amount, note } = body;

  if (!userId || !amount || amount <= 0) {
    return c.json({ error: "Invalid request" }, 400);
  }

  // Update balance
  await c.env.DB.prepare(
    "UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  )
    .bind(amount, userId)
    .run();

  // Record transaction
  await c.env.DB.prepare(
    "INSERT INTO transactions (from_user_id, to_user_id, amount, type, note) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(null, userId, amount, "mint", note || "Admin minted coins")
    .run();

  return c.json({ success: true });
});

app.post("/api/admin/edit-balance", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Check if user is admin by email
  if (user.email !== "rrana199864@gmail.com") {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const body = await c.req.json();
  const { userId, newBalance } = body;

  if (!userId || newBalance < 0) {
    return c.json({ error: "Invalid request" }, 400);
  }

  // Get current balance
  const wallet = await c.env.DB.prepare(
    "SELECT balance FROM wallets WHERE user_id = ?"
  )
    .bind(userId)
    .first();

  if (!wallet) {
    return c.json({ error: "User not found" }, 404);
  }

  const difference = newBalance - (wallet.balance as number);

  // Update balance
  await c.env.DB.prepare(
    "UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  )
    .bind(newBalance, userId)
    .run();

  // Record transaction
  await c.env.DB.prepare(
    "INSERT INTO transactions (from_user_id, to_user_id, amount, type, note) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(
      null,
      userId,
      Math.abs(difference),
      difference > 0 ? "mint" : "adjustment",
      `Admin adjusted balance from ₹${wallet.balance} to ₹${newBalance}`
    )
    .run();

  return c.json({ success: true });
});

export default app;
