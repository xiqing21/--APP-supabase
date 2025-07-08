import { Router } from 'express';
const router = Router();

// 任务相关路由将在后续实现
router.get('/', (req, res) => {
  res.json({ message: '任务路由' });
});

export { router as taskRoutes }; 