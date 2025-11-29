import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import { formatCurrency } from "../lib/utils";
// CORRECTION : Toutes les icônes nécessaires sont bien là, y compris 'Check' et 'Download'
import {
  HardHat,
  Plus,
  Search,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Camera,
  MessageSquare,
  ShoppingCart,
  Receipt,
  CheckCircle2,
  Circle,
  Trash2,
  ArrowLeft,
  Clock,
  MoreVertical,
  Image as ImageIcon,
  AlertTriangle,
  UserPlus,
  User,
  X,
  Send,
  Check,
  Maximize2,
  Download,
  TrendingUp,
  CalendarDays,
  Briefcase,
  Layers,
  ArrowRight,
  Navigation,
  BellRing,
  ScanLine,
} from "lucide-react";
import Button from "./ui/Button";

// --- COMPOSANT PRINCIPAL (Il manquait cette partie !) ---
const ConstructionSites = ({ user }) => {
  const [view, setView] = useState("list");
  const [activeSite, setActiveSite] = useState(null);
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);

  useEffect(() => {
    if (!user) return;

    // 1. Chantiers
    const qSites = query(
      collection(db, "artifacts", appId, "users", user.uid, "sites"),
      orderBy("updatedAt", "desc")
    );
    const unsubSites = onSnapshot(qSites, (snapshot) => {
      setSites(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Clients
    const qClients = query(
      collection(db, "artifacts", appId, "users", user.uid, "clients")
    );
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Équipe (Pour le planning)
    const qTeam = query(
      collection(db, "artifacts", appId, "users", user.uid, "team")
    );
    const unsubTeam = onSnapshot(qTeam, (snapshot) => {
      const members = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (!members.find((m) => m.email === user.email)) {
        members.unshift({
          id: "me",
          name: "Moi",
          role: "admin",
          email: user.email,
        });
      }
      setTeam(members);
    });

    return () => {
      unsubSites();
      unsubClients();
      unsubTeam();
    };
  }, [user]);

  const handleCreateSite = async (siteData) => {
    await addDoc(
      collection(db, "artifacts", appId, "users", user.uid, "sites"),
      {
        ...siteData,
        status: "In Progress",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expenses: [],
        materials: [],
        logs: [],
        planning: [],
        beforeAfter: [],
      }
    );
    setView("list");
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 animate-page pb-24">
      {view === "list" && (
        <SiteList
          sites={sites}
          onSelect={(site) => {
            setActiveSite(site);
            setView("detail");
          }}
          onNew={() => setView("new")}
        />
      )}
      {view === "new" && (
        <NewSiteForm
          user={user}
          clients={clients}
          onCancel={() => setView("list")}
          onSubmit={handleCreateSite}
        />
      )}
      {view === "detail" && activeSite && (
        <SiteDetail
          user={user}
          site={activeSite}
          team={team}
          onBack={() => {
            setActiveSite(null);
            setView("list");
          }}
        />
      )}
    </div>
  );
};

// --- VUES SECONDAIRES ---

const SiteList = ({ sites, onSelect, onNew }) => (
  <>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex gap-2 items-center">
        <HardHat className="text-orange-500" /> Suivi de Chantier
      </h2>
      <Button onClick={onNew} icon={Plus} className="text-xs md:text-sm">
        Nouveau Chantier
      </Button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sites.map((site) => (
        <div
          key={site.id}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition group relative overflow-hidden hover:-translate-y-1 flex flex-col"
        >
          <div
            className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider ${
              site.status === "In Progress"
                ? "bg-orange-100 text-orange-600"
                : "bg-green-100 text-green-600"
            }`}
          >
            {site.status === "In Progress" ? "En cours" : "Terminé"}
          </div>

          <div onClick={() => onSelect(site)} className="cursor-pointer">
            <h3 className="font-bold text-slate-800 text-lg mb-1 truncate pr-16">
              {site.name}
            </h3>
            <p className="text-slate-500 text-sm flex items-center gap-1 mb-4">
              <MapPin size={12} /> {site.address}
            </p>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
            <button
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    site.address
                  )}`,
                  "_blank"
                )
              }
              className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1 transition"
            >
              <Navigation size={12} /> Y aller
            </button>

            <button
              onClick={() => onSelect(site)}
              className="text-xs font-bold text-slate-400 group-hover:text-slate-600 flex items-center gap-1 transition"
            >
              Ouvrir <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ))}
      {sites.length === 0 && (
        <div className="col-span-full p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <HardHat className="text-slate-300" size={32} />
          </div>
          <p className="text-slate-400 font-medium mb-4">
            Aucun chantier actif.
          </p>
          <Button variant="secondary" onClick={onNew}>
            Commencer un chantier
          </Button>
        </div>
      )}
    </div>
  </>
);

const NewSiteForm = ({ user, clients, onCancel, onSubmit }) => {
  const [form, setForm] = useState({
    name: "",
    address: "",
    client: "",
    description: "",
  });
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    city: "",
  });

  const handleAddNewClient = async () => {
    if (!newClient.name) return;
    const clientId = Date.now();
    await setDoc(
      doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "clients",
        String(clientId)
      ),
      { id: clientId, ...newClient }
    );
    setForm({
      ...form,
      client: newClient.name,
      address:
        !form.address && newClient.address
          ? `${newClient.address} ${newClient.city}`
          : form.address,
    });
    setIsAddingClient(false);
    setNewClient({ name: "", address: "", email: "", phone: "", city: "" });
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100 max-w-2xl mx-auto animate-page">
      <h3 className="font-bold text-xl mb-6 text-slate-800">
        Créer un nouveau chantier
      </h3>
      <div className="space-y-5">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">
            Nom du projet
          </label>
          <input
            className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Rénovation SDB Mr Dupont"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">
            Client
          </label>
          {!isAddingClient ? (
            <div className="flex gap-2">
              <select
                className="flex-1 border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
                value={form.client}
                onChange={(e) => {
                  const selected = clients.find(
                    (c) => c.name === e.target.value
                  );
                  setForm({
                    ...form,
                    client: e.target.value,
                    address:
                      !form.address && selected
                        ? `${selected.address} ${selected.city}`
                        : form.address,
                  });
                }}
              >
                <option value="">Sélectionner un client existant...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsAddingClient(true)}
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition flex items-center gap-2 font-bold text-sm whitespace-nowrap border border-blue-100"
              >
                <UserPlus size={18} /> Nouveau
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <User size={16} className="text-blue-500" /> Création rapide
                  de client
                </h4>
                <button
                  onClick={() => setIsAddingClient(false)}
                  className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 border border-slate-100 shadow-sm"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input
                  className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nom / Entreprise *"
                  value={newClient.name}
                  onChange={(e) =>
                    setNewClient({ ...newClient, name: e.target.value })
                  }
                />
                <input
                  className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Téléphone"
                  value={newClient.phone}
                  onChange={(e) =>
                    setNewClient({ ...newClient, phone: e.target.value })
                  }
                />
                <input
                  className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Adresse"
                  value={newClient.address}
                  onChange={(e) =>
                    setNewClient({ ...newClient, address: e.target.value })
                  }
                />
                <input
                  className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ville"
                  value={newClient.city}
                  onChange={(e) =>
                    setNewClient({ ...newClient, city: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleAddNewClient}
                  disabled={!newClient.name}
                  className="py-1.5 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  Enregistrer et Sélectionner
                </Button>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">
            Adresse du chantier
          </label>
          <input
            className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="12 rue de la Paix..."
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">
            Notes initiales
          </label>
          <textarea
            rows="3"
            className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Codes d'accès, spécificités..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-50">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          variant="primary"
          onClick={() => onSubmit(form)}
          disabled={!form.name}
        >
          Créer le chantier
        </Button>
      </div>
    </div>
  );
};

const SiteDetail = ({ user, site, team, onBack }) => {
  const [tab, setTab] = useState("journal");
  const [data, setData] = useState(site);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "artifacts", appId, "users", user.uid, "sites", site.id),
      (doc) => {
        if (doc.exists()) setData({ id: doc.id, ...doc.data() });
      }
    );
    return () => unsub();
  }, [site.id, user]);

  const updateSite = async (newData) => {
    await updateDoc(
      doc(db, "artifacts", appId, "users", user.uid, "sites", site.id),
      { ...newData, updatedAt: new Date().toISOString() }
    );
  };

  const addLog = async (text, image = null) => {
    const newLog = {
      id: Date.now(),
      type: image ? "photo" : "note",
      content: text || "",
      image: image || null,
      date: new Date().toISOString(),
      author: "Moi",
    };
    await updateSite({ logs: [newLog, ...(data.logs || [])] });
  };
  const deleteLog = async (logId) => {
    if (!window.confirm("Supprimer ce message ?")) return;
    const newLogs = (data.logs || []).filter((l) => l.id !== logId);
    await updateSite({ logs: newLogs });
  };

  const addPlanningTask = async (task) => {
    await updateSite({
      planning: [...(data.planning || []), { id: Date.now(), ...task }],
    });
  };
  const deletePlanningTask = async (taskId) => {
    const newPlanning = (data.planning || []).filter((p) => p.id !== taskId);
    await updateSite({ planning: newPlanning });
  };

  const addMaterial = async (name) => {
    if (!name) return;
    const newMat = {
      id: Date.now(),
      name,
      checked: false,
      addedAt: new Date().toISOString(),
    };
    await updateDoc(
      doc(db, "artifacts", appId, "users", user.uid, "sites", site.id),
      { materials: arrayUnion(newMat) }
    );
  };
  const toggleMaterial = async (matId) => {
    const newMats = data.materials.map((m) =>
      m.id === matId ? { ...m, checked: !m.checked } : m
    );
    await updateSite({ materials: newMats });
  };
  const deleteMaterial = async (matId) => {
    const newMats = data.materials.filter((m) => m.id !== matId);
    await updateSite({ materials: newMats });
  };
  const addExpense = async (desc, amount, image = null) => {
    if (!amount) return;
    const newExp = {
      id: Date.now(),
      desc,
      amount: parseFloat(amount),
      date: new Date().toISOString(),
      image,
    };
    await updateSite({ expenses: [...(data.expenses || []), newExp] });
  };
  const deleteExpense = async (expId) => {
    const newExp = data.expenses.filter((e) => e.id !== expId);
    await updateSite({ expenses: newExp });
  };
  const addBeforeAfter = async (beforeImg, afterImg, desc) => {
    const newComp = {
      id: Date.now(),
      before: beforeImg || null,
      after: afterImg || null,
      desc: desc || "",
      date: new Date().toISOString(),
    };
    await updateDoc(
      doc(db, "artifacts", appId, "users", user.uid, "sites", site.id),
      { beforeAfter: arrayUnion(newComp) }
    );
  };
  const deleteBeforeAfter = async (id) => {
    const newComp = (data.beforeAfter || []).filter((c) => c.id !== id);
    await updateSite({ beforeAfter: newComp });
  };

  const handleNotifyClient = () => {
    alert(
      `SMS envoyé au client : "Bonjour, l'équipe BatiFlow interviendra demain sur votre chantier ${data.name}."`
    );
  };

  return (
    <div className="animate-page">
      <div className="bg-slate-900 text-white p-6 rounded-t-2xl -mt-2 md:-mt-4 mb-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start relative z-10 mb-4">
          <button
            onClick={onBack}
            className="text-slate-300 hover:text-white flex items-center gap-2 text-sm font-medium transition"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <button
            onClick={handleNotifyClient}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition border border-white/10"
          >
            <BellRing size={14} /> Notifier Client
          </button>
        </div>
        {/* CORRECTION ICI : Utilisation du nom de l'app 'BatiFlow' ou du nom du chantier si disponible */}
        <h1 className="text-2xl md:text-3xl font-bold relative z-10">
          {data.name}
        </h1>
        <div className="flex flex-wrap gap-4 mt-2 relative z-10">
          <p className="text-slate-400 flex items-center gap-2 text-sm">
            <MapPin size={14} /> {data.address}
          </p>
          {data.client && (
            <p className="text-slate-400 flex items-center gap-2 text-sm">
              <User size={14} /> {data.client}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: "journal", label: "Journal", icon: MessageSquare },
          { id: "planning", label: "Planning", icon: CalendarDays },
          { id: "materials", label: "Matériel", icon: ShoppingCart },
          { id: "expenses", label: "Dépenses", icon: Receipt },
          { id: "beforeafter", label: "Avant/Après", icon: Layers },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-white text-slate-800 shadow-md scale-105"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <t.icon
              size={16}
              className={tab === t.id ? "text-orange-500" : ""}
            />{" "}
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white min-h-[600px] rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
        {tab === "journal" && (
          <JournalTab
            logs={data.logs || []}
            onAdd={addLog}
            onDelete={deleteLog}
          />
        )}
        {tab === "planning" && (
          <PlanningTab
            tasks={data.planning || []}
            team={team}
            onAdd={addPlanningTask}
            onDelete={deletePlanningTask}
          />
        )}
        {tab === "materials" && (
          <div className="p-4 md:p-6">
            <MaterialsTab
              materials={data.materials || []}
              onAdd={addMaterial}
              onToggle={toggleMaterial}
              onDelete={deleteMaterial}
            />
          </div>
        )}
        {tab === "expenses" && (
          <div className="p-4 md:p-6">
            <ExpensesTab
              expenses={data.expenses || []}
              onAdd={addExpense}
              onDelete={deleteExpense}
            />
          </div>
        )}
        {tab === "beforeafter" && (
          <div className="p-4 md:p-6">
            <BeforeAfterTab
              comparisons={data.beforeAfter || []}
              onAdd={addBeforeAfter}
              onDelete={deleteBeforeAfter}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// --- TAB JOURNAL (MODE TCHAT) ---
const JournalTab = ({ logs, onAdd, onDelete }) => {
  const [text, setText] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
  const handleSubmit = () => {
    if (!text) return;
    onAdd(text);
    setText("");
  };
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onAdd("Photo ajoutée", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  return (
    <div className="flex flex-col h-[600px]">
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="Zoom"
              className="max-w-full max-h-[80vh] object-contain rounded-lg mb-4 shadow-2xl"
              onError={(e) => {
                e.target.onerror = null;
                alert("Image introuvable.");
                setPreviewImage(null);
              }}
            />
            <div className="flex gap-3">
              <a
                href={previewImage}
                download="photo.png"
                className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-slate-200 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={18} /> Enregistrer
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="bg-slate-800 text-white px-6 py-2 rounded-full font-bold hover:bg-slate-700 text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {sortedLogs.length === 0 && (
          <div className="text-center text-slate-400 py-12 text-sm">
            Démarrez le journal...
          </div>
        )}
        {(() => {
          let lastDate = null;
          return sortedLogs.map((log) => {
            const currentDate = new Date(log.date).toDateString();
            const showDate = currentDate !== lastDate;
            lastDate = currentDate;
            return (
              <React.Fragment key={log.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="bg-slate-200 text-slate-500 text-[10px] font-bold uppercase px-3 py-1 rounded-full">
                      {formatDateHeader(log.date)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex gap-3 group ${
                    log.author === "Moi" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                      log.author === "Moi"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-700 border"
                    }`}
                  >
                    {log.author.charAt(0)}
                  </div>
                  <div
                    className={`max-w-[80%] ${
                      log.author === "Moi" ? "items-end" : "items-start"
                    } flex flex-col relative`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        log.author === "Moi"
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                      }`}
                    >
                      {log.content}
                      {log.image && (
                        <div
                          className="mt-2 relative group/img cursor-pointer inline-block"
                          onClick={() => setPreviewImage(log.image)}
                        >
                          <img
                            src={log.image}
                            alt="Chantier"
                            className="rounded-lg w-full max-w-[200px] object-cover border border-black/10 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                            <Maximize2
                              size={20}
                              className="text-white drop-shadow-md"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 px-1">
                        {new Date(log.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {log.author === "Moi" && (
                        <button
                          onClick={() => onDelete(log.id)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                          title="Supprimer"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          });
        })()}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 bg-white border-t border-slate-100 flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current.click()}
          className="p-3 hover:bg-slate-100 rounded-xl text-slate-500 transition shrink-0"
        >
          <ImageIcon size={20} />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </button>
        <textarea
          className="flex-1 bg-slate-50 border-none outline-none text-sm py-3 px-4 rounded-xl resize-none h-[46px] focus:ring-2 focus:ring-blue-100 transition"
          placeholder="Message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!text}
          className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50 shadow-md shrink-0"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

const PlanningTab = ({ tasks, team, onAdd, onDelete }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({ title: "", assignedTo: [] });

  const getDaysInMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => {
    let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };
  const handleAssign = (memberId) => {
    setForm((prev) => {
      const newAssign = prev.assignedTo.includes(memberId)
        ? prev.assignedTo.filter((id) => id !== memberId)
        : [...prev.assignedTo, memberId];
      return { ...prev, assignedTo: newAssign };
    });
  };
  const handleSubmit = () => {
    if (!form.title || !selectedDate) return;
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      selectedDate
    )
      .toISOString()
      .split("T")[0];
    onAdd({ date: dateStr, ...form });
    setForm({ title: "", assignedTo: [] });
    setSelectedDate(null);
  };
  const changeMonth = (delta) =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1)
    );
  const days = [];
  const daysCount = getDaysInMonth(currentDate);
  const offset = getFirstDayOfMonth(currentDate);
  for (let i = 0; i < offset; i++) days.push(null);
  for (let i = 1; i <= daysCount; i++) days.push(i);
  return (
    <div className="flex flex-col h-full animate-page p-4 md:p-6 gap-6">
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 hover:bg-slate-200 rounded-full transition"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <h3 className="font-bold text-lg text-slate-800 capitalize">
          {currentDate.toLocaleDateString("fr-FR", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <button
          onClick={() => changeMonth(1)}
          className="p-2 hover:bg-slate-200 rounded-full transition"
        >
          <ChevronRight size={20} className="text-slate-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center mb-2">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="text-xs font-bold text-slate-400 uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 auto-rows-fr">
        {days.map((day, idx) => {
          if (!day)
            return (
              <div key={idx} className="bg-transparent min-h-[100px]"></div>
            );
          const dateStr = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day
          )
            .toISOString()
            .split("T")[0];
          const dayTasks = tasks.filter((t) => t.date === dateStr);
          const isSelected = day === selectedDate;
          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(day)}
              className={`min-h-[100px] border rounded-xl p-2 flex flex-col gap-1 cursor-pointer transition relative ${
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50"
                  : "border-slate-100 bg-white hover:border-blue-300"
              }`}
            >
              <span
                className={`text-xs font-bold ${
                  isSelected ? "text-blue-600" : "text-slate-400"
                } mb-1`}
              >
                {day}
              </span>
              {dayTasks.map((task) => (
                <div
                  key={task.id}
                  className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-1 rounded font-medium truncate relative group"
                >
                  {task.title}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="absolute right-0 top-0 bottom-0 bg-red-500 text-white px-1 hidden group-hover:flex items-center rounded-r"
                  >
                    <Trash2 size={8} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {selectedDate && (
        <div
          className="fixed inset-0 bg-slate-900/20 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4">
              Ajouter le {selectedDate}
            </h3>
            <input
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tâche (ex: Pose carrelage)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                Qui intervient ?
              </p>
              <div className="flex flex-wrap gap-2">
                {team.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleAssign(member.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 transition-all ${
                      form.assignedTo.includes(member.id)
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedDate(null)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!form.title}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MaterialsTab = ({ materials, onAdd, onToggle, onDelete }) => {
  const [item, setItem] = useState("");
  const checkedCount = materials.filter((m) => m.checked).length;
  const totalCount = materials.length;
  const progress =
    totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);

  return (
    <div className="space-y-6 animate-page">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase">
            Progression
          </span>
          <span className="text-xs font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Ajouter un matériel..."
          value={item}
          onChange={(e) => setItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(item);
              setItem("");
            }
          }}
        />
        <button
          onClick={() => {
            onAdd(item);
            setItem("");
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-xl transition"
        >
          <Plus size={24} />
        </button>
      </div>
      <div className="space-y-3">
        {materials.length === 0 && (
          <div className="text-center text-slate-400 py-8 text-sm">
            Rien à commander.
          </div>
        )}
        {materials.map((mat) => (
          <div
            key={mat.id}
            onClick={() => onToggle(mat.id)}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all group shadow-sm ${
              mat.checked
                ? "bg-slate-50 border-slate-100 opacity-60"
                : "bg-white border-slate-200 hover:border-orange-300 hover:shadow-md"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full border flex items-center justify-center transition shrink-0 ${
                mat.checked
                  ? "bg-orange-500 border-orange-500"
                  : "border-slate-300 group-hover:border-orange-400"
              }`}
            >
              {mat.checked && <Check size={14} className="text-white" />}
            </div>
            <span
              className={`text-sm flex-1 font-medium ${
                mat.checked ? "line-through text-slate-400" : "text-slate-700"
              }`}
            >
              {mat.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(mat.id);
              }}
              className="text-slate-300 hover:text-red-500 p-2"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ExpensesTab = ({ expenses, onAdd, onDelete }) => {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [image, setImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };
  const handleScanOCR = () => {
    setDesc("Matériel Électrique (Scan)");
    setAmount("142.50");
    alert("Ticket scanné avec succès ! (Simulation)");
  };
  const handleAdd = () => {
    onAdd(desc, amount, image);
    setDesc("");
    setAmount("");
    setImage(null);
  };

  return (
    <div className="space-y-6 animate-page">
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="Zoom"
              className="max-w-full max-h-[80vh] object-contain rounded-lg mb-4 shadow-2xl"
              onError={(e) => {
                e.target.onerror = null;
                alert("Image introuvable.");
                setPreviewImage(null);
              }}
            />
            <div className="flex gap-3">
              <a
                href={previewImage}
                download="ticket.png"
                className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-slate-200 transition shadow-lg text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={18} /> Enregistrer
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="bg-slate-800 text-white px-6 py-2 rounded-full font-bold hover:bg-slate-700 transition shadow-lg text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-lg">
        <span className="text-sm font-medium text-slate-300">
          Total Dépenses
        </span>
        <span className="text-2xl font-bold text-white">
          {formatCurrency(total)}
        </span>
      </div>
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 items-start">
          <div className="flex-1 w-full">
            <input
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="Description (ex: Essence)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            {image && (
              <div className="mt-2 relative inline-block">
                <img
                  src={image}
                  alt="Ticket"
                  className="h-16 w-auto rounded border border-slate-300 object-cover"
                />
                <button
                  onClick={() => setImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <input
              className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="Prix"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              onClick={handleScanOCR}
              className="p-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
              title="Scan Ticket IA"
            >
              <ScanLine size={20} />
            </button>
            <button
              onClick={() => fileInputRef.current.click()}
              className={`p-2 rounded-lg border transition ${
                image
                  ? "bg-green-50 border-green-200 text-green-600"
                  : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
              }`}
              title="Ajouter photo"
            >
              <Camera size={20} />
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageSelect}
              />
            </button>
            <Button
              variant="primary"
              onClick={handleAdd}
              className="px-4 py-2 text-xs"
            >
              Ajouter
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {expenses.length === 0 && (
          <div className="text-center text-slate-400 py-8 text-sm">
            Aucune dépense enregistrée.
          </div>
        )}
        {expenses.map((exp) => (
          <div
            key={exp.id}
            className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:shadow-md transition"
          >
            <div className="flex items-center gap-4">
              {exp.image ? (
                <div
                  className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition relative group"
                  onClick={() => setPreviewImage(exp.image)}
                >
                  <img
                    src={exp.image}
                    alt="Ticket"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 size={16} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300">
                  <Receipt size={20} />
                </div>
              )}
              <div>
                <div className="font-bold text-slate-800 text-sm">
                  {exp.desc}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(exp.date).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-slate-800">
                {formatCurrency(exp.amount)}
              </div>
              <button
                onClick={() => onDelete(exp.id)}
                className="text-xs text-red-300 hover:text-red-500 mt-1"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BeforeAfterTab = ({ comparisons, onAdd, onDelete }) => {
  const [beforeImg, setBeforeImg] = useState(null);
  const [afterImg, setAfterImg] = useState(null);
  const [desc, setDesc] = useState("");
  const beforeRef = useRef(null);
  const afterRef = useRef(null);
  const handleImage = (e, setImg) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImg(reader.result);
      reader.readAsDataURL(file);
    }
  };
  const handleSubmit = () => {
    if (beforeImg && afterImg) {
      onAdd(beforeImg, afterImg, desc);
      setBeforeImg(null);
      setAfterImg(null);
      setDesc("");
    }
  };
  return (
    <div className="space-y-8 animate-page">
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Camera size={20} className="text-purple-600" /> Nouvelle comparaison
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div
            onClick={() => beforeRef.current.click()}
            className={`h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
              beforeImg
                ? "border-blue-400 bg-blue-50"
                : "border-slate-300 hover:border-blue-400 hover:bg-slate-100"
            }`}
            style={
              beforeImg
                ? {
                    backgroundImage: `url(${beforeImg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {}
            }
          >
            {!beforeImg && (
              <>
                <span className="text-xs font-bold text-slate-400 uppercase mb-1">
                  Photo Avant
                </span>
                <Plus size={24} className="text-slate-300" />
              </>
            )}
            <input
              type="file"
              ref={beforeRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleImage(e, setBeforeImg)}
            />
          </div>
          <div
            onClick={() => afterRef.current.click()}
            className={`h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
              afterImg
                ? "border-green-400 bg-green-50"
                : "border-slate-300 hover:border-green-400 hover:bg-slate-100"
            }`}
            style={
              afterImg
                ? {
                    backgroundImage: `url(${afterImg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {}
            }
          >
            {!afterImg && (
              <>
                <span className="text-xs font-bold text-slate-400 uppercase mb-1">
                  Photo Après
                </span>
                <Plus size={24} className="text-slate-300" />
              </>
            )}
            <input
              type="file"
              ref={afterRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleImage(e, setAfterImg)}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <input
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Description..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!beforeImg || !afterImg}
          >
            Ajouter
          </Button>
        </div>
      </div>
      <div className="grid gap-6">
        {comparisons.length === 0 && (
          <div className="text-center text-slate-400 py-8 text-sm">
            Aucune photo.
          </div>
        )}
        {comparisons.map((comp) => (
          <div
            key={comp.id}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition group relative"
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => onDelete(comp.id)}
                className="bg-white/90 p-2 rounded-full text-slate-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
              <div className="flex-1 relative h-48 rounded-xl overflow-hidden">
                <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                  AVANT
                </div>
                <img
                  src={comp.before}
                  alt="Avant"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:flex items-center justify-center">
                <div className="bg-slate-100 p-2 rounded-full">
                  <ArrowRight size={20} className="text-slate-400" />
                </div>
              </div>
              <div className="flex-1 relative h-48 rounded-xl overflow-hidden">
                <div className="absolute top-2 left-2 bg-green-500/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                  APRÈS
                </div>
                <img
                  src={comp.after}
                  alt="Après"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {comp.desc && (
              <p className="mt-4 text-center font-bold text-slate-700 text-sm">
                {comp.desc}
              </p>
            )}
            <p className="text-center text-[10px] text-slate-400 mt-1">
              {new Date(comp.date).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConstructionSites;
