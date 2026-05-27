import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const NAVY = "#000435";
const AMBER = "#FBBF24";

export default function AgentShopCheckout() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [payload] = useState(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("babyeyi_agent_shop_checkout") || "null",
      );
    } catch {
      return null;
    }
  });
  const [studentCode, setStudentCode] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("AT_SCHOOL");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Autofill parent info and fetch students on mount
  useEffect(() => {
    // Autofill parent's name and contact from auth context
    if (auth.user && auth.user !== false) {
      const parentName = auth.user?.full_name || auth.user?.name || "";
      const parentPhone = auth.user?.parent_phone || "";
      if (parentName) setBuyerName(parentName);
      if (parentPhone) setBuyerContact(parentPhone);
    }
  }, [auth.user]);

  // Fetch parent's students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const res = await fetch(`${API}/parent-portal/children`, {
          credentials: "include",
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setStudents(json.data || []);
        }
      } catch (e) {
        console.error("Failed to load students:", e);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, []);

  const subtotal = useMemo(
    () =>
      (payload?.items || []).reduce(
        (s, x) => s + Number(x.price || 0) * Number(x.quantity || 0),
        0,
      ),
    [payload],
  );
  if (!payload?.items?.length) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 18,
        }}
      >
        <div>
          <p>No cart found.</p>
          <Link to="/parents/find-agent">Back to Find Agent</Link>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!studentCode.trim() || !buyerName.trim() || !buyerContact.trim()) {
      setErr("Student code, name and contact are required.");
      return;
    }
    if (deliveryMode === "AT_HOME" && !deliveryAddress.trim()) {
      setErr("Home delivery address is required.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API}/student-services/public/shop/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_user_id: payload.agent_user_id,
          student_code: studentCode.trim(),
          buyer_name: buyerName.trim(),
          buyer_contact: buyerContact.trim(),
          delivery_mode: deliveryMode,
          delivery_address:
            deliveryMode === "AT_HOME" ? deliveryAddress.trim() : "",
          items: payload.items.map((x) => ({
            service_id: x.service_id,
            quantity: x.quantity,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false)
        throw new Error(json.message || "Checkout failed");
      const d = json.data;
      navigate("/payments", {
        state: {
          agentShopPay: {
            batchRef: d.batch_ref,
            grandTotal: d.total,
            subtotal: d.subtotal,
            deliveryFee: d.delivery_fee,
            lines: d.lines,
            student: d.student,
            payerName: buyerName.trim(),
            payerPhone: buyerContact.trim(),
          },
        },
      });
    } catch (e1) {
      setErr(e1.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

return (
  <div className="min-h-screen">
    <div className="mx-auto max-w-[900px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Checkout
        </h1>
        <p className="mt-2 text-slate-500">
          Review your order and complete your payment details.
        </p>
      </div>

      {/* Order Summary */}
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Order Summary
        </h2>

        <div className="mt-4 space-y-3">
          {(payload.items || []).map((x) => (
            <div
              key={x.service_id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-600">
                {x.name} × {x.quantity}
              </span>

              <span className="font-medium text-slate-900">
                {(
                  Number(x.price || 0) * Number(x.quantity || 0)
                ).toLocaleString()}{" "}
                RWF
              </span>
            </div>
          ))}

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="font-semibold text-slate-900">
              Subtotal
            </span>

            <span className="text-lg font-bold text-slate-900">
              {subtotal.toLocaleString()} RWF
            </span>
          </div>
        </div>
      </div>

      {/* Checkout Form */}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {/* Student Selection Section */}
        {!loadingStudents && students.length > 0 && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <label className="mb-3 block text-sm font-semibold text-slate-900">
              Select a student (Optional)
            </label>
            <div className="space-y-2">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudent(student);
                    setStudentCode(student.student_code || student.sdm_code || "");
                  }}
                  className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition ${
                    selectedStudent?.id === student.id
                      ? "border-indigo-500 bg-indigo-100 text-slate-900"
                      : "border-indigo-200 bg-white text-slate-700 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.class_name || "Class TBD"} • {student.school_name || "School"}
                      </p>
                      <p className="mt-1 text-xs font-mono text-slate-600">
                        Code: {student.student_code || student.sdm_code || "N/A"}
                      </p>
                    </div>
                    <div className={`h-5 w-5 rounded border-2 ${
                      selectedStudent?.id === student.id
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-slate-300 bg-white"
                    }`}>
                      {selectedStudent?.id === student.id && (
                        <span className="flex items-center justify-center text-white text-sm">✓</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Or enter a student code manually below as an alternative
            </p>
          </div>
        )}

        <input
          value={studentCode}
          onChange={(e) => {
            setStudentCode(e.target.value);
            setSelectedStudent(null);
          }}
          placeholder="Student code / SDM code"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />

        <input
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="Your full name"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />

        <input
          value={buyerContact}
          onChange={(e) => setBuyerContact(e.target.value)}
          placeholder="Your contact (phone)"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />

        <select
          value={deliveryMode}
          onChange={(e) => setDeliveryMode(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="AT_SCHOOL">
            Delivery at school
          </option>
          <option value="AT_HOME">
            Delivery at home (+2,500 RWF)
          </option>
        </select>

        {deliveryMode === "AT_HOME" && (
          <textarea
            value={deliveryAddress}
            onChange={(e) =>
              setDeliveryAddress(e.target.value)
            }
            rows={4}
            placeholder="Home delivery address"
            className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        )}

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="
            w-full
            rounded-xl
            bg-amber-400
            px-4
            py-3
            font-semibold
            text-slate-900
            transition
            hover:bg-amber-300
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {loading
            ? "Preparing payment..."
            : "Continue to Payment"}
        </button>
      </form>
    </div>
  </div>
)}