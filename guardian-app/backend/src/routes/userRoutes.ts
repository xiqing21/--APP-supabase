import { Router } from 'express';
const router = Router();

// 用户相关路由将在后续实现
router.get('/', (req, res) => {
  res.json({ message: '用户路由' });
});

export { router as userRoutes }; 