import { prisma } from '../config/prisma.js';
import { sanitizeHtml } from '../utils/sanitize.js';

/**
 * List products with filters, sorting, search debounce, and pagination
 */
export async function listProducts({
  categorySlug,
  minPrice,
  maxPrice,
  sort = 'newest',
  search,
  page = 1,
  limit = 12,
  includeInactive = false,
  isFeatured,
  isBestseller,
  isNew,
  isDemo,
}) {
  const skip = (page - 1) * limit;
  const where = {
    deletedAt: null,
  };

  if (!includeInactive) {
    where.isActive = true;
  }

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  if (search) {
    const query = search.trim();
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { shortDescription: { contains: query, mode: 'insensitive' } },
      { sku: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (isFeatured !== undefined) where.isFeatured = isFeatured;
  if (isBestseller !== undefined) where.isBestseller = isBestseller;
  if (isNew !== undefined) where.isNew = isNew;
  if (isDemo !== undefined) where.isDemo = isDemo;

  // Sorting
  let orderBy = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { price: 'asc' };
  if (sort === 'price_desc') orderBy = { price: 'desc' };
  if (sort === 'popularity') orderBy = { isBestseller: 'desc' };
  if (sort === 'name_asc') orderBy = { name: 'asc' };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          orderBy: { price: 'asc' },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

/**
 * Get product by slug with images, variants, category, and related products
 */
export async function getProductBySlug(slug) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
      },
      variants: {
        orderBy: { price: 'asc' },
      },
    },
  });

  if (!product || product.deletedAt) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    error.errorCode = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  // Related products from same category
  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      isActive: true,
      deletedAt: null,
    },
    take: 4,
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
    },
  });

  return {
    product,
    relatedProducts,
  };
}

export async function createProduct(data, images = []) {
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const cleanDescription = sanitizeHtml(data.description);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: data.name.trim(),
        slug,
        description: cleanDescription,
        shortDescription: data.shortDescription ? data.shortDescription.trim() : null,
        price: data.price,
        compareAtPrice: data.compareAtPrice || null,
        costPrice: data.costPrice || null,
        sku: data.sku.trim(),
        stock: data.stock || 0,
        isLowStockAlert: data.isLowStockAlert ?? true,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
        isBestseller: data.isBestseller ?? false,
        isNew: data.isNew ?? false,
        isDemo: data.isDemo ?? false,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        categoryId: data.categoryId,
        images: {
          create: images.map((img, idx) => ({
            url: img.url,
            altText: img.altText || data.name,
            sortOrder: idx,
            isPrimary: idx === 0,
            isDemo: data.isDemo ?? false,
          })),
        },
      },
      include: {
        images: true,
        category: true,
      },
    });

    if (data.stock > 0) {
      await tx.stockLog.create({
        data: {
          productId: product.id,
          change: data.stock,
          reason: 'INITIAL_STOCK',
          note: 'Stock set during product creation',
        },
      });
    }

    return product;
  });
}

export async function updateProduct(id, data) {
  const updateData = { ...data };
  if (data.description) {
    updateData.description = sanitizeHtml(data.description);
  }

  return prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      images: true,
      variants: true,
      category: true,
    },
  });
}

export async function softDeleteProduct(id) {
  return prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });
}

export async function duplicateProduct(id) {
  const original = await prisma.product.findUnique({
    where: { id },
    include: { images: true, variants: true },
  });

  if (!original) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }

  const timestamp = Date.now();
  const newSku = `${original.sku}-COPY-${timestamp.toString().slice(-4)}`;
  const newSlug = `${original.slug}-copy-${timestamp.toString().slice(-4)}`;

  return prisma.product.create({
    data: {
      name: `${original.name} (Copy)`,
      slug: newSlug,
      description: original.description,
      shortDescription: original.shortDescription,
      price: original.price,
      compareAtPrice: original.compareAtPrice,
      sku: newSku,
      stock: original.stock,
      isActive: false, // create as draft
      categoryId: original.categoryId,
      images: {
        create: original.images.map(img => ({
          url: img.url,
          altText: img.altText,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
        })),
      },
    },
    include: { images: true, category: true },
  });
}

export async function adjustStock(productId, variantId, change, reason, note, adminId) {
  return prisma.$transaction(async (tx) => {
    let newStock = 0;
    if (variantId) {
      const variant = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: change } },
      });
      newStock = variant.stock;
    } else {
      const product = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: change } },
      });
      newStock = product.stock;
    }

    const log = await tx.stockLog.create({
      data: {
        productId,
        variantId: variantId || null,
        change,
        reason,
        note,
        adminId,
      },
    });

    return { newStock, log };
  });
}
