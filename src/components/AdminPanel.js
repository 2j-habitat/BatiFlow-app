import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Users,
  Shield,
  Activity,
  Search,
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  CreditCard,
} from "lucide-react";
import Button from "./ui/Button";

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    // 1. Charger TOUS les utilisateurs (Clients de votre SaaS)
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Charger les Tickets de Support
    const unsubTickets = onSnapshot(
      collection(db, "support_tickets"),
      (snapshot) => {
        setTickets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => {
      unsubUsers();
      unsubTickets();
    };
  }, []);

  // Action : Changer le plan d'un utilisateur manuellement (ex: geste commercial)
  const handleUpdatePlan = async (userId, newPlan) => {
    if (
      window.confirm("Forcer le changement d'abonnement pour cet utilisateur ?")
    ) {
      await updateDoc(doc(db, "users", userId), {
        plan: newPlan,
        subscriptionStatus: "active",
      });
    }
  };

  // Action : Marquer un ticket comme résolu
  const resolveTicket = async (ticketId) => {
    await updateDoc(doc(db, "support_tickets", ticketId), {
      status: "resolved",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 animate-page pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-purple-600" /> Panneau Super-Admin
          </h2>
          <p className="text-slate-500 text-sm">
            Gestion de votre SaaS et support client.
          </p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${
              activeTab === "users"
                ? "bg-purple-100 text-purple-700"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Utilisateurs ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${
              activeTab === "tickets"
                ? "bg-purple-100 text-purple-700"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Tickets Support (
            {tickets.filter((t) => t.status !== "resolved").length})
          </button>
        </div>
      </div>

      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="p-4">Client / Entreprise</th>
                <th className="p-4">Email</th>
                <th className="p-4">Abonnement</th>
                <th className="p-4">Date inscription</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-bold text-slate-800">
                    {user.companyName || "Sans nom"}
                  </td>
                  <td className="p-4 text-slate-500">{user.email}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                        user.subscriptionStatus === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.plan || "Gratuit"}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          handleUpdatePlan(user.id, "business_monthly")
                        }
                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100"
                      >
                        Forcer Business
                      </button>
                      <button
                        onClick={() => handleUpdatePlan(user.id, "free")}
                        className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100"
                      >
                        Couper accès
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "tickets" && (
        <div className="space-y-4">
          {tickets.length === 0 && (
            <div className="text-center text-slate-400 py-12">
              Aucun ticket de support. Tout roule ! 🚀
            </div>
          )}
          {tickets
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((ticket) => (
              <div
                key={ticket.id}
                className={`p-5 rounded-xl border transition flex justify-between items-start ${
                  ticket.status === "resolved"
                    ? "bg-slate-50 border-slate-200 opacity-60"
                    : "bg-white border-orange-200 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800">
                      {ticket.userEmail}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {new Date(ticket.date).toLocaleString()}
                    </span>
                    {ticket.status === "resolved" && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                        RÉSOLU
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-700 mb-2">
                    {ticket.subject}
                  </h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {ticket.message}
                  </p>
                </div>
                {ticket.status !== "resolved" && (
                  <Button
                    variant="primary"
                    onClick={() => resolveTicket(ticket.id)}
                    icon={CheckCircle}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Traiter
                  </Button>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
