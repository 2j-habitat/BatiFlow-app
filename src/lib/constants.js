export const PRICE_DATABASE = {
  peinture: [
    {
      nature: "labor",
      desc: "Préparation des supports (ponçage, lessivage)",
      price: 15,
      unit: "m²",
    },
    {
      nature: "material",
      desc: "Peinture Impression Seigneurie Gauthier",
      price: 8.5,
      unit: "m²",
    },
    // ... vos autres prix
  ],
  // ... autres catégories
};

export const REGIONS = [
  { id: "occitanie", name: "Occitanie (Carcassonne)", laborRate: 45 },
  { id: "idf", name: "Île-de-France", laborRate: 65 },
];
