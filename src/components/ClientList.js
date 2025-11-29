import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import {
  Users,
  Plus,
  MapPin,
  Mail,
  Phone,
  Search,
  Edit3,
  Trash2,
  X,
  FileText,
  ChevronRight,
  Link as LinkIcon,
  Copy,
  Globe,
} from "lucide-react";
import Button from "./ui/Button";

const ClientList = ({ user, onSelectClient }) => {
  const [clients, setClients] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    phone: "",
  });

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "clients"),
      (snapshot) => {
        setClients(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Ouvrir le formulaire en mode "Création"
  const startNewClient = () => {
    setForm({ name: "", email: "", address: "", city: "", phone: "" });
    setEditingId(null);
    setIsEditing(true);
  };

  // Ouvrir le formulaire en mode "Modification"
  const startEditClient = (client) => {
    setForm({
      name: client.name || "",
      email: client.email || "",
      address: client.address || "",
      city: client.city || "",
      phone: client.phone || "",
    });
    setEditingId(client.id);
    setIsEditing(true);
  };

  // Sauvegarder
  const handleSave = async () => {
    if (!form.name) return;

    try {
      if (editingId) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "users",
            user.uid,
            "clients",
            String(editingId)
          ),
          form
        );
      } else {
        const id = Date.now();
        await setDoc(
          doc(db, "artifacts", appId, "users", user.uid, "clients", String(id)),
          { id, ...form }
        );
      }

      setIsEditing(false);
      setEditingId(null);
      setForm({ name: "", email: "", address: "", city: "", phone: "" });
    } catch (error) {
      console.error("Erreur sauvegarde client:", error);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce client ?")) {
      await deleteDoc(
        doc(db, "artifacts", appId, "users", user.uid, "clients", String(id))
      );
    }
  };

  // FONCTION PORTAIL CLIENT
  const handleSharePortal = (client) => {
    const token = btoa(client.id + user.uid).substring(0, 12); // Simulation token
    const link = `https://portal.batiflow.app/c/${token}`;
    navigator.clipboard.writeText(link);
    alert(
      `Lien du portail pour ${client.name} copié dans le presse-papier !\n\nEnvoyez ce lien à votre client pour qu'il suive ses devis et chantiers.`
    );
  };

  // Filtrage
  const filteredClients = clients.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      "" ||
      c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      "" ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ""
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 animate-page pb-24">
      {/* En-tête & Recherche */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex gap-3 items-center mb-1">
            <div className="bg-orange-100 p-2 rounded-xl">
              <Users className="text-orange-600" size={24} />
            </div>
            Clients
          </h2>
          <p className="text-slate-500 text-sm">
            Gérez votre base de contacts et vos accès portail.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm font-medium"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={startNewClient}
            icon={Plus}
            className="shadow-orange-200"
          >
            Nouveau
          </Button>
        </div>
      </div>

      {/* Formulaire */}
      {isEditing && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-100 mb-10 animate-in slide-in-from-top-4 relative">
          <button
            onClick={() => setIsEditing(false)}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
          <h3 className="font-bold text-xl mb-6 text-slate-800 flex items-center gap-2">
            {editingId ? (
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Edit3 size={20} />
              </div>
            ) : (
              <div className="bg-green-100 p-2 rounded-lg text-green-600">
                <Plus size={20} />
              </div>
            )}
            {editingId
              ? "Modifier la fiche client"
              : "Ajouter un nouveau client"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
                Nom / Entreprise *
              </label>
              <input
                className="w-full border border-slate-200 bg-slate-50/50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
                placeholder="Ex: Mme Dupont"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
                Email
              </label>
              <input
                className="w-full border border-slate-200 bg-slate-50/50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                placeholder="contact@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
                Téléphone
              </label>
              <input
                className="w-full border border-slate-200 bg-slate-50/50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                placeholder="06 00 00 00 00"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
                Ville
              </label>
              <input
                className="w-full border border-slate-200 bg-slate-50/50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                placeholder="Paris"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
                Adresse complète
              </label>
              <input
                className="w-full border border-slate-200 bg-slate-50/50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                placeholder="10 rue de la Paix..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingId ? "Mettre à jour" : "Enregistrer le client"}
            </Button>
          </div>
        </div>
      )}

      {/* Liste des cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((c) => (
          <div
            key={c.id}
            className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center border border-white shadow-inner">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4
                      className="font-bold text-slate-800 text-lg leading-tight line-clamp-1"
                      title={c.name}
                    >
                      {c.name}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <MapPin size={12} className="text-slate-400" />{" "}
                      {c.city || "Ville inconnue"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => startEditClient(c)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-6 flex-1">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-500 shadow-sm">
                    <Mail size={14} />
                  </div>
                  <span className="text-sm text-slate-600 truncate font-medium">
                    {c.email || "Non renseigné"}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-green-500 shadow-sm">
                    <Phone size={14} />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">
                    {c.phone || "Non renseigné"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                {/* BOUTON PORTAIL CLIENT */}
                <button
                  onClick={() => handleSharePortal(c)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                >
                  <Globe size={14} /> Portail
                </button>

                {onSelectClient && (
                  <button
                    onClick={() => onSelectClient(c)}
                    className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:shadow-xl transition-all active:scale-95"
                  >
                    <FileText size={14} /> Devis
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Users size={32} className="text-slate-300" />
          </div>
          <h3 className="text-slate-900 font-medium mb-1">
            Aucun client trouvé
          </h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Commencez par ajouter votre premier client.
          </p>
        </div>
      )}
    </div>
  );
};

export default ClientList;
