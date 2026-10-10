import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthState } from "@/hooks/useAuth";
import {
  raiseTicket,
  replyTicket,
  forwardTicket,
} from "@/features/governance/governance.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Ticket as TicketIcon, Plus, Loader2, MessageSquare, ShieldAlert, AlertCircle,
  Clock, ArrowLeft, Send, Forward, CheckCircle
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tickets")({
  component: SupportTicketsPage,
});

function SupportTicketsPage() {
  const { user, primaryRole } = useAuthState();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState<any>("Payroll");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<any>("Medium");
  const [isConfidential, setIsConfidential] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const isPrivileged = ["hod", "dean", "principal", "super_admin", "admin_staff"].includes(primaryRole || "");
      let query = supabase.from("tickets").select("*, profiles(full_name, email)");

      if (!isPrivileged) {
        query = query.eq("faculty_id", user.id);
      }
      
      const { data } = await query.order("created_at", { ascending: false });
      setTickets(data ?? []);
    } catch (err: any) {
      toast.error("Failed to load tickets: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, [user, primaryRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await raiseTicket({
        data: {
          category,
          subject,
          description,
          priority,
          isConfidential,
        },
      });
      toast.success("Support ticket raised successfully");
      setShowCreate(false);
      loadTickets();
      setSubject("");
      setDescription("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to raise ticket");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedTicketId) {
    return <TicketDetailView ticketId={selectedTicketId} onBack={() => { setSelectedTicketId(null); loadTickets(); }} />;
  }

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Triage & Issues</div>
          <h1 className="font-display text-4xl text-foreground mt-1">Support Tickets</h1>
          <p className="text-muted-foreground text-sm mt-1">Raise payslip inquiries, leave corrections, or JNTUH registration discrepancies.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary/95 transition-all shadow-soft"
        >
          <Plus className="w-4 h-4" /> Raise Ticket
        </button>
      </header>

      <div className="space-y-4">
        {tickets.length === 0 && <div className="p-12 text-center text-muted-foreground border border-border bg-card rounded-sm shadow-soft">No active tickets found.</div>}
        {tickets.map((t) => (
          <div
            key={t.id}
            onClick={() => setSelectedTicketId(t.id)}
            className="p-5 border border-border bg-card rounded-sm flex items-center justify-between gap-6 cursor-pointer hover:border-primary/50 transition-all shadow-soft"
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">{t.ticket_number}</span>
                <span className="font-display text-xl text-foreground font-semibold">{t.subject}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                  t.priority === "Critical" ? "bg-red-100 text-red-800" :
                  t.priority === "High" ? "bg-orange-100 text-orange-800" : "bg-muted text-muted-foreground"
                }`}>{t.priority} Priority</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                Category: {t.category} · From: {t.profiles?.full_name} · Created: {new Date(t.created_at).toLocaleDateString()}
              </div>
              {t.assigned_department && (
                <div className="text-xs text-gold-foreground font-semibold mt-1 bg-gold/10 inline-block px-1.5 py-0.5 rounded-sm">Assigned: {t.assigned_department}</div>
              )}
            </div>
            <span className={`text-xs px-2.5 py-0.5 font-semibold rounded-sm border ${
              t.status === "Resolved" || t.status === "Closed" ? "bg-green-100 text-green-800 border-green-200" : "bg-gold/20 text-gold-foreground border-gold-300"
            }`}>{t.status}</span>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-sm max-w-lg w-full shadow-elegant max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-2xl">Raise Support Ticket</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">Category</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="input-field w-full mt-1">
                    <option value="Payroll">Payroll / Payslip</option>
                    <option value="Leave">Leave / Attendance</option>
                    <option value="Identity">Identity / Access</option>
                    <option value="Regulatory">JNTUH / Regulatory</option>
                    <option value="Timetable">Academic / Timetable</option>
                    <option value="Course File">Course File</option>
                    <option value="Infrastructure">Infrastructure / Lab</option>
                    <option value="Certificates">Certificates / Service Docs</option>
                    <option value="Grievance">Grievance / Confidential</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">Priority</span>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="input-field w-full mt-1">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Subject</span>
                <input required value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field w-full mt-1" />
              </label>

              <label className="block">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Detailed Description</span>
                <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="input-field w-full mt-1" />
              </label>

              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={isConfidential} onChange={(e) => setIsConfidential(e.target.checked)} className="rounded-sm" />
                <span className="text-xs text-muted-foreground">Mark this ticket as confidential (restricted to Principal/Grievance Committee)</span>
              </label>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-parchment/20">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .input-field { padding: 0.6rem 0.8rem; border: 1px solid var(--color-border); border-radius: 0.125rem; background: var(--color-parchment); font-size: 0.9rem; }
        .input-field:focus { outline: none; border-color: var(--color-primary); }
      `}</style>
    </div>
  );

  // helper removed — use setPriority directly
}

function TicketDetailView({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { user, primaryRole } = useAuthState();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // Forward state
  const [showForward, setShowForward] = useState(false);
  const [forwardDept, setForwardDept] = useState("HR");

  const loadDetail = async () => {
    setLoading(true);
    try {
      const { data: tkt } = await supabase
        .from("tickets")
        .select("*, profiles(full_name, email)")
        .eq("id", ticketId)
        .single();
      
      const { data: msgs } = await supabase
        .from("ticket_messages")
        .select("*, profiles(full_name, email)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      setTicket(tkt);
      setMessages(msgs ?? []);
    } catch (err: any) {
      toast.error("Failed to load details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDetail(); }, [ticketId]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await replyTicket({
        data: {
          ticketId,
          message: replyText,
          isInternal: false,
        },
      });
      setReplyText("");
      loadDetail();
    } catch (err: any) {
      toast.error("Failed to reply: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleForwardSubmit = async () => {
    try {
      await forwardTicket({
        data: {
          ticketId,
          department: forwardDept as any,
        },
      });
      toast.success(`Ticket escalated to ${forwardDept}`);
      setShowForward(false);
      loadDetail();
    } catch (err: any) {
      toast.error("Forwarding failed: " + err.message);
    }
  };

  const closeTicketAction = async () => {
    if (!confirm("Are you sure you want to close this ticket?")) return;
    const { error } = await supabase.from("tickets").update({ status: "Closed" }).eq("id", ticketId);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket closed and locked for audit trail");
    loadDetail();
  };

  if (loading || !ticket) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isPrivileged = ["hod", "dean", "principal", "super_admin", "admin_staff"].includes(primaryRole || "");

  return (
    <div className="p-8 lg:p-10 max-w-4xl mx-auto flex flex-col h-[85vh]">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground mb-6 font-semibold shrink-0">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Tickets
      </button>

      <header className="mb-6 flex justify-between items-start gap-4 border-b border-border/40 pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">{ticket.ticket_number}</span>
            <span className="text-xs text-muted-foreground font-semibold uppercase">{ticket.category}</span>
          </div>
          <h1 className="font-display text-3xl text-foreground mt-2 font-semibold">{ticket.subject}</h1>
          <p className="text-xs text-muted-foreground mt-1">Raised by {ticket.profiles?.full_name} · Status: {ticket.status}</p>
        </div>
        <div className="flex gap-2">
          {isPrivileged && ticket.status !== "Closed" && (
            <>
              <button onClick={() => setShowForward(true)} className="px-3 py-1.5 border border-border hover:bg-muted text-xs font-semibold rounded-sm inline-flex items-center gap-1.5"><Forward className="w-3.5 h-3.5" /> Forward</button>
              <button onClick={closeTicketAction} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-sm inline-flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Resolve</button>
            </>
          )}
        </div>
      </header>

      {/* Messages Thread list */}
      <div className="flex-1 overflow-y-auto border border-border bg-card rounded-sm p-4 space-y-4 mb-4">
        {messages.map((m) => {
          const isSenderSelf = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex flex-col ${isSenderSelf ? "items-end" : "items-start"}`}>
              <div className="text-[10px] text-muted-foreground mb-0.5">{m.profiles?.full_name} · {new Date(m.created_at).toLocaleTimeString()}</div>
              <div className={`px-4 py-2.5 rounded-sm text-sm max-w-lg ${
                isSenderSelf ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}>{m.message}</div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "Closed" && (
        <form onSubmit={handleReplySubmit} className="flex gap-2 shrink-0">
          <input
            required
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type comment or response..."
            className="input-field flex-1"
          />
          <button type="submit" disabled={sending} className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-sm inline-flex items-center gap-1.5">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Reply
          </button>
        </form>
      )}

      {/* Forward Modal */}
      {showForward && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-sm p-6 max-w-sm w-full shadow-elegant">
            <h3 className="font-display text-2xl mb-4">Escalate Support Ticket</h3>
            <label className="block">
              <span className="text-xs uppercase text-muted-foreground font-semibold">Forward to Unit</span>
              <select value={forwardDept} onChange={(e) => setForwardDept(e.target.value)} className="input-field w-full mt-2">
                <option value="HR">HR Department</option>
                <option value="Accounts">Accounts / Payroll</option>
                <option value="IT">IT Administration</option>
                <option value="IQAC">IQAC Committee</option>
                <option value="Exam Branch">Exam Branch</option>
                <option value="Infrastructure">Infrastructure / Lab</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForward(false)} className="px-4 py-2 border border-border text-xs">Cancel</button>
              <button onClick={handleForwardSubmit} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-sm">Confirm Forward</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input-field { padding: 0.6rem 0.8rem; border: 1px solid var(--color-border); border-radius: 0.125rem; background: var(--color-parchment); font-size: 0.9rem; }
        .input-field:focus { outline: none; border-color: var(--color-primary); }
      `}</style>
    </div>
  );
}
