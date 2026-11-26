import { prisma } from '../config/prisma.js';
import { deleteImageFiles } from './storage.service.js';
import { logger } from '../config/logger.js';

/**
 * Check whether any demo content exists in the store
 */
export async function checkDemoDataStatus() {
  const [demoProductsCount, demoCategoriesCount, demoTestimonialsCount] = await Promise.all([
    prisma.product.count({ where: { isDemo: true, deletedAt: null } }),
    prisma.category.count({ where: { isDemo: true } }),
    prisma.testimonial.count({ where: { isDemo: true } }),
  ]);

  const hasDemoData = demoProductsCount > 0 || demoCategoriesCount > 0 || demoTestimonialsCount > 0;

  return {
    hasDemoData,
    counts: {
      products: demoProductsCount,
      categories: demoCategoriesCount,
      testimonials: demoTestimonialsCount,
    },
  };
}

/**
 * Delete all demo data from the database and storage
 * Orders referencing demo products retain their snapshot data safely!
 */
export async function deleteAllDemoData(adminId) {
  logger.info({ adminId }, 'Initiating bulk demo data cleanup');

  // 1. Fetch all demo product and category images to remove from disk/storage
  const [demoImages, demoCategories] = await Promise.all([
    prisma.productImage.findMany({
      where: { isDemo: true },
      select: { url: true, storageKey: true },
    }),
    prisma.category.findMany({
      where: { isDemo: true },
      select: { image: true },
    }),
  ]);

  // Delete physical/CDN files through storage interface
  const keysToDelete = [
    ...demoImages.map(img => img.storageKey || img.url),
    ...demoCategories.map(cat => cat.image).filter(Boolean),
  ];
  if (keysToDelete.length > 0) {
    await deleteImageFiles(keysToDelete);
  }

  // 2. Clear demo cart and wishlist items
  await prisma.cartItem.deleteMany({
    where: { product: { isDemo: true } },
  });

  await prisma.wishlistItem.deleteMany({
    where: { product: { isDemo: true } },
  });

  // 3. For existing orders that reference demo products:
  // Decouple productId on OrderItem so foreign key constraint does not block product deletion,
  // while preserving all snapshot data (productName, price, image, etc.)!
  await prisma.orderItem.updateMany({
    where: { product: { isDemo: true } },
    data: { productId: null, variantId: null },
  });

  // 4. Delete demo stock logs
  await prisma.stockLog.deleteMany({
    where: { product: { isDemo: true } },
  });

  // 5. Delete demo product images, variants, products, categories, testimonials
  const [deletedImages, deletedVariants, deletedProducts, deletedCategories, deletedTestimonials] = await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { isDemo: true } }),
    prisma.productVariant.deleteMany({ where: { isDemo: true } }),
    prisma.product.deleteMany({ where: { isDemo: true } }),
    prisma.category.deleteMany({ where: { isDemo: true } }),
    prisma.testimonial.deleteMany({ where: { isDemo: true } }),
  ]);

  logger.info({
    deletedProducts: deletedProducts.count,
    deletedCategories: deletedCategories.count,
    deletedImages: deletedImages.count,
  }, 'All demo data successfully deleted from store');

  return {
    deletedProducts: deletedProducts.count,
    deletedCategories: deletedCategories.count,
    deletedImages: deletedImages.count,
    deletedVariants: deletedVariants.count,
    deletedTestimonials: deletedTestimonials.count,
  };
}
