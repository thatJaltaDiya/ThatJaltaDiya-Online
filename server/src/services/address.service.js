import { prisma } from '../config/prisma.js';

const MAX_ADDRESSES = 10;

export async function listAddresses(userId) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createAddress(userId, data) {
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) {
    const error = new Error(`Maximum of ${MAX_ADDRESSES} saved addresses reached.`);
    error.statusCode = 400;
    error.errorCode = 'MAX_ADDRESSES_REACHED';
    throw error;
  }

  const shouldBeDefault = data.isDefault || count === 0;

  return prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId,
        recipientName: data.recipientName.trim(),
        phone: data.phone.trim(),
        street: data.street.trim(),
        apartment: data.apartment ? data.apartment.trim() : null,
        city: data.city.trim(),
        state: data.state.trim(),
        postalCode: data.postalCode.trim(),
        country: data.country || 'IN',
        isDefault: shouldBeDefault,
      },
    });
  });
}

export async function updateAddress(userId, addressId, data) {
  // Enforce ownership check to prevent IDOR
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!existing) {
    const error = new Error('Address not found or unauthorized.');
    error.statusCode = 404;
    error.errorCode = 'ADDRESS_NOT_FOUND';
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id: addressId },
      data: {
        ...data,
        recipientName: data.recipientName ? data.recipientName.trim() : undefined,
        phone: data.phone ? data.phone.trim() : undefined,
        street: data.street ? data.street.trim() : undefined,
      },
    });
  });
}

export async function deleteAddress(userId, addressId) {
  // Enforce ownership check
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!existing) {
    const error = new Error('Address not found or unauthorized.');
    error.statusCode = 404;
    error.errorCode = 'ADDRESS_NOT_FOUND';
    throw error;
  }

  return prisma.address.delete({
    where: { id: addressId },
  });
}

export async function setDefaultAddress(userId, addressId) {
  return updateAddress(userId, addressId, { isDefault: true });
}
