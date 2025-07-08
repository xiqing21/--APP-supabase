import { Router } from 'express';
const router = Router();

// 扫描相关路由将在后续实现
router.get('/', (req, res) => {
  res.json({ message: '扫描路由' });
});

export { router as scanRoutes }; 