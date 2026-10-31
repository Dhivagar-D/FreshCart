import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ScheduledOrder } from '../models/ScheduledOrder.js';
import { Product } from '../models/Product.js';
const router = Router();
router.use(requireAuth);
router.use((req, res, next) => req.user.role === 'buyer' ? next() : res.status(403).json({ error: 'Scheduled purchasing is available to buyer accounts only' }));
router.get('/', async (req, res) => {
  const schedules = await ScheduledOrder.find({ buyerId: req.user._id }).populate('items.productId', 'name price unit stock isActive').sort({ createdAt: -1 });
  res.json(schedules);
});
router.post('/', async (req, res) => {
  try {
    const { name, frequency, items, deliveryAddress, nextRunAt } = req.body;
    if (!name || !['weekly', 'biweekly', 'monthly'].includes(frequency) || !Array.isArray(items) || !items.length || !deliveryAddress?.street || !nextRunAt) return res.status(400).json({ error: 'Name, frequency, items, delivery street and next run date are required' });
    const normalized = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!item.productId || !Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: 'Each scheduled item needs a product and positive quantity' });
      const product = await Product.findOne({ _id: item.productId, isActive: true });
      if (!product) return res.status(400).json({ error: 'One or more scheduled products are unavailable' });
      normalized.push({ productId: product._id, quantity });
    }
    const date = new Date(nextRunAt);
    if (Number.isNaN(date.getTime()) || date <= new Date()) return res.status(400).json({ error: 'Next run date must be in the future' });
    const schedule = await ScheduledOrder.create({ buyerId: req.user._id, name, frequency, items: normalized, deliveryAddress, nextRunAt: date });
    res.status(201).json(schedule);
  } catch (error) { res.status(500).json({ error: 'Could not create scheduled order' }); }
});
router.patch('/:id', async (req, res) => {
  const allowed = {};
  if (typeof req.body.active === 'boolean') allowed.active = req.body.active;
  if (req.body.name !== undefined) allowed.name = String(req.body.name).trim().slice(0, 100);
  if (req.body.nextRunAt !== undefined) {
    const date = new Date(req.body.nextRunAt);
    if (Number.isNaN(date.getTime()) || date <= new Date()) return res.status(400).json({ error: 'Next run date must be in the future' });
    allowed.nextRunAt = date;
  }
  const schedule = await ScheduledOrder.findOneAndUpdate({ _id: req.params.id, buyerId: req.user._id }, { $set: allowed }, { new: true, runValidators: true });
  if (!schedule) return res.status(404).json({ error: 'Scheduled order not found' });
  res.json(schedule);
});
router.delete('/:id', async (req, res) => {
  const schedule = await ScheduledOrder.findOneAndDelete({ _id: req.params.id, buyerId: req.user._id });
  if (!schedule) return res.status(404).json({ error: 'Scheduled order not found' });
  res.json({ message: 'Scheduled order deleted' });
});
export default router;
