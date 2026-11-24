import { prisma } from '../config/prisma.js';

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          products: {
            where: { isActive: true, deletedAt: null }
          }
        }
      }
    }
  });
}

export async function getCategoryBySlug(slug) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isActive: true, deletedAt: null },
        include: { images: true, variants: true }
      }
    }
  });

  if (!category) {
    const error = new Error('Category not found.');
    error.statusCode = 404;
    error.errorCode = 'CATEGORY_NOT_FOUND';
    throw error;
  }

  return category;
}

export async function createCategory(data) {
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  return prisma.category.create({
    data: {
      name: data.name.trim(),
      slug,
      description: data.description ? data.description.trim() : null,
      image: data.image || null,
      isDemo: data.isDemo || false,
    }
  });
}

export async function updateCategory(id, data) {
  return prisma.category.update({
    where: { id },
    data: {
      ...data,
      name: data.name ? data.name.trim() : undefined,
    }
  });
}

export async function deleteCategory(id) {
  // Check if products exist in category
  const productCount = await prisma.product.count({
    where: { categoryId: id, deletedAt: null }
  });

  if (productCount > 0) {
    const error = new Error(`Cannot delete category with ${productCount} active product(s). Please reassign or delete products first.`);
    error.statusCode = 400;
    error.errorCode = 'CATEGORY_NOT_EMPTY';
    throw error;
  }

  return prisma.category.delete({
    where: { id }
  });
}
