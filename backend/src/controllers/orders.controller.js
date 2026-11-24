import * as orderService from '../services/order.service.js';
import { apiSuccess } from '../utils/response.js';

export async function createOrder(req, res, next) {
  try {
    const idempotencyKey = req.headers['idempotency-key'];
    const ipAddress = req.headers['cf-connecting-ip'] || req.ip;
    const userAgent = req.headers['user-agent'];

    const order = await orderService.createOrder({
      user: req.user,
      idempotencyKey,
      ...req.body,
      ipAddress,
      userAgent,
    });

    return apiSuccess(res, order, 'Order placed successfully!', 201);
  } catch (error) {
    next(error);
  }
}

export async function listOrders(req, res, next) {
  try {
    const orders = await orderService.listUserOrders(req.user.id);
    return apiSuccess(res, orders);
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.user.id, req.params.orderId);
    return apiSuccess(res, order);
  } catch (error) {
    next(error);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const updated = await orderService.cancelOrderByCustomer(req.user.id, req.params.orderId);
    return apiSuccess(res, updated, 'Order cancelled successfully.');
  } catch (error) {
    next(error);
  }
}
