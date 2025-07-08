-- 数据守护者AI项目 - 数据库初始化脚本
-- 用于向现有的Supabase数据库添加初始数据

-- 1. 插入初始管理员用户
INSERT INTO users (
  id, username, email, password_hash, full_name, role, 
  phone, experience_points, level, region, is_active, 
  created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'admin',
  'admin@guardian.ai',
  '$2b$12$rQNwZ3l3Y8v8O4l5p7M8YuQ8Kl5Z2p7M3r4T6y8P9s1Q2w3E4r5T6y', -- 密码: admin123
  '系统管理员',
  'admin',
  '13800138000',
  0,
  1,
  '总部',
  true,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- 2. 插入测试网格员用户
INSERT INTO users (
  id, username, email, password_hash, full_name, role, 
  phone, experience_points, level, region, is_active, 
  created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  'grid001',
  'grid001@guardian.ai',
  '$2b$12$rQNwZ3l3Y8v8O4l5p7M8YuQ8Kl5Z2p7M3r4T6y8P9s1Q2w3E4r5T6y', -- 密码: 123456
  '张网格',
  'grid_worker',
  '13800138001',
  150,
  2,
  '南山区',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'grid002',
  'grid002@guardian.ai',
  '$2b$12$rQNwZ3l3Y8v8O4l5p7M8YuQ8Kl5Z2p7M3r4T6y8P9s1Q2w3E4r5T6y', -- 密码: 123456
  '李网格',
  'grid_worker',
  '13800138002',
  200,
  2,
  '福田区',
  true,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- 3. 插入成就系统数据
INSERT INTO achievements (
  id, name, title, description, type, requirement, 
  reward_experience, icon_url, created_at
) VALUES 
(
  gen_random_uuid(),
  'first_task',
  '首次任务',
  '完成第一个任务',
  'task',
  '{"task_count": 1}',
  50,
  '🎯',
  NOW()
),
(
  gen_random_uuid(),
  'task_master_10',
  '任务达人',
  '完成10个任务',
  'task',
  '{"task_count": 10}',
  100,
  '⭐',
  NOW()
),
(
  gen_random_uuid(),
  'task_master_50',
  '任务专家',
  '完成50个任务',
  'task',
  '{"task_count": 50}',
  300,
  '🏆',
  NOW()
),
(
  gen_random_uuid(),
  'scan_expert',
  '扫描专家',
  '扫描准确率达到95%以上',
  'scan',
  '{"accuracy_rate": 0.95}',
  200,
  '📱',
  NOW()
),
(
  gen_random_uuid(),
  'data_guardian',
  '数据守护者',
  '累计经验值达到1000',
  'experience',
  '{"experience_points": 1000}',
  500,
  '🛡️',
  NOW()
) ON CONFLICT (name) DO NOTHING;

-- 4. 插入示例任务数据
DO $$
DECLARE
  admin_id UUID;
  grid001_id UUID;
  grid002_id UUID;
BEGIN
  -- 获取用户ID
  SELECT id INTO admin_id FROM users WHERE username = 'admin';
  SELECT id INTO grid001_id FROM users WHERE username = 'grid001';
  SELECT id INTO grid002_id FROM users WHERE username = 'grid002';

  -- 插入示例任务
  IF admin_id IS NOT NULL AND grid001_id IS NOT NULL THEN
    INSERT INTO tasks (
      id, title, description, priority, status, assigned_to, created_by,
      customer_name, customer_phone, address, latitude, longitude,
      contract_number, estimated_duration, due_date, created_at, updated_at
    ) VALUES 
    (
      gen_random_uuid(),
      '深圳科技园企业信息核查',
      '需要对科技园内的5家企业进行营业执照信息核查，确保数据准确性',
      'high',
      'assigned',
      grid001_id,
      admin_id,
      '深圳市科技创新有限公司',
      '0755-12345678',
      '深圳市南山区科技园A座2201室',
      22.5431,
      113.9342,
      'HT202401001',
      120,
      (NOW() + INTERVAL '3 days')::TIMESTAMP,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      '福田CBD商圈数据更新',
      '对福田CBD区域内的商户信息进行更新和验证',
      'normal',
      'pending',
      NULL,
      admin_id,
      '深圳商务中心',
      '0755-87654321',
      '深圳市福田区CBD中心区',
      22.5364,
      114.0579,
      'HT202401002',
      180,
      (NOW() + INTERVAL '5 days')::TIMESTAMP,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      '宝安区制造业企业调研',
      '针对宝安区制造业企业进行实地调研和数据收集',
      'urgent',
      'in_progress',
      grid002_id,
      admin_id,
      '宝安制造集团',
      '0755-56789012',
      '深圳市宝安区工业园区',
      22.5544,
      113.8286,
      'HT202401003',
      240,
      (NOW() + INTERVAL '2 days')::TIMESTAMP,
      NOW(),
      NOW()
    );
  END IF;
END $$;

-- 5. 插入示例扫描记录
DO $$
DECLARE
  grid001_id UUID;
  task_id UUID;
BEGIN
  SELECT id INTO grid001_id FROM users WHERE username = 'grid001';
  SELECT id INTO task_id FROM tasks WHERE title = '深圳科技园企业信息核查' LIMIT 1;

  IF grid001_id IS NOT NULL THEN
    INSERT INTO scan_records (
      id, user_id, task_id, image_url, ocr_result, accuracy_score, 
      differences, created_at
    ) VALUES 
    (
      gen_random_uuid(),
      grid001_id,
      task_id,
      '/uploads/scans/sample_license_001.jpg',
      '{
        "text": "营业执照\\n\\n名称：深圳市科技创新有限公司\\n类型：有限责任公司\\n住所：深圳市南山区科技园A座2201室\\n法定代表人：张总\\n注册资本：壹千万元整\\n成立日期：2020年01月15日\\n统一社会信用代码：91440300MA5XXXXX01",
        "confidence": 0.96,
        "extracted_data": {
          "company_name": "深圳市科技创新有限公司",
          "credit_code": "91440300MA5XXXXX01",
          "legal_person": "张总",
          "address": "深圳市南山区科技园A座2201室",
          "registered_capital": "壹千万元整"
        }
      }',
      0.96,
      '{
        "overall_accuracy": 0.92,
        "total_fields": 5,
        "matched_fields": 4,
        "fields": [
          {"field_name": "企业名称", "match": true, "similarity": 1.0},
          {"field_name": "统一社会信用代码", "match": true, "similarity": 1.0},
          {"field_name": "法定代表人", "match": true, "similarity": 1.0},
          {"field_name": "注册地址", "match": true, "similarity": 1.0},
          {"field_name": "注册资本", "match": false, "similarity": 0.8}
        ]
      }',
      NOW()
    );
  END IF;
END $$;

-- 6. 插入示例绩效数据
DO $$
DECLARE
  grid001_id UUID;
  grid002_id UUID;
BEGIN
  SELECT id INTO grid001_id FROM users WHERE username = 'grid001';
  SELECT id INTO grid002_id FROM users WHERE username = 'grid002';

  IF grid001_id IS NOT NULL THEN
    INSERT INTO performance (
      id, user_id, date, tasks_completed, tasks_assigned,
      accuracy_rate, response_time, score, created_at, updated_at
    ) VALUES 
    (
      gen_random_uuid(),
      grid001_id,
      CURRENT_DATE,
      2,
      3,
      0.95,
      45.5,
      95,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      grid001_id,
      CURRENT_DATE - INTERVAL '1 day',
      1,
      2,
      0.92,
      50.2,
      88,
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    );
  END IF;

  IF grid002_id IS NOT NULL THEN
    INSERT INTO performance (
      id, user_id, date, tasks_completed, tasks_assigned,
      accuracy_rate, response_time, score, created_at, updated_at
    ) VALUES 
    (
      gen_random_uuid(),
      grid002_id,
      CURRENT_DATE,
      1,
      2,
      0.88,
      38.7,
      85,
      NOW(),
      NOW()
    );
  END IF;
END $$;

-- 7. 插入示例通知数据
DO $$
DECLARE
  grid001_id UUID;
  grid002_id UUID;
  task_id UUID;
BEGIN
  SELECT id INTO grid001_id FROM users WHERE username = 'grid001';
  SELECT id INTO grid002_id FROM users WHERE username = 'grid002';
  SELECT id INTO task_id FROM tasks WHERE title = '深圳科技园企业信息核查' LIMIT 1;

  IF grid001_id IS NOT NULL THEN
    INSERT INTO notifications (
      id, user_id, title, message, type, is_read, 
      related_task_id, created_at
    ) VALUES 
    (
      gen_random_uuid(),
      grid001_id,
      '新任务分配',
      '您有新的任务：深圳科技园企业信息核查',
      'info',
      false,
      task_id,
      NOW()
    ),
    (
      gen_random_uuid(),
      grid001_id,
      '任务提醒',
      '任务"深圳科技园企业信息核查"将在2天后到期，请及时完成',
      'warning',
      false,
      task_id,
      NOW()
    );
  END IF;

  IF grid002_id IS NOT NULL THEN
    INSERT INTO notifications (
      id, user_id, title, message, type, is_read, created_at
    ) VALUES 
    (
      gen_random_uuid(),
      grid002_id,
      '系统公告',
      '欢迎使用数据守护者AI系统！',
      'info',
      false,
      NOW()
    );
  END IF;
END $$;

-- 8. 插入示例地点数据
INSERT INTO locations (
  id, name, address, latitude, longitude, type, 
  description, region, created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  '深圳科技园',
  '深圳市南山区科技园',
  22.5431,
  113.9342,
  'business_area',
  '深圳高新技术产业园区',
  '南山区',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '福田CBD',
  '深圳市福田区CBD中心区',
  22.5364,
  114.0579,
  'business_area',
  '福田中央商务区',
  '福田区',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '宝安工业园',
  '深圳市宝安区工业园区',
  22.5544,
  113.8286,
  'industrial_area',
  '宝安区制造业集聚区',
  '宝安区',
  NOW(),
  NOW()
) ON CONFLICT (name) DO NOTHING;

-- 9. 为用户授予成就
DO $$
DECLARE
  grid001_id UUID;
  first_task_achievement_id UUID;
BEGIN
  SELECT id INTO grid001_id FROM users WHERE username = 'grid001';
  SELECT id INTO first_task_achievement_id FROM achievements WHERE name = 'first_task';

  IF grid001_id IS NOT NULL AND first_task_achievement_id IS NOT NULL THEN
    INSERT INTO user_achievements (
      id, user_id, achievement_id, awarded_at, created_at
    ) VALUES 
    (
      gen_random_uuid(),
      grid001_id,
      first_task_achievement_id,
      NOW(),
      NOW()
    ) ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
END $$;

-- 10. 更新用户经验值（基于完成的任务）
UPDATE users 
SET experience_points = experience_points + 50
WHERE username IN ('grid001', 'grid002');

-- 显示初始化结果
SELECT 
  '用户' as 类型, 
  COUNT(*) as 数量
FROM users
WHERE username IN ('admin', 'grid001', 'grid002')
UNION ALL
SELECT 
  '成就' as 类型, 
  COUNT(*) as 数量
FROM achievements
UNION ALL
SELECT 
  '任务' as 类型, 
  COUNT(*) as 数量
FROM tasks
UNION ALL
SELECT 
  '扫描记录' as 类型, 
  COUNT(*) as 数量
FROM scan_records
UNION ALL
SELECT 
  '绩效记录' as 类型, 
  COUNT(*) as 数量
FROM performance
UNION ALL
SELECT 
  '通知' as 类型, 
  COUNT(*) as 数量
FROM notifications
UNION ALL
SELECT 
  '地点' as 类型, 
  COUNT(*) as 数量
FROM locations;

-- 初始化完成提示
SELECT '数据库初始化完成！' as 消息;
SELECT '默认管理员账户: admin / admin123' as 登录信息;
SELECT '测试网格员账户: grid001 / 123456, grid002 / 123456' as 测试账户; 