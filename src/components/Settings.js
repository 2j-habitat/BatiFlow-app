import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import {
  User,
  Building2,
  Save,
  Upload,
  FileText,
  Loader2,
  Check,
  Users,
  UserPlus,
  Link as LinkIcon,
  Copy,
  Shield,
  Trash2,
  X,
  CreditCard,
  Zap,
  AlertTriangle,
  Crown,
  CheckCircle2,
  Landmark,
  Scale,
} from "lucide-react";
import Button from "./ui/Button";

const ROLES = {
  admin: {
    id: "admin",
    label: "Gérant / Admin",
    desc: "Accès total : Paramètres, Banque, Devis, Factures, Équipe.",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  editor: {
    id: "editor",
    label: "Chef d'équipe",
    desc: "Peut créer, modifier et envoyer les Devis & Factures.",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  viewer: {
    id: "viewer",
    label: "Ouvrier / Observateur",
    desc: "Lecture seule : Accès au planning et aux documents de chantier.",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const PLANS = {
  monthly: {
    name: "Pro Mensuel",
    price: 10,
    features: ["Devis Illimités", "Facturation", "Multi-utilisateurs"],
  },
  yearly: {
    name: "Pro Annuel",
    price: 96,
    features: [
      "Devis Illimités",
      "Facturation",
      "Multi-utilisateurs",
      "-20% de remise",
    ],
  },
  business: {
    name: "Business (Chantiers)",
    price: 15,
    features: [
      "Tout du plan Pro",
      "Suivi de Chantier (Bientôt)",
      "Photos illimitées",
      "Planning Équipe",
    ],
    highlight: true,
  },
};

const Settings = ({ user }) => {
  const [activeTab, setActiveTab] = useState("company");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // États Données
  const [companyForm, setCompanyForm] = useState({
    name: "2J HABITAT",
    address: "",
    city: "",
    phone: "",
    email: "",
    siret: "",
    vatNumber: "",
    defaultVat: 20,
    logoUrl: "",
    // CHAMPS JURIDIQUES & BANCAIRES
    legalFooter:
      "Dispensé d’immatriculation au registre du commerce et des sociétés (RCS) et au répertoire des métiers (RM)",
    // NOUVEAU : CGV par défaut
    cgv: `CONDITIONS GÉNÉRALES DE VENTE (CGV)

1. VALIDITÉ DE L'OFFRE
La présente offre est valable pour une durée de 30 jours à compter de sa date d'émission. Passé ce délai, les prix pourront être révisés.

2. PAIEMENT
Sauf convention contraire, le paiement s'effectue comme suit :
- Acompte de 30% à la commande.
- Solde à la réception des travaux.

3. RETARD DE PAIEMENT
En cas de retard de paiement, des pénalités égales à trois fois le taux de l'intérêt légal en vigueur seront exigibles sans qu'un rappel soit nécessaire. Une indemnité forfaitaire de 40€ pour frais de recouvrement sera également due conformément à la loi.

4. RÉSERVE DE PROPRIÉTÉ
L'entreprise conserve la propriété des biens vendus jusqu'au paiement effectif de l'intégralité du prix en principal et accessoires.

5. GARANTIES
Les travaux sont couverts par la garantie décennale souscrite auprès de notre assureur (références ci-contre).`,
    iban: "",
    bic: "",
    bankName: "",
    insuranceName: "",
    insurancePolicy: "",
    insuranceArea: "France Métropolitaine",
  });

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    role: "Gérant",
    photoUrl: "",
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [subscription, setSubscription] = useState({
    plan: "free",
    status: "inactive",
  });
  const [loadingSub, setLoadingSub] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        const docSnap = await getDoc(
          doc(db, "artifacts", appId, "users", user.uid, "settings", "general")
        );
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.company)
            setCompanyForm((prev) => ({ ...prev, ...data.company }));
          if (data.profile)
            setProfileForm((prev) => ({ ...prev, ...data.profile }));
        }

        if (user.uid.startsWith("demo-")) {
          setSubscription({ plan: "business_monthly", status: "active" });
        } else {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.plan)
              setSubscription({
                plan: userData.plan,
                status: userData.subscriptionStatus,
              });
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadSettings();

    const unsubTeam = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "team"),
      (snapshot) => {
        const members = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (members.length === 0)
          setTeamMembers([
            {
              id: "current",
              name: "Moi (Vous)",
              email: user.email,
              role: "admin",
              status: "active",
            },
          ]);
        else setTeamMembers(members);
      }
    );

    return () => unsubTeam();
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    await setDoc(
      doc(db, "artifacts", appId, "users", user.uid, "settings", "general"),
      {
        company: companyForm,
        profile: profileForm,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setLoading(false);
  };

  const handleChangePlan = async (newPlanFullId) => {
    if (!window.confirm(`Confirmer le changement d'offre ?`)) return;
    setLoadingSub(true);
    setTimeout(async () => {
      if (user.uid && !user.isAnonymous && !user.uid.startsWith("demo")) {
        await updateDoc(doc(db, "users", user.uid), {
          plan: newPlanFullId,
          subscriptionStatus: "active",
        });
      }
      setSubscription({ plan: newPlanFullId, status: "active" });
      setLoadingSub(false);
      alert("Votre abonnement a été mis à jour avec succès !");
    }, 1000);
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir résilier ?")) return;
    setLoadingSub(true);
    setTimeout(async () => {
      if (user.uid && !user.isAnonymous && !user.uid.startsWith("demo")) {
        await updateDoc(doc(db, "users", user.uid), {
          subscriptionStatus: "canceled",
        });
      }
      setSubscription((prev) => ({ ...prev, status: "canceled" }));
      setLoadingSub(false);
    }, 1000);
  };

  const generateInvite = (role) => {
    const token = Math.random().toString(36).substring(7);
    setInviteLink(`https://app.2jhabitat.fr/join?t=${token}&r=${role}`);
  };
  const handleRemoveMember = async (id) => {
    if (window.confirm("Retirer ce membre ?"))
      await deleteDoc(
        doc(db, "artifacts", appId, "users", user.uid, "team", id)
      );
  };

  const isPlanActive = (planId) =>
    subscription.plan === planId && subscription.status === "active";
  const isBusinessActive =
    subscription.plan?.includes("business") && subscription.status === "active";

  return (
    <div className="max-w-4xl mx-auto p-6 animate-page pb-24">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        Paramètres
      </h2>

      <div className="flex gap-2 mb-8 border-b border-slate-200 overflow-x-auto scrollbar-hide">
        {[
          { id: "company", label: "Entreprise", icon: Building2 },
          { id: "profile", label: "Profil", icon: User },
          { id: "team", label: "Équipe", icon: Users },
          { id: "subscription", label: "Abonnement", icon: CreditCard },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-4 font-medium text-sm flex items-center gap-2 transition-colors relative whitespace-nowrap ${
              activeTab === tab.id
                ? "text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon size={18} /> {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        {/* --- ONGLET ENTREPRISE --- */}
        {activeTab === "company" && (
          <div className="space-y-8 animate-page">
            {/* Identité */}
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-full md:w-32 h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-blue-400 relative group">
                {companyForm.logoUrl ? (
                  <img
                    src={companyForm.logoUrl}
                    className="w-full h-full object-contain p-2"
                    alt="Logo"
                  />
                ) : (
                  <>
                    <Upload size={24} className="mb-2" />
                    <span className="text-xs font-bold">Logo</span>
                  </>
                )}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files[0])
                      setCompanyForm({
                        ...companyForm,
                        logoUrl: URL.createObjectURL(e.target.files[0]),
                      });
                  }}
                />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <input
                  className="border rounded-lg p-2 w-full"
                  placeholder="Nom Entreprise"
                  value={companyForm.name}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, name: e.target.value })
                  }
                />
                <input
                  className="border rounded-lg p-2 w-full"
                  placeholder="SIRET"
                  value={companyForm.siret}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, siret: e.target.value })
                  }
                />
                <input
                  className="border rounded-lg p-2 w-full md:col-span-2"
                  placeholder="Adresse"
                  value={companyForm.address}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, address: e.target.value })
                  }
                />
                <input
                  className="border rounded-lg p-2 w-full md:col-span-2"
                  placeholder="Ville & CP"
                  value={companyForm.city}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, city: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Juridique & Assurance (OBLIGATOIRE) */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 flex items-center gap-2">
                <Shield size={16} className="text-blue-600" /> Assurance
                Décennale & Juridique
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                    Nom de l'assureur (Obligatoire)
                  </label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: MAAF Pro"
                    value={companyForm.insuranceName}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        insuranceName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                    Numéro de contrat
                  </label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="N° Police"
                    value={companyForm.insurancePolicy}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        insurancePolicy: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                    Zone de couverture
                  </label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="France"
                    value={companyForm.insuranceArea}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        insuranceArea: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                    Pied de page légal (RCS, RM, Capital...)
                  </label>
                  <textarea
                    rows="2"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={companyForm.legalFooter}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        legalFooter: e.target.value,
                      })
                    }
                  />
                </div>

                {/* NOUVEAU BLOC CGV */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block flex items-center gap-2">
                    <Scale size={12} /> Conditions Générales de Vente (CGV)
                  </label>
                  <textarea
                    rows="8"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-600"
                    value={companyForm.cgv}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, cgv: e.target.value })
                    }
                    placeholder="Vos CGV ici..."
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    Ce texte sera accessible ou annexé à vos devis.
                  </p>
                </div>
              </div>
            </div>

            {/* Banque (RIB) */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 flex items-center gap-2">
                <Landmark size={16} className="text-blue-600" /> Coordonnées
                Bancaires (Pour les factures)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                    Nom de la Banque
                  </label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Crédit Agricole"
                    value={companyForm.bankName}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        bankName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                    IBAN
                  </label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none font-mono text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="FR76 ..."
                    value={companyForm.iban}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, iban: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                    BIC
                  </label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none font-mono text-sm focus:ring-2 focus:ring-blue-500"
                    value={companyForm.bic}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, bic: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                    TVA par défaut (%)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    value={companyForm.defaultVat}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        defaultVat: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              {success && (
                <span className="text-green-600 font-bold flex items-center gap-2 animate-in fade-in">
                  <Check size={18} /> Sauvegardé !
                </span>
              )}
              <Button variant="primary" onClick={handleSave} disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}{" "}
                Enregistrer
              </Button>
            </div>
          </div>
        )}

        {/* --- ONGLET ABONNEMENT --- */}
        {activeTab === "subscription" && (
          <div className="animate-page space-y-10">
            <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl">
              <div
                className={`absolute inset-0 ${
                  subscription.status === "active"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-700"
                    : "bg-gradient-to-r from-slate-700 to-slate-800"
                }`}
              ></div>
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black opacity-10 rounded-full blur-3xl"></div>

              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
                    Abonnement Actuel
                  </h3>
                  <div className="text-3xl font-extrabold flex items-center gap-3">
                    {PLANS[subscription.plan.split("_")[0]]?.name || "Gratuit"}
                    <span
                      className={`px-3 py-1 text-[10px] rounded-full font-bold uppercase tracking-wide border ${
                        subscription.status === "active"
                          ? "bg-green-500/20 border-green-400/30 text-green-100"
                          : "bg-red-500/20 border-red-400/30 text-red-100"
                      }`}
                    >
                      {subscription.status === "active" ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <p className="text-blue-100 text-sm mt-2 opacity-90">
                    {subscription.status === "active"
                      ? "Votre espace est entièrement configuré et opérationnel."
                      : "Réactivez votre abonnement pour accéder à toutes les fonctionnalités."}
                  </p>
                </div>

                {subscription.status === "active" && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={loadingSub}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-medium transition backdrop-blur-sm flex items-center gap-2"
                  >
                    {loadingSub ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <X size={16} />
                    )}{" "}
                    Résilier
                  </button>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-6 text-lg">
                <Zap size={20} className="text-yellow-500 fill-yellow-500" />{" "}
                Offres disponibles
              </h4>

              <div className="grid md:grid-cols-3 gap-6">
                <div
                  className={`md:col-span-3 rounded-2xl p-1 relative overflow-hidden group ${
                    isBusinessActive
                      ? "bg-green-900 border-green-700"
                      : "bg-gradient-to-r from-orange-500 via-red-500 to-purple-600"
                  }`}
                >
                  <div className="absolute inset-0 bg-white/90 m-[1px] rounded-[15px]"></div>
                  <div className="relative p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    {!isBusinessActive && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">
                        Recommandé
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`p-2 rounded-lg ${
                            isBusinessActive
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          <Crown
                            size={24}
                            className={
                              isBusinessActive
                                ? "fill-emerald-600"
                                : "fill-orange-600"
                            }
                          />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">
                            Offre Business
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            L'expérience ultime pour les artisans
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
                        {PLANS.business.features.map((f) => (
                          <div
                            key={f}
                            className="flex items-center gap-2 text-sm text-slate-600"
                          >
                            <CheckCircle2
                              size={14}
                              className="text-green-500 shrink-0"
                            />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 w-full md:w-auto min-w-[200px]">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <div className="text-xs text-slate-400 font-bold uppercase mb-1">
                          Mensuel
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900">
                          15€
                          <span className="text-xs font-medium text-slate-400">
                            /mois
                          </span>
                        </div>
                        {isPlanActive("business_monthly") ? (
                          <div className="mt-2 text-xs font-bold text-green-600 flex items-center justify-center gap-1">
                            <Check size={12} /> Activé
                          </div>
                        ) : (
                          <button
                            onClick={() => handleChangePlan("business_monthly")}
                            disabled={loadingSub}
                            className="mt-2 w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition"
                          >
                            Choisir
                          </button>
                        )}
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center relative overflow-hidden">
                        <div className="absolute top-2 right-2 text-[9px] font-bold bg-green-100 text-green-700 px-1.5 rounded">
                          -20%
                        </div>
                        <div className="text-xs text-slate-400 font-bold uppercase mb-1">
                          Annuel
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900">
                          144€
                          <span className="text-xs font-medium text-slate-400">
                            /an
                          </span>
                        </div>
                        {isPlanActive("business_yearly") ? (
                          <div className="mt-2 text-xs font-bold text-green-600 flex items-center justify-center gap-1">
                            <Check size={12} /> Activé
                          </div>
                        ) : (
                          <button
                            onClick={() => handleChangePlan("business_yearly")}
                            disabled={loadingSub}
                            className="mt-2 w-full py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:border-slate-400 transition"
                          >
                            Choisir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {[
                  {
                    id: "pro_monthly",
                    name: "Pro Mensuel",
                    price: "10€",
                    period: "/mois",
                  },
                  {
                    id: "pro_yearly",
                    name: "Pro Annuel",
                    price: "96€",
                    period: "/an",
                  },
                ].map((plan) => {
                  const isCurrent = isPlanActive(plan.id);
                  return (
                    <div
                      key={plan.id}
                      className={`p-6 rounded-2xl border transition flex flex-col justify-between ${
                        isCurrent
                          ? "border-blue-500 bg-blue-50/50 shadow-md ring-1 ring-blue-500"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 rounded-lg bg-slate-100 text-slate-500">
                            <Building2 size={20} />
                          </div>
                          {isCurrent && (
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full">
                              ACTUEL
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-800 text-lg">
                          {plan.name}
                        </h4>
                        <div className="text-3xl font-extrabold text-slate-900 mt-2 mb-1">
                          {plan.price}
                          <span className="text-xs font-medium text-slate-400">
                            {plan.period}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-6">
                          L'essentiel pour gérer votre activité administrative
                          simplement.
                        </p>
                      </div>
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl bg-blue-600/10 text-blue-600 text-sm font-bold cursor-default"
                        >
                          Déjà actif
                        </button>
                      ) : (
                        <button
                          onClick={() => handleChangePlan(plan.id)}
                          disabled={loadingSub}
                          className="w-full py-2.5 rounded-xl border-2 border-slate-100 text-slate-600 text-sm font-bold hover:border-blue-500 hover:text-blue-600 transition"
                        >
                          Passer à cette offre
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex items-start gap-3">
              <AlertTriangle size={18} className="text-orange-600 mt-0.5" />
              <div className="text-xs text-orange-800">
                <span className="font-bold">Note :</span> Le changement de plan
                est immédiat.
              </div>
            </div>
          </div>
        )}

        {/* --- ONGLET EQUIPE (Inchangé) --- */}
        {activeTab === "team" && (
          <div className="animate-page space-y-8">
            <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-xl">
              <div>
                <h3 className="font-bold text-lg">Gérer mon équipe</h3>
                <p className="text-slate-400 text-sm">
                  Invitez vos collaborateurs.
                </p>
              </div>
              <Button
                variant="blue"
                icon={UserPlus}
                onClick={() => setShowInviteModal(true)}
              >
                Inviter
              </Button>
            </div>
            <div className="grid gap-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-slate-700 border border-slate-200">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">
                        {member.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs px-2 py-1 rounded border font-bold ${
                        ROLES[member.role]?.color
                      }`}
                    >
                      {ROLES[member.role]?.label || member.role}
                    </span>
                    {member.id !== "current" && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- ONGLET PROFIL (Inchangé) --- */}
        {activeTab === "profile" && (
          <div className="space-y-8 animate-page max-w-2xl">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-white shadow-lg flex items-center justify-center overflow-hidden relative group cursor-pointer">
                {profileForm.photoUrl ? (
                  <img
                    src={profileForm.photoUrl}
                    alt="Profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-slate-300" />
                )}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files[0])
                      setProfileForm({
                        ...profileForm,
                        photoUrl: URL.createObjectURL(e.target.files[0]),
                      });
                  }}
                />
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-800">
                  {profileForm.firstName || "Prénom"}{" "}
                  {profileForm.lastName || "Nom"}
                </h3>
                <p className="text-slate-500">{profileForm.role}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="border rounded-lg p-2"
                value={profileForm.firstName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, firstName: e.target.value })
                }
                placeholder="Prénom"
              />
              <input
                className="border rounded-lg p-2"
                value={profileForm.lastName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, lastName: e.target.value })
                }
                placeholder="Nom"
              />
              <input
                className="border rounded-lg p-2"
                value={profileForm.role}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, role: e.target.value })
                }
                placeholder="Rôle"
              />
            </div>
            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              {success && (
                <span className="text-green-600 font-bold flex items-center gap-2 animate-in fade-in">
                  <Check size={18} /> Sauvegardé !
                </span>
              )}
              <Button variant="primary" onClick={handleSave} disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}{" "}
                Enregistrer le profil
              </Button>
            </div>
          </div>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Inviter un membre</h3>
              <button onClick={() => setShowInviteModal(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            {!inviteLink ? (
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">Choisissez le rôle :</p>
                <div className="grid gap-3">
                  {Object.values(ROLES).map((role) => (
                    <button
                      key={role.id}
                      onClick={() => generateInvite(role.id)}
                      className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-left group"
                    >
                      <div>
                        <span className="font-bold text-sm text-slate-800 block">
                          {role.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {role.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-4">
                <h3 className="font-bold text-lg text-slate-800">
                  Lien généré !
                </h3>
                <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <input
                    readOnly
                    value={inviteLink}
                    className="bg-transparent text-xs flex-1 outline-none text-slate-600 font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      alert("Copié !");
                    }}
                    className="p-2 bg-white rounded shadow-sm hover:text-blue-600"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteLink("");
                  }}
                  className="w-full justify-center"
                >
                  Terminé
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
