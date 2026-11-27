import { prisma } from '../config/prisma.js';

// Default store settings
const DEFAULTS = {
  shippingFee: 0,                  // ₹0.00 in paise (free delivery)
  freeShippingThreshold: 0,        // ₹0.00 minimum order (no minimum)
  announcementText: "HANDCRAFTED SOY CANDLE BOUQUETS ✨ FREE DELIVERY ON ALL ORDERS ✨ CUSTOM GIFT HAMPERS",
  supportEmail: "hello@thatjaltadiya.com",
  supportPhone: "+91 98765 43210",
  instagramHandle: "@thatjaltadiya",
};

export async function getSiteSettings() {
  const settings = await prisma.siteSetting.findMany();
  const map = { ...DEFAULTS };

  settings.forEach(s => {
    map[s.key] = s.value;
  });

  return map;
}

export async function getPublicSiteSettings() {
  const settings = await prisma.siteSetting.findMany({
    where: { isPublic: true },
  });
  const map = { ...DEFAULTS };

  settings.forEach(s => {
    map[s.key] = s.value;
  });

  return map;
}

export async function updateSiteSetting(key, value, isPublic = true) {
  return prisma.siteSetting.upsert({
    where: { key },
    update: { value, isPublic, updatedAt: new Date() },
    create: { key, value, isPublic },
  });
}
