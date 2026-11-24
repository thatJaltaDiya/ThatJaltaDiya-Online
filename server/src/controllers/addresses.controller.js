import * as addressService from '../services/address.service.js';
import { apiSuccess } from '../utils/response.js';

export async function list(req, res, next) {
  try {
    const addresses = await addressService.listAddresses(req.user.id);
    return apiSuccess(res, addresses);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const address = await addressService.createAddress(req.user.id, req.body);
    return apiSuccess(res, address, 'Address added successfully.', 201);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const address = await addressService.updateAddress(req.user.id, req.params.addressId, req.body);
    return apiSuccess(res, address, 'Address updated successfully.');
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await addressService.deleteAddress(req.user.id, req.params.addressId);
    return apiSuccess(res, null, 'Address deleted.');
  } catch (error) {
    next(error);
  }
}

export async function setDefault(req, res, next) {
  try {
    const address = await addressService.setDefaultAddress(req.user.id, req.params.addressId);
    return apiSuccess(res, address, 'Default address updated.');
  } catch (error) {
    next(error);
  }
}
