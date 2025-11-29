import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import { formatCurrency } from "../lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  Clock,
  ArrowRight,
  Euro,
  Cloud,
  Database,
  Calendar,
  Briefcase,
  Lock,
  Crown,
  Hammer,
  HardHat,
  BarChart3,
  Filter,
  CalendarDays,
  PlusCircle,
  UserPlus,
  FileText,
  Zap,
  Download,
  ChevronRight,
  PieChart,
} from "lucide-react";
import Button from "./ui/Button";

// --- DONUT CHART (Inchangé) ---
const DonutChart = ({ data }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let currentAngle = 0;
  const radius = 40;
  const centerX = 50;
  const centerY = 50;
  if (total === 0)
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <PieChart size={48} className="mb-2 opacity-20" />
        <p className="text-sm">Pas de données sur cette période</p>
      </div>
    );
  return (
    <div className="flex flex-col md:flex-row items-center gap-8 p-6">
      <div className="w-48 h-48 relative shrink-0">
        <svg
          viewBox="0 0 100 100"
          className="transform -rotate-90 w-full h-full overflow-visible"
        >
          {data.map((item, index) => {
            if (item.value === 0) return null;
            const percentage = item.value / total;
            const strokeDasharray = `${percentage * 2 * Math.PI * radius} ${
              2 * Math.PI * radius
            }`;
            const strokeDashoffset = -currentAngle * 2 * Math.PI * radius;
            currentAngle += percentage;
            return (
              <circle
                key={index}
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer"
              />
            );
          })}
          <g className="transform rotate-90 origin-center">
            <text
              x="50%"
              y="45%"
              textAnchor="middle"
              dy=".3em"
              className="text-[10px] fill-slate-400 font-bold"
            >
              TOTAL CA
            </text>
            <text
              x="50%"
              y="60%"
              textAnchor="middle"
              dy=".3em"
              className="text-[14px] fill-slate-800 font-extrabold"
            >
              {formatCurrency(total)}
            </text>
          </g>
        </svg>
      </div>
      <div className="flex-1 w-full space-y-4">
        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          Répartition du Chiffre d'Affaires
        </h4>
        {data.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm font-medium text-slate-600">
                {item.label}
              </span>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-800">
                {formatCurrency(item.value)}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {Math.round((item.value / total) * 100)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ user, onNavigate, onCreateDocument }) => {
  const [stats, setStats] = useState({
    ca: 0,
    caLabor: 0,
    caMaterial: 0,
    pendingQuotes: 0,
    invoicesCount: 0,
  });
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [userPlan, setUserPlan] = useState("free");
  const [caView, setCaView] = useState("total");
  const [recentActivity, setRecentActivity] = useState([]);
  const [siteTasks, setSiteTasks] = useState([]);
  const [generalEvents, setGeneralEvents] = useState([]);
  const [useLocalMode, setUseLocalMode] = useState(false);
  const [allInvoices, setAllInvoices] = useState([]);

  const hour = new Date().getHours();
  const greeting = hour < 18 ? "Bonjour" : "Bonsoir";

  useEffect(() => {
    if (!user) return;
    onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setUserPlan(docSnap.data().plan || "free");
      else if (user.isAnonymous) setUserPlan("business_monthly");
    });

    const unsub1 = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "invoices"),
      (s) => {
        let totalCA = 0;
        let totalLabor = 0;
        let totalMaterial = 0;
        const activity = [];
        const invoicesData = [];
        s.docs.forEach((doc) => {
          const data = doc.data();
          invoicesData.push(data);
          if (data.status === "Payée") {
            totalCA += data.total || 0;
            if (data.sections) {
              let invoiceLabor = 0;
              let invoiceMaterial = 0;
              data.sections.forEach((sec) => {
                if (sec.items) {
                  sec.items.forEach((item) => {
                    const linePrice = (item.qty || 0) * (item.price || 0);
                    const itemVAT = item.vat !== undefined ? item.vat : 20;
                    const lineTTC = linePrice * (1 + itemVAT / 100);
                    if (item.nature === "labor") invoiceLabor += lineTTC;
                    else invoiceMaterial += lineTTC;
                  });
                }
              });
              const rawTotal = invoiceLabor + invoiceMaterial;
              if (rawTotal > 0) {
                const ratio = data.total / rawTotal;
                totalLabor += invoiceLabor * ratio;
                totalMaterial += invoiceMaterial * ratio;
              }
            }
            activity.push({
              type: "invoice",
              date: data.date,
              client: data.clientName,
              amount: data.total,
              status: data.status,
              id: doc.id,
            });
          }
        });
        setAllInvoices(invoicesData);
        activity.sort((a, b) => {
          const dateA = a.date
            ? new Date(a.date.split("/").reverse().join("-"))
            : new Date();
          const dateB = b.date
            ? new Date(b.date.split("/").reverse().join("-"))
            : new Date();
          return dateB - dateA;
        });
        setStats((prev) => ({
          ...prev,
          ca: totalCA,
          caLabor: totalLabor,
          caMaterial: totalMaterial,
          invoicesCount: s.size,
        }));
        setRecentActivity(activity.slice(0, 4));
      },
      () => setUseLocalMode(true)
    );

    const unsub2 = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "quotes"),
      (s) => {
        // COMPTEUR CORRIGÉ : Brouillon + En attente
        const pending = s.docs.filter(
          (d) =>
            d.data().status === "En attente" || d.data().status === "Brouillon"
        ).length;
        setStats((prev) => ({ ...prev, pendingQuotes: pending }));
      }
    );

    const unsubSites = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "sites"),
      (snapshot) => {
        const sites = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSiteTasks(
          sites.flatMap((site) =>
            (site.planning || []).map((t) => ({
              ...t,
              type: "site",
              siteName: site.name,
              color: "bg-blue-50 text-blue-700 border-blue-100",
            }))
          )
        );
      }
    );
    const unsubGeneral = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "planning"),
      (snapshot) => {
        setGeneralEvents(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            type: "general",
            color: "bg-purple-50 text-purple-700 border-purple-100",
          }))
        );
      }
    );
    return () => {
      unsub1();
      unsub2();
      unsubSites();
      unsubGeneral();
    };
  }, [user]);

  useEffect(() => {
    const allTasks = [...siteTasks, ...generalEvents];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const upcoming = allTasks
      .filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= today && tDate <= nextWeek;
      })
      .sort(
        (a, b) =>
          new Date(a.date + (a.time || "")) - new Date(b.date + (b.time || ""))
      );
    setWeeklyTasks(upcoming);
  }, [siteTasks, generalEvents]);

  const isBusiness = userPlan && userPlan.includes("business");
  const handleExportAccounting = () => {
    if (allInvoices.length === 0) {
      alert("Aucune facture.");
      return;
    }
    const headers = ["Numéro", "Date", "Client", "Total TTC", "Statut"];
    const rows = allInvoices.map((inv) => [
      inv.number,
      inv.date,
      `"${inv.clientName}"`,
      inv.total.toFixed(2).replace(".", ","),
      inv.status,
    ]);
    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `export_comptable.csv`;
    link.click();
  };
  const getCaCardStyle = () => {
    switch (caView) {
      case "labor":
        return {
          bg: "bg-gradient-to-br from-indigo-500 to-indigo-700",
          text: "text-white",
          iconBg: "bg-white/20 text-white",
          title: "CA Main d'oeuvre",
        };
      case "material":
        return {
          bg: "bg-gradient-to-br from-orange-500 to-red-600",
          text: "text-white",
          iconBg: "bg-white/20 text-white",
          title: "CA Matériel",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-slate-800 to-slate-900",
          text: "text-white",
          iconBg: "bg-white/20 text-white",
          title: "Chiffre d'Affaires",
        };
    }
  };
  const caStyle = getCaCardStyle();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 animate-page pb-24">
      {/* Header (Inchangé) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <p className="text-slate-500 font-medium text-sm mb-1">{greeting},</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            {user.email ? user.email.split("@")[0] : "Artisan"}{" "}
            <span className="text-2xl">👋</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAccounting}
            className="bg-white text-slate-700 px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2 text-xs font-bold hover:bg-slate-50 transition"
          >
            <Download size={16} className="text-green-600" /> Export Compta
          </button>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
            <span
              className={`px-2 py-1 text-[10px] md:text-xs rounded-lg flex items-center gap-1.5 font-bold ${
                useLocalMode
                  ? "bg-orange-50 text-orange-600"
                  : "bg-green-50 text-green-600"
              }`}
            >
              {useLocalMode ? <Database size={12} /> : <Cloud size={12} />}{" "}
              {useLocalMode ? "Hors ligne" : "Connecté"}
            </span>
          </div>
        </div>
      </div>

      {/* Actions Rapides (Inchangé) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <button
          onClick={() => onCreateDocument(null, "quote")}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition flex flex-col items-center gap-2 group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText size={20} />
          </div>
          <span className="text-xs font-bold text-slate-600">
            Nouveau Devis
          </span>
        </button>
        <button
          onClick={() => onCreateDocument(null, "invoice")}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-green-300 transition flex flex-col items-center gap-2 group"
        >
          <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Euro size={20} />
          </div>
          <span className="text-xs font-bold text-slate-600">
            Nouvelle Facture
          </span>
        </button>
        <button
          onClick={() => onNavigate("clients")}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition flex flex-col items-center gap-2 group"
        >
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <UserPlus size={20} />
          </div>
          <span className="text-xs font-bold text-slate-600">
            Ajouter Client
          </span>
        </button>
        <button
          onClick={() => onNavigate("chantiers")}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 transition flex flex-col items-center gap-2 group"
        >
          <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <HardHat size={20} />
          </div>
          <span className="text-xs font-bold text-slate-600">
            Nouveau Chantier
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        {/* CARTE CA */}
        <div
          className={`p-6 rounded-2xl shadow-lg transition-all duration-300 relative overflow-hidden group ${caStyle.bg}`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${caStyle.iconBg}`}
            >
              {caView === "labor" ? (
                <HardHat size={24} />
              ) : caView === "material" ? (
                <Hammer size={24} />
              ) : (
                <TrendingUp size={24} />
              )}
            </div>
            <select
              value={caView}
              onChange={(e) => setCaView(e.target.value)}
              className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide border border-white/30 outline-none cursor-pointer hover:bg-white/30 transition"
            >
              <option value="total" className="text-slate-800">
                Total
              </option>
              <option value="labor" className="text-slate-800">
                M. Oeuvre
              </option>
              <option value="material" className="text-slate-800">
                Matériel
              </option>
            </select>
          </div>
          <div className="relative z-10">
            <div
              className={`text-xs font-bold uppercase mb-1 opacity-80 ${caStyle.text}`}
            >
              {caStyle.title}
            </div>
            <div
              className={`text-3xl md:text-4xl font-extrabold tracking-tight ${caStyle.text}`}
            >
              {formatCurrency(
                caView === "total"
                  ? stats.ca
                  : caView === "labor"
                  ? stats.caLabor
                  : stats.caMaterial
              )}
            </div>
          </div>
        </div>

        {/* Carte Devis - SANS FLÈCHE, FILTRE "EN ATTENTE" */}
        <div
          onClick={() => onNavigate("gestion", "En attente")}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-lg hover:border-orange-200 transition-all group relative"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock size={24} />
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase mb-1">
              En cours
            </div>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
              {stats.pendingQuotes}{" "}
              <span className="text-base font-normal text-slate-400">
                devis
              </span>
            </div>
          </div>
        </div>

        {/* Carte Factures - SANS FLÈCHE */}
        <div
          onClick={() => onNavigate("gestion")}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-lg hover:border-green-200 transition-all group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Euro size={24} />
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase mb-2">
              Derniers paiements
            </div>
            <div className="space-y-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((act, i) => (
                  <div
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCreateDocument) onCreateDocument(act.id, "invoice");
                    }}
                    className="flex justify-between items-center text-xs p-1.5 -mx-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition group/item"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>
                      <span className="text-slate-700 truncate font-medium group-hover/item:text-blue-600">
                        {act.client}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                        +{Math.round(act.amount)}€
                      </span>
                      <ChevronRight size={12} className="text-slate-300" />
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Aucune activité
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <PieChart size={20} className="text-indigo-600" /> Répartition du CA
          </h3>
        </div>
        <DonutChart
          data={[
            { label: "Main d'œuvre", value: stats.caLabor, color: "#4f46e5" },
            { label: "Matériel", value: stats.caMaterial, color: "#f97316" },
          ]}
        />
      </div>

      <div className="relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <Calendar size={20} className="text-purple-600" /> Planning de la
            semaine{" "}
            {!isBusiness && (
              <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold flex items-center gap-1">
                <Lock size={10} /> Business
              </span>
            )}
          </h3>
          {isBusiness && (
            <button
              onClick={() => onNavigate("chantiers")}
              className="text-xs font-bold text-purple-600 hover:text-purple-800 transition bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100"
            >
              Voir tout
            </button>
          )}
        </div>
        {isBusiness ? (
          <div className="divide-y divide-slate-50">
            {weeklyTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Calendar size={32} className="opacity-20" />
                </div>
                <p>Rien de prévu.</p>
              </div>
            ) : (
              weeklyTasks.map((task, idx) => (
                <div
                  key={idx}
                  className="p-4 flex items-start gap-4 hover:bg-slate-50 transition group"
                >
                  <div
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border shrink-0 shadow-sm ${
                      task.type === "general"
                        ? "bg-purple-50 text-purple-700 border-purple-100"
                        : "bg-blue-50 text-blue-700 border-blue-100"
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wide">
                      {new Date(task.date).toLocaleDateString("fr-FR", {
                        weekday: "short",
                      })}
                    </span>
                    <span className="text-xl font-extrabold leading-none">
                      {new Date(task.date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-slate-800 text-sm truncate pr-2 group-hover:text-blue-600 transition">
                        {task.title}
                      </h4>
                      {task.time && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={10} /> {task.time}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      {task.type === "site" ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>{" "}
                          {task.siteName}
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>{" "}
                          RDV / Perso
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gradient-to-b from-slate-50 to-white min-h-[250px]">
            <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mb-4 text-orange-500 relative">
              <div className="absolute inset-0 bg-orange-50 rounded-full animate-pulse opacity-50"></div>
              <Crown
                size={32}
                className="fill-orange-500 text-orange-600 relative z-10"
              />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                <Lock size={12} className="text-slate-400" />
              </div>
            </div>
            <h4 className="font-bold text-lg text-slate-800 mb-2">
              Fonctionnalité Business
            </h4>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto text-xs leading-relaxed">
              Débloquez la vue planning et le suivi de chantier.
            </p>
            <button
              onClick={() => onNavigate("settings")}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-slate-800 transition transform hover:scale-105 flex items-center gap-2"
            >
              Découvrir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
