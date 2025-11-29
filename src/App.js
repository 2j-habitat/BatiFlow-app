import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  User,
  MapPin,
  Loader2,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  HardHat,
  Lock,
  Library,
  FolderOpen,
  ShieldCheck,
  HelpCircle,
  Send,
  X,
  MessageSquare,
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Info,
} from "lucide-react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";

// Imports des composants
import AuthPage from "./components/AuthPage";
import SubscriptionPage from "./components/SubscriptionPage";
import Dashboard from "./components/Dashboard";
import DocumentsManager from "./components/DocumentsManager";
import ClientList from "./components/ClientList";
import Settings from "./components/Settings";
import Editor from "./components/Editor";
import ConstructionSites from "./components/ConstructionSites";
import PriceLibrary from "./components/PriceLibrary";
import AdminPanel from "./components/AdminPanel";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import Button from "./components/ui/Button";

const UpgradeRequired = ({ onUpgrade }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 animate-in fade-in zoom-in duration-300">
    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
      <Lock size={48} className="text-slate-400" />
    </div>
    <h2 className="text-3xl font-bold text-slate-800 mb-3">
      Fonctionnalité Business
    </h2>
    <p className="text-slate-500 max-w-md mb-8 text-lg">
      Le suivi de chantier, les photos et la gestion des dépenses sont réservés
      aux membres Business.
    </p>
    <button
      onClick={onUpgrade}
      className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition transform text-lg"
    >
      Passer en Business (15€/mois)
    </button>
  </div>
);

// ... (NotificationCenter et SupportModal restent inchangés, je les garde pour la compilation) ...
const NotificationCenter = ({ onClose, onNavigate }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Bienvenue !",
      text: "Configurez votre profil.",
      date: "À l'instant",
      read: false,
      type: "info",
      target: "settings",
    },
  ]);
  const markAsRead = (id) =>
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  const markAllAsRead = () =>
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  const unreadCount = notifications.filter((n) => !n.read).length;
  return (
    <div className="absolute top-14 right-0 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 origin-top-right">
      <div className="p-4 border-b border-slate-50 bg-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-800">Notifications</h4>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition"
            >
              Tout lire
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:bg-slate-100 p-1 rounded-full transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
        {notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center text-slate-400">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Bell size={20} className="opacity-50" />
            </div>
            <p className="text-sm">Aucune notification.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markAsRead(n.id);
                if (n.target) {
                  onNavigate(n.target);
                  onClose();
                }
              }}
              className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition flex gap-3 items-start group ${
                !n.read ? "bg-blue-50/40" : ""
              }`}
            >
              <div
                className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === "success"
                    ? "bg-green-100 text-green-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {n.type === "success" ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Info size={14} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <p
                    className={`text-sm font-bold ${
                      !n.read ? "text-slate-800" : "text-slate-600"
                    } group-hover:text-blue-600 transition-colors`}
                  >
                    {n.title}
                  </p>
                  {!n.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5"></div>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-2">
                  {n.text}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {n.date}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
const SupportModal = ({ user, onClose }) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const handleSend = async () => {
    if (!subject || !message) return;
    setIsSending(true);
    await new Promise((r) => setTimeout(r, 800));
    try {
      await addDoc(collection(db, "support_tickets"), {
        userId: user.uid,
        userEmail: user.email,
        subject,
        message,
        status: "open",
        date: new Date().toISOString(),
      });
      setSent(true);
      setTimeout(onClose, 2500);
    } catch (e) {
      console.error(e);
      setIsSending(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 relative">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex justify-between items-start">
          <div>
            <h3 className="font-bold text-xl flex items-center gap-2">
              <HelpCircle size={24} className="text-blue-400" /> Besoin d'aide ?
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Notre équipe technique vous répond sous 24h.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition bg-white/10 p-1.5 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        {sent ? (
          <div className="p-12 text-center animate-in zoom-in duration-300 flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Send size={32} className="ml-1" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              Message envoyé !
            </h3>
            <p className="text-slate-500">
              Votre demande a bien été prise en compte.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block ml-1">
                Sujet de la demande
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <AlertCircle size={18} />
                </div>
                <input
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition font-medium text-slate-700"
                  placeholder="Ex: Problème de facturation..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block ml-1">
                Votre message
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                  <MessageSquare size={18} />
                </div>
                <textarea
                  rows="5"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-700 resize-none"
                  placeholder="Détaillez votre problème ou votre suggestion ici..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={!subject || !message || isSending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition transform active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Envoi...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Envoyer la demande
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [viewMode, setViewMode] = useState("list");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [docType, setDocType] = useState("quote");

  // NOUVEAU : État pour mémoriser le filtre quand on change de page
  const [initialDocFilter, setInitialDocFilter] = useState("Tous");

  const ADMIN_EMAIL = "admin@test.com";
  const isAdmin = user && user.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          if (u.isAnonymous) {
            setSubscriptionStatus("active");
            setUserPlan("business_monthly");
          } else {
            const userDoc = await getDoc(doc(db, "users", u.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setSubscriptionStatus(data.subscriptionStatus || "inactive");
              setUserPlan(data.plan || "free");
            } else {
              setSubscriptionStatus("inactive");
            }
          }
        } catch (e) {
          setSubscriptionStatus("active");
          setUserPlan("business_monthly");
        }
      } else {
        if (!isDemoMode) {
          setUser(null);
          setSubscriptionStatus(null);
        }
      }
      setAppLoading(false);
    });
    return () => unsubscribe();
  }, [isDemoMode]);

  const handleLogout = () => {
    setIsDemoMode(false);
    signOut(auth);
    setShowUserMenu(false);
    setUser(null);
  };
  const handleDemoLogin = (demoUser) => {
    setUser(demoUser);
    setIsDemoMode(true);
    setSubscriptionStatus("inactive");
  };
  const canAccessSites = userPlan && userPlan.includes("business");
  const toggleDemoAdmin = () => {
    if (user) {
      const newEmail =
        user.email === ADMIN_EMAIL ? "demo@batiflow.app" : ADMIN_EMAIL;
      setUser({ ...user, email: newEmail });
      setShowUserMenu(false);
      if (newEmail === ADMIN_EMAIL) setActiveTab("admin");
      else setActiveTab("dashboard");
    }
  };

  if (appLoading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-slate-500 font-medium">Chargement de BatiFlow...</p>
      </div>
    );
  if (!user)
    return (
      <ErrorBoundary>
        <AuthPage onLoginSuccess={handleDemoLogin} />
      </ErrorBoundary>
    );
  if (subscriptionStatus === "inactive")
    return (
      <ErrorBoundary>
        <SubscriptionPage
          user={user}
          onSubscriptionComplete={(chosenPlan) => {
            setSubscriptionStatus("active");
            if (isDemoMode) setUserPlan(chosenPlan || "business_monthly");
          }}
        />
      </ErrorBoundary>
    );

  const menuItems = [
    { id: "dashboard", label: "Accueil", icon: LayoutDashboard },
    { id: "chantiers", label: "Chantiers", icon: HardHat },
    { id: "gestion", label: "Devis & Factures", icon: FolderOpen },
    { id: "library", label: "Catalogue", icon: Library },
    { id: "clients", label: "Clients", icon: Users },
  ];

  if (isAdmin)
    menuItems.push({ id: "admin", label: "Admin", icon: ShieldCheck });

  // --- NAVIGATION INTELLIGENTE ---
  const handleNavigate = (tab, filter = null) => {
    setActiveTab(tab);
    if (tab === "gestion" || tab === "devis" || tab === "factures") {
      setViewMode("list");
      if (filter) setInitialDocFilter(filter);
    }
  };

  const handleOpenEditor = (id = null, type = "quote") => {
    setCurrentDocId(id);
    setDocType(type);
    setViewMode("edit");
    setActiveTab("gestion");
  };
  const handleBackToList = () => {
    setViewMode("list");
    setCurrentDocId(null);
  };

  return (
    <ErrorBoundary>
      <div
        className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24 md:pb-10"
        onClick={() => {
          setShowUserMenu(false);
          setShowNotifications(false);
        }}
      >
        {showSupport && (
          <SupportModal user={user} onClose={() => setShowSupport(false)} />
        )}

        <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-xl print:hidden hidden md:block">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center font-bold text-xl cursor-pointer"
                onClick={() => setActiveTab("dashboard")}
              >
                B
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-wide text-white">
                  BatiFlow
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  SaaS Artisan
                </p>
              </div>
            </div>
            <div className="flex bg-slate-800/50 p-1 rounded-xl backdrop-blur-sm border border-slate-700/50">
              {menuItems.map((item) => (
                <NavButton
                  key={item.id}
                  {...item}
                  activeTab={activeTab}
                  onClick={() => handleNavigate(item.id)}
                />
              ))}
            </div>
            <div className="flex items-center gap-4">
              {!isAdmin && (
                <button
                  onClick={() => setShowSupport(true)}
                  className="text-slate-400 hover:text-white flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-800 transition"
                >
                  <HelpCircle size={16} /> Aide
                </button>
              )}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifications(!showNotifications);
                    setShowUserMenu(false);
                  }}
                  className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition relative"
                >
                  <Bell size={18} />
                  {false && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
                  )}
                </button>
                {showNotifications && (
                  <NotificationCenter
                    onClose={() => setShowNotifications(false)}
                    onNavigate={handleNavigate}
                  />
                )}
              </div>
              <div className="relative">
                <div
                  className="flex items-center gap-3 text-slate-400 cursor-pointer hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                    setShowNotifications(false);
                  }}
                >
                  <div className="text-right hidden lg:block">
                    <p className="text-xs font-bold text-white">{user.email}</p>
                    <p
                      className={`text-[10px] font-bold ${
                        isAdmin ? "text-purple-400" : "text-blue-400"
                      }`}
                    >
                      {isAdmin ? "Super Admin" : userPlan}
                    </p>
                  </div>
                  <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white border-2 border-slate-600 shadow-sm">
                    <User size={18} />
                  </div>
                  <ChevronDown size={14} />
                </div>
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-2 text-slate-700 border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors text-sm font-medium"
                    >
                      <SettingsIcon size={16} className="text-slate-400" />{" "}
                      Paramètres
                    </button>
                    {isDemoMode && (
                      <button
                        onClick={toggleDemoAdmin}
                        className="w-full text-left px-4 py-3 hover:bg-purple-50 text-purple-600 flex items-center gap-3 transition-colors text-sm font-bold border-t border-slate-50"
                      >
                        <ShieldCheck size={16} />{" "}
                        {isAdmin ? "Quitter mode Admin" : "👁️ Voir comme Admin"}
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors text-sm font-medium border-t border-slate-50"
                    >
                      <LogOut size={16} /> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md md:hidden flex justify-between items-center print:hidden">
          <div
            className="flex items-center gap-2"
            onClick={() => setActiveTab("dashboard")}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center font-bold text-sm">
              B
            </div>
            <span className="font-bold tracking-wide">BatiFlow</span>
          </div>
          <div className="flex items-center gap-3">
            {!isAdmin && (
              <button onClick={() => setShowSupport(true)}>
                <HelpCircle size={20} className="text-slate-400" />
              </button>
            )}
            <div
              className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center active:scale-95 transition"
              onClick={() => setActiveTab("settings")}
            >
              <User size={16} />
            </div>
          </div>
        </nav>

        <main className="pt-4 md:pt-8 px-2 md:px-0">
          {activeTab === "dashboard" && (
            <Dashboard
              user={user}
              onNavigate={handleNavigate}
              onCreateDocument={handleOpenEditor}
            />
          )}
          {activeTab === "chantiers" &&
            (canAccessSites ? (
              <ConstructionSites user={user} />
            ) : (
              <UpgradeRequired
                onUpgrade={() => {
                  setSubscriptionStatus("inactive");
                }}
              />
            ))}

          {/* ON PASSE LE FILTRE INITIAL */}
          {activeTab === "gestion" && viewMode === "list" && (
            <DocumentsManager
              user={user}
              onOpenEditor={handleOpenEditor}
              initialFilter={initialDocFilter}
            />
          )}

          {activeTab === "clients" && (
            <ClientList
              user={user}
              onSelectClient={(client) => handleOpenEditor(null, "quote")}
            />
          )}
          {activeTab === "library" && <PriceLibrary user={user} />}
          {activeTab === "settings" && <Settings user={user} />}
          {activeTab === "admin" && isAdmin && <AdminPanel />}
          {viewMode === "edit" &&
            (activeTab === "gestion" ||
              activeTab === "devis" ||
              activeTab === "factures") && (
              <Editor
                user={user}
                docId={currentDocId}
                type={docType}
                onBack={handleBackToList}
                onSaveSuccess={() => console.log("Saved")}
                onRedirect={handleOpenEditor}
              />
            )}
        </main>

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden safe-area-pb">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                activeTab === item.id ? "text-blue-600" : "text-slate-400"
              }`}
            >
              {item.id === "chantiers" &&
                !canAccessSites &&
                activeTab !== "chantiers" && (
                  <div className="absolute top-2 right-4 w-2 h-2 bg-orange-500 rounded-full"></div>
                )}
              <item.icon
                size={24}
                strokeWidth={activeTab === item.id ? 2.5 : 2}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}

const NavButton = ({ label, icon: Icon, activeTab, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
      activeTab === onClick.name
        ? "bg-slate-700 text-white shadow-md"
        : "text-slate-400 hover:text-white hover:bg-slate-800"
    }`}
  >
    <Icon
      size={16}
      className={activeTab === onClick.name ? "text-orange-400" : ""}
    />{" "}
    {label}
  </button>
);
