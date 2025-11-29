export const formatCurrency = (val) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(val);
};

export const generateNumber = (type) => {
  const prefix = type === "quote" ? "DEV" : "FAC";
  return `${prefix}-${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
};

export const calculateTotals = (sections, globalSettings) => {
  let rawTotalHT = 0;
  let totalLabor = 0;
  let totalMaterial = 0;

  sections.forEach((section) => {
    section.items.forEach((item) => {
      const lineTotal = item.qty * item.price;
      rawTotalHT += lineTotal;
      if (item.nature === "labor") totalLabor += lineTotal;
      else totalMaterial += lineTotal;
    });
  });

  let discountAmount = 0;
  if (globalSettings.discountType === "percent") {
    discountAmount = rawTotalHT * (globalSettings.discountValue / 100);
  } else {
    discountAmount = globalSettings.discountValue;
  }

  const netTotalHT = Math.max(0, rawTotalHT - discountAmount);

  let rawTotalTVA = 0;
  sections.forEach((s) =>
    s.items.forEach((i) => (rawTotalTVA += i.qty * i.price * (i.vat / 100)))
  );

  const discountRatio = rawTotalHT > 0 ? netTotalHT / rawTotalHT : 1;
  const finalTVA = rawTotalTVA * discountRatio;

  return {
    rawTotalHT,
    discountAmount,
    netTotalHT,
    totalTVA: finalTVA,
    totalTTC: netTotalHT + finalTVA,
    totalLabor,
    totalMaterial,
  };
};
