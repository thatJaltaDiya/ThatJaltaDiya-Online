import * as contactService from '../services/contact.service.js';
import { apiSuccess } from '../utils/response.js';

export async function submit(req, res, next) {
  try {
    const ipAddress = req.headers['cf-connecting-ip'] || req.ip;
    const message = await contactService.submitContactMessage({
      ...req.body,
      ipAddress,
    });
    return apiSuccess(
      res,
      { id: message.id },
      'Thank you for reaching out! We will get back to you shortly.',
      201
    );
  } catch (error) {
    next(error);
  }
}
