// client/src/components/auth/ConfirmPasswordReset.tsx
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function ConfirmPasswordReset() {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const [pw, setPw] = useState("");
  const [status, setStatus] = useState<"idle"|"sending"|"ok"|"error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
    } catch { setStatus("error"); }
  }

  if (!token) return <p>Invalid or missing token.</p>;

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm">
      <input type="password" className="w-full rounded border p-3" placeholder="New password" value={pw} onChange={e=>setPw(e.target.value)} />
      <button className="rounded bg-indigo-600 px-4 py-2 text-white" disabled={status==="sending"}>
        {status==="sending" ? "Saving..." : "Set new password"}
      </button>
      {status==="ok" && <p>Password updated. You can now sign in.</p>}
      {status==="error" && <p className="text-red-600">Invalid or expired link.</p>}
    </form>
  );
}
