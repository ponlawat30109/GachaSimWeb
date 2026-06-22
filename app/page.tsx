"use client";

import {
  CircleHelp,
  History,
  Gem,
  LogOut,
  PackageOpen,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  WandSparkles,
  Zap,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type User = { name: string; gacha_remaining: number };
type InventoryEntry = { id: number; item_id: number; quantity: number };
type GachaItem = { id: number; name: string; rarity: Rarity; drop_rate: number };
type Rarity = "A" | "B" | "C" | "D" | "E";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const itemCatalog: Record<number, Omit<GachaItem, "id">> = {
  1: { name: "Legendary Sword", rarity: "A", drop_rate: 10 },
  2: { name: "Magic Wand", rarity: "B", drop_rate: 15 },
  3: { name: "Steel Shield", rarity: "C", drop_rate: 20 },
  4: { name: "Leather Boots", rarity: "D", drop_rate: 25 },
  5: { name: "Wooden Stick", rarity: "E", drop_rate: 30 },
};

const rarityMeta: Record<Rarity, { label: string; color: string }> = {
  A: { label: "Mythic", color: "#ffca68" },
  B: { label: "Arcane", color: "#bd8cff" },
  C: { label: "Rare", color: "#62b8ff" },
  D: { label: "Uncommon", color: "#6ee7a8" },
  E: { label: "Common", color: "#aab2c5" },
};

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "The archive did not respond.");
  return body;
}

function ItemGlyph({ itemId }: { itemId: number }) {
  const props = { size: 34, strokeWidth: 1.5 };
  if (itemId === 1) return <Zap {...props} />;
  if (itemId === 2) return <WandSparkles {...props} />;
  if (itemId === 3) return <Shield {...props} />;
  if (itemId === 4) return <Sparkles {...props} />;
  return <Star {...props} />;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [results, setResults] = useState<GachaItem[]>([]);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState("");
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ status: string }>("/health")
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false));
    const savedUser = localStorage.getItem("gacha-user");
    if (savedUser) {
      setUsername(savedUser);
      setBusy(true);
      api<{ user: User; inventory: InventoryEntry[] }>("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: savedUser }),
      })
        .then((data) => {
          setUser(data.user);
          setInventory(data.inventory);
        })
        .catch(() => localStorage.removeItem("gacha-user"))
        .finally(() => setBusy(false));
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await api<{ user: User; inventory: InventoryEntry[] }>(
      `/login/refresh?username=${encodeURIComponent(user.name)}`
    );
    setUser(data.user);
    setInventory(data.inventory);
  }, [user]);

  async function login(event: FormEvent) {
    event.preventDefault();
    const cleanName = username.trim();
    if (!cleanName) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ user: User; inventory: InventoryEntry[] }>("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanName }),
      });
      setUser(data.user);
      setInventory(data.inventory);
      localStorage.setItem("gacha-user", data.user.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pull(count: number) {
    if (!user || busy || user.gacha_remaining < count) return;
    setBusy(true);
    setRevealing(true);
    setResults([]);
    setError("");
    try {
      const data = await api<{ results: GachaItem[] }>("/gacha/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.name, count }),
      });
      await new Promise((resolve) => setTimeout(resolve, 900));
      setResults(data.results);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Summon failed.");
    } finally {
      setRevealing(false);
      setBusy(false);
    }
  }

  const groupedInventory = useMemo(() => {
    const counts = new Map<number, number>();
    inventory.forEach((entry) =>
      counts.set(entry.item_id, (counts.get(entry.item_id) || 0) + (entry.quantity || 1))
    );
    return [...counts.entries()]
      .map(([id, quantity]) => ({ id, quantity, ...itemCatalog[id] }))
      .sort((a, b) => a.id - b.id);
  }, [inventory]);

  return (
    <main>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span>Astral Archive</span>
        </a>
        <div className="top-actions">
          <span className={`status ${serverOnline ? "online" : serverOnline === false ? "offline" : ""}`}>
            <i /> {serverOnline ? "Archive online" : serverOnline === false ? "Archive offline" : "Connecting"}
          </span>
          <button className="icon-button" aria-label="Help"><CircleHelp size={19} /></button>
          {user && (
            <>
              <Link className="history-link" href={`/history?username=${encodeURIComponent(user.name)}`}>
                <History size={16} /> History
              </Link>
              <button className="profile" onClick={() => {
                setUser(null);
                localStorage.removeItem("gacha-user");
              }}>
                <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                <span><small>Seeker</small>{user.name}</span>
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {!user ? (
        <section className="login-shell">
          <div className="eyebrow"><Gem size={14} /> The archive awaits</div>
          <h1>Draw power from<br /><em>the stars.</em></h1>
          <p>Enter a seeker name to open your collection and begin summoning relics.</p>
          <form className="login-card" onSubmit={login}>
            <label htmlFor="username">Seeker name</label>
            <div className="input-row">
              <input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. Astra"
                maxLength={50}
                autoFocus
              />
              <button disabled={busy || !username.trim()}>
                {busy ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />}
                Enter archive
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </form>
        </section>
      ) : (
        <div className="dashboard">
          <section className="hero">
            <div>
              <div className="eyebrow"><Sparkles size={14} /> Summoning chamber</div>
              <h1>Welcome back,<br /><em>{user.name}.</em></h1>
              <p>Every pull writes a new line in your celestial collection.</p>
            </div>
            <div className="currency-card">
              <span className="currency-icon"><Gem /></span>
              <div><small>Summons remaining</small><strong>{user.gacha_remaining}</strong></div>
            </div>
          </section>

          <section className="summon-grid">
            <div className={`portal-card ${revealing ? "is-revealing" : ""}`}>
              <div className="portal">
                <div className="orbit orbit-one"><i /><i /><i /></div>
                <div className="orbit orbit-two"><i /><i /></div>
                <div className="portal-core"><Sparkles size={34} /></div>
              </div>
              <div className="portal-copy">
                <span>Celestial banner</span>
                <h2>Echoes of the First Light</h2>
                <p>Mythic relic chance <strong>10%</strong></p>
              </div>
              <div className="summon-actions">
                <button onClick={() => pull(1)} disabled={busy || user.gacha_remaining < 1}>
                  Summon once <span><Gem size={14} /> 1</span>
                </button>
                <button className="primary" onClick={() => pull(10)} disabled={busy || user.gacha_remaining < 10}>
                  <Sparkles size={18} /> Summon ten <span><Gem size={14} /> 10</span>
                </button>
              </div>
            </div>

            <aside className="rates-card">
              <div className="section-heading">
                <div><span>Drop rates</span><h3>Relic resonance</h3></div>
                <span className="fair-badge">Transparent</span>
              </div>
              {Object.entries(rarityMeta).map(([rarity, meta]) => (
                <div className="rate-row" key={rarity}>
                  <span className="rarity-dot" style={{ background: meta.color, boxShadow: `0 0 12px ${meta.color}` }} />
                  <div><strong>{meta.label}</strong><small>Grade {rarity}</small></div>
                  <span>{({ A: 10, B: 15, C: 20, D: 25, E: 30 } as Record<string, number>)[rarity]}%</span>
                </div>
              ))}
              <p className="rates-note">Each summon is independent. Results are securely determined by the gacha service.</p>
            </aside>
          </section>

          {error && <div className="error banner-error">{error}</div>}

          {results.length > 0 && (
            <section className="results-section">
              <div className="section-heading">
                <div><span>Latest constellation</span><h3>Summon results</h3></div>
              </div>
              <div className="result-grid">
                {results.map((item, index) => {
                  const meta = rarityMeta[item.rarity];
                  return (
                    <article className="item-card reveal" style={{ "--delay": `${index * 70}ms`, "--rarity": meta.color } as React.CSSProperties} key={`${item.id}-${index}`}>
                      <span className="grade">{item.rarity}</span>
                      <div className="item-icon"><ItemGlyph itemId={item.id} /></div>
                      <small>{meta.label}</small>
                      <strong>{item.name}</strong>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <section className="inventory-section">
            <div className="section-heading">
              <div><span>Your archive</span><h3>Relic collection</h3></div>
              <button className="text-button" onClick={() => refresh()}><RefreshCw size={15} /> Refresh</button>
            </div>
            {groupedInventory.length ? (
              <div className="inventory-grid">
                {groupedInventory.map((item) => {
                  const meta = rarityMeta[item.rarity];
                  return (
                    <article className="inventory-item" key={item.id}>
                      <div className="mini-icon" style={{ color: meta.color }}><ItemGlyph itemId={item.id} /></div>
                      <div><small style={{ color: meta.color }}>{meta.label}</small><strong>{item.name}</strong></div>
                      <span>×{item.quantity}</span>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state"><PackageOpen size={32} /><strong>Your archive is empty</strong><span>Summon your first relic above.</span></div>
            )}
          </section>
        </div>
      )}
      <footer>ASTRAL ARCHIVE <span>•</span> GACHA SIMULATOR</footer>
    </main>
  );
}
