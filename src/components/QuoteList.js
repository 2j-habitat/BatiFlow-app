import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import { formatCurrency } from "../lib/utils";
import { FileText, Plus, Search, Filter, ChevronRight } from "lucide-react";
import Button from "./ui/Button";

const QuoteList = ({ user, onCreate, onEdit }) => {
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState("Tous");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) return;
    // On récupère les devis en temps réel
    const q = query(
      collection(db, "artifacts", appId, "users", user.uid, "quotes")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Tri par date décroissante (simulation car date stockée en string pour l'instant)
      setQuotes(docs.sort((a, b) => b.id - a.id));
    });
    return () => unsubscribe();
  }, [user]);

  const filteredQuotes = quotes.filter((q) => {
    const matchesFilter = filter === "Tous" || q.status === filter;
    const matchesSearch =
      q.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 animate-page">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex gap-2 items-center">
          <FileText className="text-blue-600" /> Devis
        </h2>
        <Button onClick={onCreate} icon={Plus}>
          Nouveau Devis
        </Button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              className="pl-10 pr-4 py-2 w-full text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Rechercher un client, un numéro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 outline-none bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="Tous">Tous les états</option>
              <option value="Brouillon">Brouillon</option>
              <option value="En attente">En attente</option>
              <option value="Signé">Signé</option>
            </select>
          </div>
        </div>

        {/* Liste */}
        <div className="divide-y divide-slate-50">
          {filteredQuotes.map((q) => (
            <div
              key={q.id}
              onClick={() => onEdit(q.id)}
              className="flex justify-between items-center p-5 hover:bg-blue-50/30 cursor-pointer transition group"
            >
              <div className="flex gap-4 items-center">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm text-lg ${
                    q.status === "Signé"
                      ? "bg-gradient-to-br from-green-400 to-green-600"
                      : q.status === "En attente"
                      ? "bg-gradient-to-br from-orange-400 to-orange-600"
                      : "bg-gradient-to-br from-slate-400 to-slate-600"
                  }`}
                >
                  {q.clientName?.charAt(0) || "?"}
                </div>
                <div>
                  <div className="font-bold text-slate-800 group-hover:text-blue-700 transition">
                    {q.clientName}
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-0.5">
                    {q.number} • {q.date}
                  </div>
                </div>
              </div>

              <div className="text-right flex items-center gap-6">
                <div>
                  <div className="font-mono font-bold text-slate-700 text-lg">
                    {formatCurrency(q.total)}
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                      q.status === "Signé"
                        ? "bg-green-100 text-green-700"
                        : q.status === "En attente"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:border-blue-200 transition shadow-sm">
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))}

          {filteredQuotes.length === 0 && (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <FileText size={32} />
              </div>
              <p className="text-slate-400 font-medium">Aucun devis trouvé.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteList;
