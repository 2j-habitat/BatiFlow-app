import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import { formatCurrency } from "../lib/utils";
import {
  FileText,
  Briefcase,
  Plus,
  Search,
  ChevronRight,
  FolderOpen,
  Receipt,
  Filter,
} from "lucide-react";
import Button from "./ui/Button";

// AJOUT DE LA PROP 'initialFilter'
const DocumentsManager = ({ user, onOpenEditor, initialFilter }) => {
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");

  // MISE A JOUR DU FILTRE QUAND ON ARRIVE DEPUIS LE DASHBOARD
  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  // ... (Reste du chargement des données et des helpers inchangé)
  useEffect(() => {
    if (!user) return;
    const unsubQuotes = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "quotes"),
      (s) => setQuotes(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubInvoices = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "invoices"),
      (s) => setInvoices(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubQuotes();
      unsubInvoices();
    };
  }, [user]);

  const handleStatusChange = async (e, invoice) => {
    e.stopPropagation();
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
        { status: e.target.value }
      );
    } catch (err) {
      console.error(err);
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "Payée":
        return "bg-green-100 text-green-700 border-green-200";
      case "En retard":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  useEffect(() => {
    const grouped = quotes.map((quote) => {
      const linkedInvoices = invoices.filter(
        (inv) => inv.sourceQuote === quote.number
      );
      const totalTTC = quote.total || 0;
      const totalPaid = linkedInvoices
        .filter((inv) => inv.status === "Payée")
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      const remaining = totalTTC - totalPaid;
      const progress =
        totalTTC > 0 ? Math.round((totalPaid / totalTTC) * 100) : 0;
      return {
        ...quote,
        linkedInvoices: linkedInvoices.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        ),
        financials: { totalTTC, totalPaid, remaining, progress },
      };
    });
    const orphanedInvoices = invoices.filter((inv) => !inv.sourceQuote);
    if (orphanedInvoices.length > 0) {
      orphanedInvoices.forEach((inv) => {
        grouped.push({
          id: inv.id,
          number: "Sans Devis",
          clientName: inv.clientName,
          date: inv.date,
          status: "Facture Directe",
          isOrphan: true,
          linkedInvoices: [inv],
          financials: {
            totalTTC: inv.total,
            totalPaid: inv.status === "Payée" ? inv.total : 0,
            remaining: inv.status === "Payée" ? 0 : inv.total,
            progress: inv.status === "Payée" ? 100 : 0,
          },
        });
      });
    }
    setProjects(grouped.sort((a, b) => new Date(b.date) - new Date(a.date)));
  }, [quotes, invoices]);

  const filteredProjects = projects.filter((p) => {
    const matchesText =
      p.clientName?.toLowerCase().includes(filter.toLowerCase()) ||
      p.number?.toLowerCase().includes(filter.toLowerCase());
    let matchesStatus = true;
    if (statusFilter !== "Tous") {
      const isQuoteMatch = p.status === statusFilter;
      const isInvoiceMatch = p.linkedInvoices.some(
        (inv) => inv.status === statusFilter
      );
      matchesStatus = isQuoteMatch || isInvoiceMatch;
    }
    return matchesText && matchesStatus;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 animate-page pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex gap-2 items-center">
            <FolderOpen className="text-blue-600" /> Devis & Factures
          </h2>
          <p className="text-slate-500 text-sm">
            Suivi centralisé de vos dossiers clients.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => onOpenEditor(null, "invoice")}
            variant="secondary"
            icon={Plus}
            className="text-xs"
          >
            Facture Directe
          </Button>
          <Button
            onClick={() => onOpenEditor(null, "quote")}
            variant="primary"
            icon={Plus}
          >
            Nouveau Devis
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
            placeholder="Rechercher un client, un chantier..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
          <Filter size={16} className="text-slate-400 ml-2" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent outline-none text-sm text-slate-600 font-medium p-2 pr-8 cursor-pointer w-full"
          >
            <option value="Tous">Tous les statuts</option>
            <option value="Brouillon">Brouillon</option>
            <option value="En attente">En attente</option>
            <option value="Signé">Devis Signé</option>
            <option value="Payée">Facture Payée</option>
            <option value="En retard">En retard</option>
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition"
          >
            <div
              className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4 cursor-pointer"
              onClick={() =>
                !project.isOrphan && onOpenEditor(project.id, "quote")
              }
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-sm text-lg shrink-0 ${
                    project.financials.progress === 100
                      ? "bg-green-500"
                      : "bg-blue-600"
                  }`}
                >
                  {project.clientName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {project.clientName}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <FileText size={14} />
                    <span className="font-medium">{project.number}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>{project.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 w-full md:w-auto bg-white md:bg-transparent p-3 md:p-0 rounded-xl border md:border-none border-slate-200">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Devis
                  </div>
                  <div className="font-extrabold text-slate-800">
                    {formatCurrency(project.financials.totalTTC)}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Reste à payer
                  </div>
                  <div
                    className={`font-extrabold ${
                      project.financials.remaining <= 0
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    {formatCurrency(project.financials.remaining)}
                  </div>
                </div>
              </div>
            </div>
            {!project.isOrphan && (
              <div className="h-1.5 w-full bg-slate-100">
                <div
                  className={`h-full transition-all duration-1000 ${
                    project.financials.progress === 100
                      ? "bg-green-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${project.financials.progress}%` }}
                ></div>
              </div>
            )}
            <div className="p-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                <Receipt size={14} /> Historique de facturation
              </h4>
              <div className="space-y-3">
                {!project.isOrphan && (
                  <div
                    onClick={() => onOpenEditor(project.id, "quote")}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-blue-200 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
                        <FileText size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700">
                          Devis Initial
                        </div>
                        <div
                          className={`text-[10px] inline-block px-2 py-0.5 rounded mt-1 font-bold uppercase ${
                            project.status === "Signé"
                              ? "bg-green-100 text-green-700"
                              : project.status === "En attente"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {project.status}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-slate-600">
                        {formatCurrency(project.financials.totalTTC)}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-blue-500"
                      />
                    </div>
                  </div>
                )}
                {project.linkedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => onOpenEditor(inv.id, "invoice")}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-green-50/30 hover:border-green-200 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-green-100 text-green-600 rounded-md relative">
                        <Receipt size={16} />
                        <div className="absolute -top-4 left-1/2 -ml-px w-px h-4 bg-slate-200"></div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700">
                          {inv.total < project.financials.totalTTC
                            ? "Facture d'Acompte"
                            : "Facture Totale"}{" "}
                          <span className="font-normal text-slate-400">
                            #{inv.number}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div onClick={(e) => e.stopPropagation()}>
                            <select
                              value={inv.status}
                              onChange={(e) => handleStatusChange(e, inv)}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase cursor-pointer outline-none border-none transition hover:opacity-80 ${getStatusColor(
                                inv.status
                              )}`}
                            >
                              <option value="En attente">En attente</option>
                              <option value="Payée">Payée</option>
                              <option value="En retard">En retard</option>
                            </select>
                          </div>
                          <span className="text-xs text-slate-400">
                            {inv.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-slate-800">
                        {formatCurrency(inv.total)}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-green-600"
                      />
                    </div>
                  </div>
                ))}
                {!project.isOrphan &&
                  project.status === "Signé" &&
                  project.financials.remaining > 0 && (
                    <div className="pl-9 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditor(project.id, "quote");
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition hover:translate-x-1"
                      >
                        <Plus size={14} /> Créer une facture pour ce dossier
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        ))}
        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FolderOpen size={48} />
            </div>
            <p className="text-slate-400 font-medium">Aucun dossier trouvé.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsManager;
