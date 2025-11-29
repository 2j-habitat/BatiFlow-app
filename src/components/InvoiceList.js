import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
} from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import { formatCurrency } from "../lib/utils";
import { Briefcase, Euro, ChevronRight } from "lucide-react";

const InvoiceList = ({ user, onView }) => {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "artifacts", appId, "users", user.uid, "invoices")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInvoices(docs.sort((a, b) => b.id - a.id));
    });
    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = async (e, invoice) => {
    e.stopPropagation(); // Empêche d'ouvrir la facture quand on change juste le statut
    const newStatus = e.target.value;
    try {
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "users",
          user.uid,
          "invoices",
          String(invoice.id)
        ),
        {
          status: newStatus,
        }
      );
    } catch (err) {
      console.error("Erreur update statut", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 animate-page">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex gap-2 items-center">
          <Briefcase className="text-green-600" /> Factures
        </h2>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-50">
          {invoices.map((i) => (
            <div
              key={i.id}
              onClick={() => onView(i.id)}
              className="flex justify-between items-center p-5 hover:bg-green-50/30 cursor-pointer transition group"
            >
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100 shadow-sm">
                  <Euro size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-800">{i.clientName}</div>
                  <div className="text-xs font-medium text-slate-400 mt-0.5">
                    {i.number} • {i.date}
                  </div>
                </div>
              </div>

              <div className="text-right flex items-center gap-6">
                <div>
                  <div className="font-mono font-bold text-slate-700 text-lg">
                    {formatCurrency(i.total)}
                  </div>
                  <select
                    onClick={(e) => e.stopPropagation()}
                    value={i.status}
                    onChange={(e) => handleStatusChange(e, i)}
                    className={`mt-1 text-[10px] px-2 py-1 rounded-md border-none outline-none font-bold uppercase cursor-pointer transition hover:opacity-80 ${
                      i.status === "Payée"
                        ? "bg-green-100 text-green-700"
                        : i.status === "En retard"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    <option value="En attente">En attente</option>
                    <option value="Payée">Payée</option>
                    <option value="En retard">En retard</option>
                  </select>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-green-600 group-hover:border-green-200 transition shadow-sm">
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))}

          {invoices.length === 0 && (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Briefcase size={32} />
              </div>
              <p className="text-slate-400 font-medium">
                Aucune facture émise.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;
