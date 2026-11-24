import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEV_UPLOADS_DIR = path.join(__dirname, '../uploads-dev');

if (!existsSync(DEV_UPLOADS_DIR)) {
  mkdirSync(DEV_UPLOADS_DIR, { recursive: true });
}

const prisma = new PrismaClient();

// Brand color palette
const PALETTES = [
  { bg1: '#FFFBF5', bg2: '#FFE8A3', accent: '#2D0C1E', sub: '#FF3366', shape: '#FFB5C5' },
  { bg1: '#FFF5F7', bg2: '#FFCCD8', accent: '#2D0C1E', sub: '#FF3366', shape: '#FFE8A3' },
  { bg1: '#F4F7F5', bg2: '#D8E2DC', accent: '#2D0C1E', sub: '#2E5A44', shape: '#FFE8A3' },
  { bg1: '#2D0C1E', bg2: '#4A1532', accent: '#FFE8A3', sub: '#FFB5C5', shape: '#FF3366' },
  { bg1: '#FFF9EE', bg2: '#FED7AA', accent: '#2D0C1E', sub: '#EA580C', shape: '#FFCCD8' },
];

/**
 * Generate an SVG placeholder image in the brand aesthetic
 */
function generateSvgImage({ title, subtitle, paletteIndex = 0, variant = 1 }) {
  const p = PALETTES[paletteIndex % PALETTES.length];
  const safeTitle = (title || 'That Jalta Diya').replace(/&/g, '&amp;').slice(0, 32);
  const safeSubtitle = (subtitle || 'Handcrafted Luxury').replace(/&/g, '&amp;').slice(0, 40);

  // Organic shape paths based on variant
  let decorativeShape = '';
  if (variant === 1) {
    // Candle & Flame motif
    decorativeShape = `
      <!-- Candle body -->
      <rect x="360" y="320" width="80" height="200" rx="10" fill="${p.shape}" opacity="0.85" />
      <!-- Flame glow -->
      <circle cx="400" cy="270" r="38" fill="${p.sub}" opacity="0.3" filter="blur(15px)" />
      <!-- Flame tear -->
      <path d="M400,230 C418,260 422,285 400,295 C378,285 382,260 400,230 Z" fill="${p.sub}" />
      <path d="M400,248 C410,268 412,282 400,290 C388,282 390,268 400,248 Z" fill="${p.accent}" />
    `;
  } else if (variant === 2) {
    // Floral Bouquet motif
    decorativeShape = `
      <g transform="translate(400, 370)">
        <circle cx="0" cy="-50" r="42" fill="${p.shape}" opacity="0.9" />
        <circle cx="-45" cy="-20" r="38" fill="${p.sub}" opacity="0.8" />
        <circle cx="45" cy="-20" r="38" fill="${p.sub}" opacity="0.8" />
        <circle cx="-28" cy="35" r="40" fill="${p.shape}" opacity="0.85" />
        <circle cx="28" cy="35" r="40" fill="${p.shape}" opacity="0.85" />
        <circle cx="0" cy="0" r="24" fill="${p.accent}" />
        <!-- Ribbon bow -->
        <path d="M-25,75 C-60,70 -45,115 -10,90 L0,80 L10,90 C45,115 60,70 25,75 Z" fill="${p.sub}" />
      </g>
    `;
  } else {
    // Luxury Gift Box motif
    decorativeShape = `
      <g transform="translate(400, 370)">
        <rect x="-70" y="-50" width="140" height="120" rx="8" fill="${p.shape}" opacity="0.9" />
        <line x1="0" y1="-50" x2="0" y2="70" stroke="${p.sub}" stroke-width="14" />
        <line x1="-70" y1="10" x2="70" y2="10" stroke="${p.sub}" stroke-width="14" />
        <!-- Bow -->
        <circle cx="-25" cy="-65" r="20" fill="none" stroke="${p.sub}" stroke-width="8" />
        <circle cx="25" cy="-65" r="20" fill="none" stroke="${p.sub}" stroke-width="8" />
        <circle cx="0" cy="-55" r="12" fill="${p.sub}" />
      </g>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${p.bg1}" />
          <stop offset="100%" stop-color="${p.bg2}" />
        </linearGradient>
        <pattern id="grain" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1" fill="${p.accent}" opacity="0.05" />
          <circle cx="30" cy="30" r="1.2" fill="${p.sub}" opacity="0.04" />
        </pattern>
      </defs>
      
      <!-- Background -->
      <rect width="800" height="800" fill="url(#bgGrad)" />
      <rect width="800" height="800" fill="url(#grain)" />
      
      <!-- Border accent -->
      <rect x="24" y="24" width="752" height="752" fill="none" stroke="${p.accent}" stroke-width="2" stroke-dasharray="8 6" opacity="0.3" rx="16" />

      <!-- Brand Stamp / Watermark -->
      <g transform="translate(400, 110)">
        <circle cx="0" cy="0" r="32" fill="none" stroke="${p.sub}" stroke-width="2" opacity="0.5"/>
        <text x="0" y="6" font-family="Cinzel, serif, Georgia" font-size="14" font-weight="bold" fill="${p.accent}" text-anchor="middle" letter-spacing="3">TJD</text>
        <text x="0" y="22" font-family="sans-serif" font-size="8" fill="${p.sub}" text-anchor="middle" letter-spacing="2">EST. 2024</text>
      </g>

      <!-- Decorative center shape -->
      ${decorativeShape}

      <!-- Typography -->
      <text x="400" y="610" font-family="Cinzel, serif, Georgia" font-size="30" font-weight="700" fill="${p.accent}" text-anchor="middle" letter-spacing="1">
        ${safeTitle}
      </text>
      <text x="400" y="650" font-family="Plus Jakarta Sans, sans-serif" font-size="15" font-weight="500" fill="${p.sub}" text-anchor="middle" letter-spacing="2">
        ${safeSubtitle}
      </text>

      <!-- Editorial Footer bar -->
      <line x1="320" y1="680" x2="480" y2="680" stroke="${p.accent}" stroke-width="1.5" opacity="0.4" />
      <text x="400" y="715" font-family="Plus Jakarta Sans, sans-serif" font-size="12" fill="${p.accent}" opacity="0.6" text-anchor="middle" letter-spacing="3">
        THAT JALTA DIYA • ARTISAN STUDIO
      </text>
    </svg>
  `;
}

/**
 * Convert SVG to WebP multi-size variants locally
 */
async function createLocalWebpVariants(svgBuffer, prefix = 'img') {
  const fileId = `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
  
  const [largeBuffer, mediumBuffer, thumbBuffer] = await Promise.all([
    sharp(svgBuffer).resize(1200, 1200, { fit: 'cover' }).webp({ quality: 85 }).toBuffer(),
    sharp(svgBuffer).resize(600, 600, { fit: 'cover' }).webp({ quality: 80 }).toBuffer(),
    sharp(svgBuffer).resize(250, 250, { fit: 'cover' }).webp({ quality: 75 }).toBuffer(),
  ]);

  const largeFile = `${fileId}-lg.webp`;
  const mediumFile = `${fileId}-md.webp`;
  const thumbFile = `${fileId}-th.webp`;

  await Promise.all([
    fs.writeFile(path.join(DEV_UPLOADS_DIR, largeFile), largeBuffer),
    fs.writeFile(path.join(DEV_UPLOADS_DIR, mediumFile), mediumBuffer),
    fs.writeFile(path.join(DEV_UPLOADS_DIR, thumbFile), thumbBuffer),
  ]);

  return `/uploads/${mediumFile}`;
}

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  const forceFlag = process.argv.includes('--force');

  if (isProduction && !forceFlag) {
    console.error('❌ SEED REFUSED: Cannot run demo seed script in production without --force flag.');
    process.exit(1);
  }

  console.log('🌱 Starting That Jalta Diya demo content seeding...');

  // 1. Clean existing demo data if any (ensures idempotency)
  console.log('🧹 Cleaning prior demo data to ensure clean idempotent seed state...');
  await prisma.orderItem.deleteMany({ where: { product: { isDemo: true } } });
  await prisma.cartItem.deleteMany({ where: { product: { isDemo: true } } });
  await prisma.wishlistItem.deleteMany({ where: { product: { isDemo: true } } });
  await prisma.stockLog.deleteMany({ where: { product: { isDemo: true } } });
  await prisma.productVariant.deleteMany({ where: { isDemo: true } });
  await prisma.productImage.deleteMany({ where: { isDemo: true } });
  await prisma.product.deleteMany({ where: { isDemo: true } });
  await prisma.category.deleteMany({ where: { isDemo: true } });
  await prisma.testimonial.deleteMany({ where: { isDemo: true } });
  await prisma.coupon.deleteMany({ where: { code: { in: ['WELCOME10', 'DIYA15', 'FESTIVE25'] } } });

  // 2. Seed Categories (6 distinct categories)
  console.log('📂 Seeding 6 product categories...');
  const categoryDefs = [
    {
      name: 'Candle Bouquets',
      slug: 'candle-bouquets',
      description: 'Artisan hand-poured candle bouquets wrapped in premium Korean florist paper.',
    },
    {
      name: 'Scented Jar Candles',
      slug: 'scented-candles',
      description: 'Pure soy and coconut wax candles infused with fine French fragrance oils.',
    },
    {
      name: 'Floral Gift Hampers',
      slug: 'gift-hampers',
      description: 'Curated luxury hampers combining candles, everlasting blooms, and pamper essentials.',
    },
    {
      name: 'Botanical Wax Tablets',
      slug: 'floral-arrangements',
      description: 'Aromatherapy wardrobe and drawer wax sachets studded with dried organic petals.',
    },
    {
      name: 'Girly Accessories & Matchboxes',
      slug: 'accessories',
      description: 'Aesthetic pastel wick trimmers, snuffer sets, and vintage oversized matchboxes.',
    },
    {
      name: 'Seasonal & Festive Specials',
      slug: 'seasonal-specials',
      description: 'Limited edition festive sets, holiday sparkles, and customized celebration boxes.',
    },
  ];

  const categories = {};
  for (let i = 0; i < categoryDefs.length; i++) {
    const c = categoryDefs[i];
    const catSvg = generateSvgImage({
      title: c.name,
      subtitle: 'Artisan Collection',
      paletteIndex: i,
      variant: (i % 3) + 1,
    });
    const imgUrl = await createLocalWebpVariants(Buffer.from(catSvg), `cat-${c.slug}`);

    categories[c.slug] = await prisma.category.create({
      data: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: imgUrl,
        isDemo: true,
      },
    });
  }

  // 3. Seed Products (24 products spread across categories)
  console.log('🕯️ Seeding 24 realistic demo products with variants, images, and pricing...');
  const productDefs = [
    // --- Candle Bouquets (4 items) ---
    {
      name: 'Pink Peony Dream Candle Bouquet',
      slug: 'pink-peony-dream-candle-bouquet',
      categorySlug: 'candle-bouquets',
      description: 'A breathtaking bouquet crafted with 7 hand-poured soy wax peony candles nestled among baby’s breath and wrapped in satin ribbon. Gently scented with blush peony and white tea.',
      shortDescription: '7 artisan soy wax peony candles wrapped in satin Korean paper.',
      price: 189900, // INR 1,899.00
      compareAtPrice: 229900,
      costPrice: 75000,
      sku: 'TJD-CB-001',
      stock: 14,
      isFeatured: true,
      isBestseller: true,
      isNew: false,
      variants: [
        { name: 'Standard (7 Candles)', sku: 'TJD-CB-001-STD', price: 189900, stock: 10, options: { size: 'Standard (7 Candles)' } },
        { name: 'Deluxe Grand (12 Candles)', sku: 'TJD-CB-001-DLX', price: 289900, stock: 4, options: { size: 'Deluxe Grand (12 Candles)' } },
      ],
    },
    {
      name: 'Lavender Fields Forever Bouquet',
      slug: 'lavender-fields-forever-bouquet',
      categorySlug: 'candle-bouquets',
      description: 'Soothing French lavender and vanilla wax roses assembled in a soft lilac wrapper. Designed to calm your evenings and make a stunning bedside centrepiece.',
      shortDescription: 'Lavender and vanilla wax roses in lilac luxury wrap.',
      price: 169900,
      compareAtPrice: 199900,
      costPrice: 65000,
      sku: 'TJD-CB-002',
      stock: 9,
      isFeatured: true,
      isBestseller: false,
      isNew: true,
      variants: [
        { name: 'Lilac Wrap', sku: 'TJD-CB-002-LIL', price: 169900, stock: 5, options: { color: 'Lilac' } },
        { name: 'Cream Ivory Wrap', sku: 'TJD-CB-002-CRM', price: 169900, stock: 4, options: { color: 'Cream Ivory' } },
      ],
    },
    {
      name: 'Crimson Romance Rose Bouquet',
      slug: 'crimson-romance-rose-bouquet',
      categorySlug: 'candle-bouquets',
      description: 'Deep crimson and velvety pink rose-shaped candles with notes of Turkish damask rose, amber, and patchouli. The ultimate romantic anniversary surprise.',
      shortDescription: 'Velvety crimson rose candles with rich Turkish damask rose aroma.',
      price: 219900,
      compareAtPrice: 259900,
      costPrice: 85000,
      sku: 'TJD-CB-003',
      stock: 6,
      isFeatured: false,
      isBestseller: true,
      isNew: false,
    },
    {
      name: 'Sun-Kissed Daisy Blossom Bouquet',
      slug: 'sun-kissed-daisy-blossom-bouquet',
      categorySlug: 'candle-bouquets',
      description: 'Cheerful bright yellow and butter-cream daisy candles smelling of wild citrus and neroli blossom. Guaranteed to bring pure joy to anyone receiving it.',
      shortDescription: 'Cheerful daisy candles infused with wild citrus & neroli.',
      price: 149900,
      compareAtPrice: null,
      costPrice: 55000,
      sku: 'TJD-CB-004',
      stock: 2, // Low stock test item!
      isFeatured: false,
      isBestseller: false,
      isNew: true,
    },

    // --- Scented Jar Candles (5 items) ---
    {
      name: 'Madagascar Vanilla Bean & Caramel Jar',
      slug: 'madagascar-vanilla-bean-caramel-jar',
      categorySlug: 'scented-candles',
      description: 'Rich, buttery Madagascar vanilla bean swirled with warm salted caramel and spun sugar. 250g pure soy wax with double cotton wicks for a 45-hour clean burn.',
      shortDescription: 'Warm bakery aroma of rich vanilla bean & salted caramel.',
      price: 89900, // INR 899.00
      compareAtPrice: 109900,
      costPrice: 32000,
      sku: 'TJD-SC-001',
      stock: 25,
      isFeatured: true,
      isBestseller: true,
      isNew: false,
      variants: [
        { name: '200g Classic Amber Jar', sku: 'TJD-SC-001-200', price: 89900, stock: 15, options: { size: '200g Amber' } },
        { name: '350g Frosted Blush Jar', sku: 'TJD-SC-001-350', price: 129900, stock: 10, options: { size: '350g Frosted Blush' } },
      ],
    },
    {
      name: 'Midnight Jasmine & Oud Wood Candle',
      slug: 'midnight-jasmine-oud-wood-candle',
      categorySlug: 'scented-candles',
      description: 'Intoxicating night-blooming jasmine intertwined with smoky dark oud, frankincense, and vetiver. Poured in an opaque matte black ceramic vessel with gold foil accents.',
      shortDescription: 'Mysterious, smoky night jasmine and warm royal oud.',
      price: 109900,
      compareAtPrice: 129900,
      costPrice: 42000,
      sku: 'TJD-SC-002',
      stock: 18,
      isFeatured: false,
      isBestseller: false,
      isNew: true,
    },
    {
      name: 'Fresh Linen & Morning Dew Soy Candle',
      slug: 'fresh-linen-morning-dew-candle',
      categorySlug: 'scented-candles',
      description: 'Crisp sun-dried cotton, morning air, soft lily of the valley, and white musk. The scent of a serene Sunday morning in fresh clean sheets.',
      shortDescription: 'Crisp white cotton and dewy waterlily for an airy, fresh home.',
      price: 79900,
      compareAtPrice: 89900,
      costPrice: 28000,
      sku: 'TJD-SC-003',
      stock: 30,
      isFeatured: false,
      isBestseller: false,
      isNew: false,
    },
    {
      name: 'Spiced Chai & Warm Cardamom Cocoon',
      slug: 'spiced-chai-warm-cardamom-cocoon',
      categorySlug: 'scented-candles',
      description: 'Freshly crushed cardamom pods, cinnamon bark, grated ginger, and steamed oat milk. Warm, comforting, and quintessentially Indian.',
      shortDescription: 'Spiced masala tea notes wrapped in sweet steamed milk warmth.',
      price: 94900,
      compareAtPrice: 114900,
      costPrice: 34000,
      sku: 'TJD-SC-004',
      stock: 12,
      isFeatured: true,
      isBestseller: false,
      isNew: true,
    },
    {
      name: 'Sparkling Rose Champagne & Strawberry',
      slug: 'sparkling-rose-champagne-strawberry',
      categorySlug: 'scented-candles',
      description: 'Effervescent pink champagne, wild macerated strawberries, and delicate sugar crystals. Poured into a fluted glass that casts romantic candlelight shadows.',
      shortDescription: 'Bubbly pink champagne with ripe strawberries and celebration vibes.',
      price: 119900,
      compareAtPrice: 139900,
      costPrice: 45000,
      sku: 'TJD-SC-005',
      stock: 0, // OUT OF STOCK TEST ITEM!
      isFeatured: false,
      isBestseller: true,
      isNew: false,
    },

    // --- Floral Gift Hampers (4 items) ---
    {
      name: 'The Ultimate "You Deserve It" Pamper Hamper',
      slug: 'ultimate-you-deserve-it-pamper-hamper',
      categorySlug: 'gift-hampers',
      description: 'An indulgent pastel pink trunk box featuring a 7-peony candle bouquet, 200g soy candle in French lavender, luxury rose gold wick trimmer, and hand-tied dried flower boutonniere.',
      shortDescription: 'Luxury trunk packed with a candle bouquet, jar candle, and trimmer.',
      price: 349900, // INR 3,499.00
      compareAtPrice: 429900,
      costPrice: 140000,
      sku: 'TJD-GH-001',
      stock: 8,
      isFeatured: true,
      isBestseller: true,
      isNew: false,
    },
    {
      name: 'Golden Hour Bridesmaid Celebration Box',
      slug: 'golden-hour-bridesmaid-celebration-box',
      categorySlug: 'gift-hampers',
      description: 'Curated for bridal proposals and bestie birthdays. Includes a gold ribbed soy candle, botanical wax sachet, safety matches in glass vial, and custom handwritten letter.',
      shortDescription: 'Chic bridesmaid gift with amber jar candle and glass match vial.',
      price: 249900,
      compareAtPrice: 289900,
      costPrice: 95000,
      sku: 'TJD-GH-002',
      stock: 11,
      isFeatured: false,
      isBestseller: false,
      isNew: true,
    },
    {
      name: 'Mini Sunshine & Sweetness Gift Crate',
      slug: 'mini-sunshine-sweetness-gift-crate',
      categorySlug: 'gift-hampers',
      description: 'Wooden micro-crate with 2 mini travel candles (Mango Blossom & Vanilla), floral wax bar, and personalized butter-cream greeting card.',
      shortDescription: 'Cute wooden crate with 2 travel candles and botanical wax bar.',
      price: 149900,
      compareAtPrice: 179900,
      costPrice: 58000,
      sku: 'TJD-GH-003',
      stock: 15,
      isFeatured: false,
      isBestseller: false,
      isNew: false,
    },
    {
      name: 'Artisan Self-Love Ritual Hamper',
      slug: 'artisan-self-love-ritual-hamper',
      categorySlug: 'gift-hampers',
      description: 'A complete mindfulness kit: Eucalyptus & Spearmint candle, therapeutic bath salts, amethyst crystal keepsake, and wax melt tablets.',
      shortDescription: 'Mindfulness and spa kit with essential oil candle & crystal.',
      price: 279900,
      compareAtPrice: 319900,
      costPrice: 110000,
      sku: 'TJD-GH-004',
      stock: 7,
      isFeatured: false,
      isBestseller: false,
      isNew: true,
    },

    // --- Botanical Wax Tablets & Sachets (4 items) ---
    {
      name: 'Pressed Rose & Baby’s Breath Botanical Wax Bar',
      slug: 'pressed-rose-botanical-wax-bar',
      categorySlug: 'floral-arrangements',
      description: 'Natural soy and beeswax tablet embedded with real dried red rosebuds and delicate baby’s breath. Hung with a natural raw linen cord for wardrobes and vanity spaces.',
      shortDescription: 'Real dried florals in an aromatic closet freshener bar.',
      price: 39900, // INR 399.00
      compareAtPrice: 49900,
      costPrice: 12000,
      sku: 'TJD-BW-001',
      stock: 40,
      isFeatured: true,
      isBestseller: true,
      isNew: false,
    },
    {
      name: 'Lavender & Dried Orange Scented Wardrobe Sachet',
      slug: 'lavender-dried-orange-sachet',
      categorySlug: 'floral-arrangements',
      description: 'Handmade wax tablet with dehydrated blood orange slices, whole cloves, and organic Himalayan lavender stalks. Keeps closets moth-free and smelling heaven.',
      shortDescription: 'Dehydrated orange and lavender wax sachet for clothing racks.',
      price: 44900,
      compareAtPrice: 54900,
      costPrice: 14000,
      sku: 'TJD-BW-002',
      stock: 22,
      isFeatured: false,
      isBestseller: false,
      isNew: false,
    },
    {
      name: 'Everlasting Bloom Mini Cloche Arrangement',
      slug: 'everlasting-bloom-mini-cloche',
      categorySlug: 'floral-arrangements',
      description: 'Preserved real hydrangeas, bunny tails, and sola wood flowers under a petite glass bell cloche with fairy lights and a scented beeswax base.',
      shortDescription: 'Preserved hydrangeas and fairy lights in a glass cloche.',
      price: 169900,
      compareAtPrice: 199900,
      costPrice: 65000,
      sku: 'TJD-BW-003',
      stock: 5,
      isFeatured: false,
      isBestseller: true,
      isNew: true,
    },
    {
      name: 'Trio of Scented Botanical Drawer Discs',
      slug: 'trio-scented-botanical-drawer-discs',
      categorySlug: 'floral-arrangements',
      description: 'Set of 3 round scented wax discs in Bergamot, Rosewater, and Cedarwood. Perfect for lingerie drawers, study desks, or glove compartments.',
      shortDescription: 'Set of 3 mini aromatherapy discs with dried botanical petals.',
      price: 69900,
      compareAtPrice: 89900,
      costPrice: 22000,
      sku: 'TJD-BW-004',
      stock: 19,
      isFeatured: false,
      isBestseller: false,
      isNew: false,
    },

    // --- Girly Accessories & Matchboxes (4 items) ---
    {
      name: 'Vintage Rose Gold Candle Care Trio Set',
      slug: 'vintage-rose-gold-candle-care-set',
      categorySlug: 'accessories',
      description: 'Heavyweight stainless steel candle care kit plated in glossy rose gold. Includes an ergonomic wick trimmer, bell snuffer, and wick dipper in a branded canvas pouch.',
      shortDescription: 'Wick trimmer, snuffer, and dipper in high-shine rose gold.',
      price: 89900,
      compareAtPrice: 119900,
      costPrice: 33000,
      sku: 'TJD-AC-001',
      stock: 16,
      isFeatured: true,
      isBestseller: false,
      isNew: false,
      variants: [
        { name: 'Rose Gold', sku: 'TJD-AC-001-RG', price: 89900, stock: 10, options: { finish: 'Rose Gold' } },
        { name: 'Matte Brass', sku: 'TJD-AC-001-MB', price: 89900, stock: 6, options: { finish: 'Matte Brass' } },
      ],
    },
    {
      name: 'Oversized Matchbox "Light Your Own Flame"',
      slug: 'oversized-matchbox-light-your-own-flame',
      categorySlug: 'accessories',
      description: 'Extra-long 10cm safety matches with pastel pink and butter-cream tips. Housed in a vintage-inspired art-print slide box featuring gold foil lettering.',
      shortDescription: '50 extra-long pink tip safety matches in luxury slide box.',
      price: 29900,
      compareAtPrice: 39900,
      costPrice: 8000,
      sku: 'TJD-AC-002',
      stock: 50,
      isFeatured: false,
      isBestseller: true,
      isNew: false,
    },
    {
      name: 'Fluted Ceramic Pastel Candle Coaster Plate',
      slug: 'fluted-ceramic-pastel-candle-coaster',
      categorySlug: 'accessories',
      description: 'Chic scalloped edged ceramic plate designed to hold pillar candles and protect delicate furniture surfaces from heat and wax spills.',
      shortDescription: 'Scalloped handmade coaster plate in butter cream glaze.',
      price: 49900,
      compareAtPrice: 59900,
      costPrice: 16000,
      sku: 'TJD-AC-003',
      stock: 12,
      isFeatured: false,
      isBestseller: false,
      isNew: true,
    },
    {
      name: 'Ribbed Glass Apothecary Match Cloche with Striker',
      slug: 'ribbed-glass-match-cloche-striker',
      categorySlug: 'accessories',
      description: 'Hand-blown ribbed glass cloche filled with 60 match sticks, featuring a flint match-strike pad conveniently adhered directly to the side of the vessel.',
      shortDescription: 'Hand-blown glass vessel with built-in striker and 60 matches.',
      price: 79900,
      compareAtPrice: 99900,
      costPrice: 28000,
      sku: 'TJD-AC-004',
      stock: 8,
      isFeatured: false,
      isBestseller: false,
      isNew: true,
    },

    // --- Seasonal & Festive Specials (3 items) ---
    {
      name: 'Diwali Sparkle Brass Urli & Scented Tealight Set',
      slug: 'diwali-sparkle-brass-urli-tealight-set',
      categorySlug: 'seasonal-specials',
      description: 'Handcrafted pure brass floral urli bowl accompanied by 12 floating marigold & mogra scented soy tealights and dried lotus pods.',
      shortDescription: 'Brass floral urli with 12 scented floating marigold tealights.',
      price: 199900,
      compareAtPrice: 249900,
      costPrice: 79000,
      sku: 'TJD-SS-001',
      stock: 14,
      isFeatured: true,
      isBestseller: true,
      isNew: false,
    },
    {
      name: 'Festive Gold Dust Pine & Spiced Plum Candle',
      slug: 'festive-gold-dust-pine-spiced-plum',
      categorySlug: 'seasonal-specials',
      description: 'Cozy winter pines, juicy dark plum compote, and shimmering biodegradable cosmetic gold glitter that sparkles mesmerizingly as the wax pools.',
      shortDescription: 'Shimmering gold glitter wax with winter pine & spiced plum.',
      price: 109900,
      compareAtPrice: 129900,
      costPrice: 40000,
      sku: 'TJD-SS-002',
      stock: 3, // Low stock test item!
      isFeatured: false,
      isBestseller: false,
      isNew: true,
    },
    {
      name: 'Celebration Confetti Heart Candle Bouquet',
      slug: 'celebration-confetti-heart-candle-bouquet',
      categorySlug: 'seasonal-specials',
      description: 'Pastel heart-shaped candle bouquet with shimmering ribbon bow and sugar glaze scent. Perfect for birthdays, bachelorettes, and milestone celebrations.',
      shortDescription: 'Heart-shaped candle bouquet with sugar glaze fragrance.',
      price: 219900,
      compareAtPrice: 249900,
      costPrice: 82000,
      sku: 'TJD-SS-003',
      stock: 7,
      isFeatured: true,
      isBestseller: false,
      isNew: true,
    },
  ];

  for (let idx = 0; idx < productDefs.length; idx++) {
    const p = productDefs[idx];
    const category = categories[p.categorySlug];
    if (!category) continue;

    const createdProduct = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        costPrice: p.costPrice,
        sku: p.sku,
        stock: p.stock,
        isFeatured: p.isFeatured,
        isBestseller: p.isBestseller,
        isNew: p.isNew,
        isActive: true,
        isDemo: true,
        categoryId: category.id,
        metaTitle: `${p.name} | That Jalta Diya`,
        metaDescription: p.shortDescription,
      },
    });

    // Generate 2-3 local WebP images for each product
    const imgCount = 3;
    for (let imgIdx = 1; imgIdx <= imgCount; imgIdx++) {
      const svg = generateSvgImage({
        title: p.name,
        subtitle: imgIdx === 1 ? 'Primary Studio View' : imgIdx === 2 ? 'Detail & Packaging' : 'Lifestyle Setting',
        paletteIndex: (idx + imgIdx) % PALETTES.length,
        variant: ((idx + imgIdx) % 3) + 1,
      });

      const imgUrl = await createLocalWebpVariants(Buffer.from(svg), `p-${p.slug}-${imgIdx}`);

      await prisma.productImage.create({
        data: {
          productId: createdProduct.id,
          url: imgUrl,
          altText: `${p.name} view ${imgIdx}`,
          sortOrder: imgIdx,
          isPrimary: imgIdx === 1,
          isDemo: true,
        },
      });
    }

    // Seed variants if present
    if (p.variants && p.variants.length > 0) {
      for (const v of p.variants) {
        await prisma.productVariant.create({
          data: {
            productId: createdProduct.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            options: v.options,
            isDemo: true,
          },
        });
      }
    }
  }

  // 4. Seed Testimonials (4 realistic customer reviews)
  console.log('💬 Seeding customer testimonials...');
  const testimonialDefs = [
    {
      author: 'Aanya Sharma',
      location: 'South Delhi',
      rating: 5,
      reviewText: 'The Pink Peony candle bouquet arrived in the most exquisite packaging! My best friend couldn’t believe they were actually candles until she lit one. Truly elevated gifting.',
      isApproved: true,
      isDemo: true,
    },
    {
      author: 'Rhea Sen',
      location: 'Bandra, Mumbai',
      rating: 5,
      reviewText: 'The Madagascar Vanilla jar has a scent throw that fills my entire duplex without being overwhelming. The double wick burns completely evenly. Will be reordering forever!',
      isApproved: true,
      isDemo: true,
    },
    {
      author: 'Pooja Iyer',
      location: 'Indiranagar, Bengaluru',
      rating: 5,
      reviewText: 'Ordered 15 bridesmaid hampers for my wedding celebration. Every single bridesmaid was stunned by the attention to detail and handwritten notes. 10/10 craftsmanship.',
      isApproved: true,
      isDemo: true,
    },
    {
      author: 'Tanvi Mathur',
      location: 'Civil Lines, Jaipur',
      rating: 5,
      reviewText: 'Such a breath of fresh air in the gifting space! The botanical wax tablets made my entire walk-in closet smell like a high-end spa.',
      isApproved: true,
      isDemo: true,
    },
  ];

  for (const t of testimonialDefs) {
    await prisma.testimonial.create({ data: t });
  }

  // 5. Seed Coupons
  console.log('🎟️ Seeding promotional coupons...');
  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        description: '10% off for first time sweethearts',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 99900, // min INR 999
        maxDiscount: 30000, // max INR 300
        isActive: true,
      },
      {
        code: 'DIYA15',
        description: '15% off on orders above INR 2,000',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minOrderValue: 200000,
        maxDiscount: 50000,
        isActive: true,
      },
      {
        code: 'FESTIVE25',
        description: 'Flat ₹250 off on luxury hampers',
        discountType: 'FLAT',
        discountValue: 25000,
        minOrderValue: 250000,
        isActive: true,
      },
    ],
  });

  // 6. Seed Site Settings (Shipping charges, threshold, announcements)
  console.log('⚙️ Seeding default site settings...');
  const defaultSettings = [
    {
      key: 'shipping_fee',
      value: { amountInPaise: 9900, label: 'Standard Shipping' }, // INR 99
      isPublic: true,
    },
    {
      key: 'free_shipping_threshold',
      value: { amountInPaise: 149900 }, // INR 1499
      isPublic: true,
    },
    {
      key: 'announcement_bar',
      value: {
        text: 'FREE ALL-INDIA SHIPPING ON ORDERS OVER ₹1,499 • HAND-POURED WITH 100% PURE SOY & LOVE',
        linkText: 'Shop Bouquets',
        linkUrl: '/shop?category=candle-bouquets',
        isActive: true,
      },
      isPublic: true,
    },
    {
      key: 'store_contact',
      value: {
        phone: '+91 98765 43210',
        email: 'hello@thatjaltadiya.com',
        address: 'Artisan Studio 4B, Shahpur Jat, New Delhi, 110049',
        instagram: '@thatjaltadiya',
      },
      isPublic: true,
    },
  ];

  for (const s of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, isPublic: s.isPublic },
      create: { key: s.key, value: s.value, isPublic: s.isPublic },
    });
  }

  console.log('✨ Demo data seeding successfully completed!');
  console.log('📊 Summary:');
  console.log('   - 6 Categories created (isDemo: true)');
  console.log('   - 24 Realistic Products created (isDemo: true) with variants & INR paise prices');
  console.log('   - 72 Local WebP Images generated via Sharp & SVG in brand palette');
  console.log('   - 4 Testimonials created (isDemo: true)');
  console.log('   - 3 Coupons created (WELCOME10, DIYA15, FESTIVE25)');
  console.log('   - 4 Public Site Settings configured');
}

main()
  .catch((e) => {
    console.error('❌ Error during demo seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
