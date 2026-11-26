import { prisma } from '../config/prisma.js';

/**
 * Helper to retrieve or create a cart for either user or guest
 */
export async function getOrCreateCart({ userId = null, guestId = null }) {
  if (!userId && !guestId) {
    throw new Error('Either userId or guestId must be provided.');
  }

  const cartInclude = {
    items: {
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        },
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    },
  };

  let cart = await prisma.cart.findFirst({
    where: userId ? { userId } : { guestId },
    include: cartInclude,
  });

  if (!cart) {
    try {
      cart = await prisma.cart.create({
        data: userId ? { userId } : { guestId },
        include: cartInclude,
      });
    } catch (err) {
      if (err.code === 'P2002') {
        cart = await prisma.cart.findFirst({
          where: userId ? { userId } : { guestId },
          include: cartInclude,
        });
      } else {
        throw err;
      }
    }
  }

  // Calculate totals and stock status
  let subtotal = 0;
  let totalItems = 0;

  const enrichedItems = cart.items.map(item => {
    const unitPrice = item.variant ? item.variant.price : item.product.price;
    const availableStock = item.variant ? item.variant.stock : item.product.stock;
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;
    totalItems += item.quantity;

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      productSlug: item.product.slug,
      sku: item.variant ? item.variant.sku : item.product.sku,
      image: item.product.images[0]?.url || null,
      price: unitPrice,
      quantity: item.quantity,
      itemTotal,
      availableStock,
      isOutOfStock: availableStock <= 0,
      isLowStock: availableStock > 0 && availableStock < item.quantity,
      variantName: item.variant?.name || null,
      options: item.variant?.options || null,
    };
  });

  return {
    id: cart.id,
    items: enrichedItems,
    subtotal,
    totalItems,
  };
}

export async function addToCart({ userId, guestId, productId, variantId = null, quantity = 1 }) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });

  if (!product || !product.isActive || product.deletedAt) {
    const error = new Error('Product is unavailable.');
    error.statusCode = 404;
    throw error;
  }

  let maxStock = product.stock;
  if (variantId) {
    const variant = product.variants.find(v => v.id === variantId);
    if (!variant) {
      const error = new Error('Selected variant does not exist.');
      error.statusCode = 404;
      throw error;
    }
    maxStock = variant.stock;
  }

  if (maxStock <= 0) {
    const error = new Error('This item is currently out of stock.');
    error.statusCode = 400;
    error.errorCode = 'OUT_OF_STOCK';
    throw error;
  }

  const cart = await getOrCreateCart({ userId, guestId });

  // Check if item already exists in cart
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
      variantId: variantId || null,
    },
  });

  if (existingItem) {
    const newQty = Math.min(existingItem.quantity + quantity, maxStock);
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQty },
    });
  } else {
    const initialQty = Math.min(quantity, maxStock);
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
        quantity: initialQty,
      },
    });
  }

  return getOrCreateCart({ userId, guestId });
}

export async function updateCartItem({ userId, guestId, cartItemId, quantity }) {
  const cart = await getOrCreateCart({ userId, guestId });

  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cartId: cart.id },
    include: { product: true, variant: true },
  });

  if (!item) {
    const error = new Error('Cart item not found.');
    error.statusCode = 404;
    throw error;
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
  } else {
    const maxStock = item.variant ? item.variant.stock : item.product.stock;
    const safeQty = Math.min(quantity, maxStock);
    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: safeQty },
    });
  }

  return getOrCreateCart({ userId, guestId });
}

export async function removeFromCart({ userId, guestId, cartItemId }) {
  const cart = await getOrCreateCart({ userId, guestId });

  await prisma.cartItem.deleteMany({
    where: { id: cartItemId, cartId: cart.id },
  });

  return getOrCreateCart({ userId, guestId });
}

export async function clearCart({ userId, guestId }) {
  const cart = await getOrCreateCart({ userId, guestId });
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return { id: cart.id, items: [], subtotal: 0, totalItems: 0 };
}

/**
 * Merge guest cart items into authenticated user's cart on login
 */
export async function mergeGuestCart(userId, guestId) {
  if (!guestId || !userId) return;

  const guestCart = await prisma.cart.findUnique({
    where: { guestId },
    include: { items: true },
  });

  if (!guestCart || guestCart.items.length === 0) return;

  const userCart = await getOrCreateCart({ userId });

  for (const item of guestCart.items) {
    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: userCart.id,
        productId: item.productId,
        variantId: item.variantId,
      },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      });
    }
  }

  // Delete guest cart
  await prisma.cart.delete({ where: { id: guestCart.id } });
}
