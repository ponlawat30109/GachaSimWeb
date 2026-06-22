"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Shield,
  Sparkles,
  Star,
  WandSparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Rarity = "A" | "B" | "C" | "D" | "E";
type HistoryItem = {
  id: number;
  item_id: number | null;
  name: string;
  rarity: Rarity | null;
  created_at: string;
};
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const rarityMeta: Record<Rarity, { label: string; color: string }> = {
  A: { label: "Mythic", color: "#ffca68" },
  B: { label: "Arcane", color: "#bd8cff" },
  C: { label: "Rare", color: "#62b8ff" },
  D: { label: "Uncommon", color: "#6ee7a8" },
  E: { label: "Common", color: "#aab2c5" },
};

function ItemGlyph({ itemId }: { itemId: number | null }) {
  const props = { size: 25, strokeWidth: 1.5 };
  if (itemId === 1) return <Zap {...props} />;
  if (itemId === 2) return <WandSparkles {...props} />;
  if (itemId === 3) return <Shield {...props} />;
  if (itemId === 4) return <Sparkles {...props} />;
  return <Star {...props} />;
}

function HistoryContent() {
  const params = useSearchParams();
  const queryUser = params.get("username") || "";
  const [username, setUsername] = useState(queryUser);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!queryUser) setUsername(localStorage.getItem("gacha-user") || "");
  }, [queryUser]);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`${API_URL}/gacha/history?username=${encodeURIComponent(username)}&page=${page}`)
      .then(async (response) => {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            response.status === 404
              ? "History API is unavailable. Rebuild and restart the Docker services."
              : "The server returned an unexpected response."
          );
        }
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load history.");
        return body;
      })
      .then((body) => {
        setItems(body.history);
        setPagination(body.pagination);
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Could not load history.")
      )
      .finally(() => setLoading(false));
  }, [page, username]);

  return (
    <main>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span>Astral Archive</span>
        </Link>
        <Link className="history-link" href="/"><ArrowLeft size={16} /> Summoning chamber</Link>
      </header>

      <div className="history-page">
        <section className="history-hero">
          <div className="eyebrow"><History size={14} /> Chronicle of echoes</div>
          <h1>Summon <em>history.</em></h1>
          <p>{username ? `${username}'s most recent relic discoveries.` : "Return to the archive and enter a seeker name first."}</p>
        </section>

        <section className="history-panel">
          <div className="section-heading history-heading">
            <div><span>Archive records</span><h3>{pagination.total} total summons</h3></div>
            <span className="page-count">Page {pagination.page} of {pagination.totalPages}</span>
          </div>

          {loading ? (
            <div className="history-message"><Sparkles className="spin" /> Reading the archive…</div>
          ) : error ? (
            <div className="history-message error">{error}</div>
          ) : !username ? (
            <div className="history-message">No seeker selected.</div>
          ) : items.length === 0 ? (
            <div className="history-message">No summons recorded yet.</div>
          ) : (
            <div className="history-list">
              {items.map((item) => {
                const meta = rarityMeta[item.rarity || "E"];
                const date = new Date(item.created_at);
                return (
                  <article className="history-row" key={item.id}>
                    <div className="history-glyph" style={{ color: meta.color }}>
                      <ItemGlyph itemId={item.item_id} />
                    </div>
                    <div className="history-name">
                      <small style={{ color: meta.color }}>{meta.label} · Grade {item.rarity || "E"}</small>
                      <strong>{item.name}</strong>
                    </div>
                    <div className="history-date">
                      <Clock3 size={14} />
                      <span>{date.toLocaleDateString()}<small>{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="pagination">
            <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}>
              <ChevronLeft size={17} /> Previous
            </button>
            <span>{items.length ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, pagination.total)} of ${pagination.total}` : "0 records"}</span>
            <button onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={page >= pagination.totalPages || loading}>
              Next <ChevronRight size={17} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function HistoryPage() {
  return <Suspense><HistoryContent /></Suspense>;
}
