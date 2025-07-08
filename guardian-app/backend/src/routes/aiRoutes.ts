import { Router } from 'express';
const router = Router();

// AI相关路由将在后续实现
router.post('/chat', (req, res) => {
  res.json({ 
    message: 'AI助手聊天接口',
    note: '需要配置OpenAI API Key' 
  });
});

router.post('/nl2sql', (req, res) => {
  res.json({ 
    message: 'NL2SQL接口',
    note: '需要实现自然语言转SQL功能'
  });
});

export { router as aiRoutes }; 