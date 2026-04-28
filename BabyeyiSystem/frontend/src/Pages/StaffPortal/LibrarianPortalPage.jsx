import { useEffect, useState } from "react";
import { BookOpen, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../Auth/LogoutButton";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const emptyBook = {
  title: "",
  author: "",
  isbn: "",
  category: "",
  quantity_total: 1,
  quantity_available: 1,
  shelf_location: "",
  status: "ACTIVE",
};

const emptyCheckout = {
  book_id: "",
  borrower_name: "",
  borrower_type: "STUDENT",
  borrower_ref: "",
  due_date: "",
  notes: "",
};

export default function LibrarianPortalPage() {
  const auth = useAuth();
  const [books, setBooks] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [bookForm, setBookForm] = useState(emptyBook);
  const [checkoutForm, setCheckoutForm] = useState(emptyCheckout);
  const [editingBookId, setEditingBookId] = useState(null);
  const [editingCheckoutId, setEditingCheckoutId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [booksRes, checkoutsRes] = await Promise.all([
        fetch(`${API}/api/library/books`, { credentials: "include" }),
        fetch(`${API}/api/library/checkouts`, { credentials: "include" }),
      ]);
      const booksJson = await booksRes.json().catch(() => ({}));
      const checkoutsJson = await checkoutsRes.json().catch(() => ({}));
      if (!booksRes.ok || !booksJson.success) throw new Error(booksJson.message || "Failed to load books");
      if (!checkoutsRes.ok || !checkoutsJson.success) throw new Error(checkoutsJson.message || "Failed to load checkouts");
      setBooks(booksJson.data || []);
      setCheckouts(checkoutsJson.data || []);
    } catch (err) {
      setError(err.message || "Failed to load librarian data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitBook = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const url = editingBookId ? `${API}/api/library/books/${editingBookId}` : `${API}/api/library/books`;
      const method = editingBookId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save book");
      setMessage(editingBookId ? "Book updated." : "Book created.");
      setBookForm(emptyBook);
      setEditingBookId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save book.");
    } finally {
      setSaving(false);
    }
  };

  const submitCheckout = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const url = editingCheckoutId ? `${API}/api/library/checkouts/${editingCheckoutId}` : `${API}/api/library/checkouts`;
      const method = editingCheckoutId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save checkout");
      setMessage(editingCheckoutId ? "Checkout updated." : "Checkout created.");
      setCheckoutForm(emptyCheckout);
      setEditingCheckoutId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save checkout.");
    } finally {
      setSaving(false);
    }
  };

  const removeBook = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    const res = await fetch(`${API}/api/library/books/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return setError(json.message || "Failed to delete book");
    setMessage("Book deleted.");
    loadData();
  };

  const returnCheckout = async (id) => {
    const res = await fetch(`${API}/api/library/checkouts/${id}/return`, { method: "PATCH", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return setError(json.message || "Failed to return book");
    setMessage("Book returned.");
    loadData();
  };

  const removeCheckout = async (id) => {
    if (!window.confirm("Delete this checkout?")) return;
    const res = await fetch(`${API}/api/library/checkouts/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return setError(json.message || "Failed to delete checkout");
    setMessage("Checkout deleted.");
    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                <BookOpen size={14} /> LIBRARIAN
              </p>
              <h1 className="mt-2 text-2xl font-black text-slate-900">Library management module</h1>
              <p className="text-sm text-slate-600">
                School: {auth.school?.name || "N/A"} ({auth.school?.code || "N/A"})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                <RefreshCw size={15} /> Refresh
              </button>
              <LogoutButton variant="default" size="sm" />
            </div>
          </div>
          {loading && <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600"><Loader2 size={14} className="animate-spin" /> Loading...</p>}
          {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{editingBookId ? "Edit book" : "Add book"}</h2>
            <form onSubmit={submitBook} className="mt-3 grid gap-3">
              <input required className="rounded-xl border px-3 py-2 text-sm" placeholder="Title" value={bookForm.title} onChange={(e) => setBookForm((p) => ({ ...p, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Author" value={bookForm.author} onChange={(e) => setBookForm((p) => ({ ...p, author: e.target.value }))} />
                <input className="rounded-xl border px-3 py-2 text-sm" placeholder="ISBN" value={bookForm.isbn} onChange={(e) => setBookForm((p) => ({ ...p, isbn: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Category" value={bookForm.category} onChange={(e) => setBookForm((p) => ({ ...p, category: e.target.value }))} />
                <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Shelf location" value={bookForm.shelf_location} onChange={(e) => setBookForm((p) => ({ ...p, shelf_location: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="1" className="rounded-xl border px-3 py-2 text-sm" placeholder="Total qty" value={bookForm.quantity_total} onChange={(e) => setBookForm((p) => ({ ...p, quantity_total: Number(e.target.value || 1) }))} />
                <input type="number" min="0" className="rounded-xl border px-3 py-2 text-sm" placeholder="Available qty" value={bookForm.quantity_available} onChange={(e) => setBookForm((p) => ({ ...p, quantity_available: Number(e.target.value || 0) }))} />
              </div>
              <select className="rounded-xl border px-3 py-2 text-sm" value={bookForm.status} onChange={(e) => setBookForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <div className="flex gap-2">
                <button disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{editingBookId ? "Update book" : "Create book"}</button>
                {editingBookId && <button type="button" className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={() => { setEditingBookId(null); setBookForm(emptyBook); }}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{editingCheckoutId ? "Edit checkout" : "Issue book"}</h2>
            <form onSubmit={submitCheckout} className="mt-3 grid gap-3">
              <select required className="rounded-xl border px-3 py-2 text-sm" value={checkoutForm.book_id} onChange={(e) => setCheckoutForm((p) => ({ ...p, book_id: e.target.value }))}>
                <option value="">Select book</option>
                {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <input required className="rounded-xl border px-3 py-2 text-sm" placeholder="Borrower name" value={checkoutForm.borrower_name} onChange={(e) => setCheckoutForm((p) => ({ ...p, borrower_name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <select className="rounded-xl border px-3 py-2 text-sm" value={checkoutForm.borrower_type} onChange={(e) => setCheckoutForm((p) => ({ ...p, borrower_type: e.target.value }))}>
                  <option value="STUDENT">STUDENT</option>
                  <option value="STAFF">STAFF</option>
                  <option value="VISITOR">VISITOR</option>
                </select>
                <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Borrower ID/Ref" value={checkoutForm.borrower_ref} onChange={(e) => setCheckoutForm((p) => ({ ...p, borrower_ref: e.target.value }))} />
              </div>
              <input type="date" className="rounded-xl border px-3 py-2 text-sm" value={checkoutForm.due_date} onChange={(e) => setCheckoutForm((p) => ({ ...p, due_date: e.target.value }))} />
              <textarea className="rounded-xl border px-3 py-2 text-sm" placeholder="Notes" value={checkoutForm.notes} onChange={(e) => setCheckoutForm((p) => ({ ...p, notes: e.target.value }))} />
              <div className="flex gap-2">
                <button disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{editingCheckoutId ? "Update checkout" : "Issue book"}</button>
                {editingCheckoutId && <button type="button" className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={() => { setEditingCheckoutId(null); setCheckoutForm(emptyCheckout); }}>Cancel</button>}
              </div>
            </form>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-900">Books</h3>
            <div className="mt-3 space-y-2">
              {books.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <p className="font-bold text-slate-900">{b.title}</p>
                  <p className="text-slate-600">Author: {b.author || "-"} | Available: {b.quantity_available}/{b.quantity_total}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded-lg border px-2 py-1 text-xs font-semibold" onClick={() => { setEditingBookId(b.id); setBookForm({ ...b }); }}>Edit</button>
                    <button className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600" onClick={() => removeBook(b.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {books.length === 0 && <p className="text-sm text-slate-500">No books added yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-900">Checkouts</h3>
            <div className="mt-3 space-y-2">
              {checkouts.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <p className="font-bold text-slate-900">{c.book_title || "Unknown book"}</p>
                  <p className="text-slate-600">{c.borrower_name} ({c.borrower_type}) - {c.status}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="rounded-lg border px-2 py-1 text-xs font-semibold" onClick={() => { setEditingCheckoutId(c.id); setCheckoutForm({ book_id: c.book_id, borrower_name: c.borrower_name || "", borrower_type: c.borrower_type || "STUDENT", borrower_ref: c.borrower_ref || "", due_date: c.due_date ? String(c.due_date).slice(0, 10) : "", notes: c.notes || "" }); }}>Edit</button>
                    {c.status === "ISSUED" && <button className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700" onClick={() => returnCheckout(c.id)}>Return</button>}
                    <button className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600" onClick={() => removeCheckout(c.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {checkouts.length === 0 && <p className="text-sm text-slate-500">No checkout records yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
