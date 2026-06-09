const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors()); // 允许前端跨域访问
app.use(express.json()); // 允许服务器解析 JSON 格式的数据

// 数据库连接配置
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'wpf697697', // 你的数据库密码
    database: 'exp1'
};

// --- [API] 1. 用户登录接口 ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const connection = await mysql.createConnection(dbConfig);

        // 1. 根据用户名查询用户信息
        const [users] = await connection.execute('SELECT * FROM user WHERE username = ?', [username]);

        if (users.length === 0) {
            await connection.end();
            return res.status(401).json({ success: false, message: '用户不存在' });
        }

        const user = users[0];

        // 2. 数据校验：检查用户状态 (实验要求：1-正常, 2-锁定, 3-禁用)
        if (user.status !== 1) {
            await connection.end();
            return res.status(403).json({ success: false, message: '该账号已被锁定或禁用，请联系管理员' });
        }

        // 3. 密码校验
        const isMatch = (password === user.password) || await bcrypt.compare(password, user.password);

        if (!isMatch) {
            await connection.end();
            return res.status(401).json({ success: false, message: '密码错误' });
        }

        // 4. 登录成功，按照实验要求记录最近一次登录时间
        const now = new Date();
        await connection.execute('UPDATE user SET last_login_time = ? WHERE user_id = ?', [now, user.user_id]);
        
        await connection.end();

        // 5. 返回给前端成功信息和角色（role）
        res.json({
            success: true,
            message: '登录成功',
            data: {
                userId: user.user_id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error('登录接口报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- [API] 2. 修改密码接口 ---
app.post('/api/change-password', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [users] = await connection.execute('SELECT * FROM user WHERE user_id = ?', [userId]);
        if (users.length === 0) {
            await connection.end();
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        
        const user = users[0];

        const isMatch = (oldPassword === user.password) || await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            await connection.end();
            return res.status(401).json({ success: false, message: '原密码错误' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await connection.execute('UPDATE user SET password = ? WHERE user_id = ?', [hashedPassword, userId]);
        await connection.end();

        res.json({ success: true, message: '密码修改成功，已加密存储！请重新登录。' });

    } catch (error) {
        console.error('修改密码接口报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- [API] 3. 获取所有用户列表接口 (🌟 升级为带 LEFT JOIN 的联动查询) ---
app.get('/api/users', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // 使用 LEFT JOIN 联合查询，用 COALESCE 取出不同表里的姓名和编号
        const sql = `
            SELECT 
                u.user_id, u.username, u.role, u.status, u.last_login_time,
                COALESCE(a.name, t.teacher_name, s.stu_name) AS realName,
                COALESCE(t.teacher_no, s.stu_no) AS userNo,
                s.sex
            FROM user u
            LEFT JOIN administrator a ON u.user_id = a.admin_id
            LEFT JOIN teacher t ON u.user_id = t.teacher_id
            LEFT JOIN student s ON u.user_id = s.stu_id
            ORDER BY u.user_id DESC
        `;
        const [users] = await connection.execute(sql);
        
        await connection.end();

        res.json({
            success: true,
            message: '获取用户列表成功',
            data: users
        });

    } catch (error) {
        console.error('获取用户列表接口报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- [API] 4. 新增用户及联动资料接口 (带数据库事务保护) ---
app.post('/api/users', async (req, res) => {
    const { username, role, password, status, realName, userNo, sex } = req.body;
    const connection = await mysql.createConnection(dbConfig);

    try {
        if (!username || !role || !password || !status) {
            return res.status(400).json({ success: false, message: '请填写完整基础信息' });
        }

        await connection.beginTransaction();

        const [existingUsers] = await connection.execute('SELECT user_id FROM user WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            await connection.rollback();
            await connection.end();
            return res.status(400).json({ success: false, message: '该登录账号已存在' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const [userResult] = await connection.execute(
            'INSERT INTO user (username, role, password, status) VALUES (?, ?, ?, ?)',
            [username, role, hashedPassword, status]
        );
        
        const newUserId = userResult.insertId;
        const roleNum = Number(role);

        if (roleNum === 1) { 
            if (!realName) throw new Error('管理员姓名不能为空');
            await connection.execute('INSERT INTO administrator (admin_id, name) VALUES (?, ?)', [newUserId, realName]);
        } else if (roleNum === 2) { 
            if (!realName || !userNo) throw new Error('教师姓名和工号不能为空');
            await connection.execute('INSERT INTO teacher (teacher_id, teacher_no, teacher_name) VALUES (?, ?, ?)', [newUserId, userNo, realName]);
        } else if (roleNum === 3) { 
            if (!realName || !userNo || !sex) throw new Error('学生姓名、学号和性别不能为空');
            if (sex !== '男' && sex !== '女') throw new Error('性别只能是“男”或“女”'); 
            await connection.execute('INSERT INTO student (stu_id, stu_no, stu_name, sex) VALUES (?, ?, ?, ?)', [newUserId, userNo, realName, sex]);
        }

        await connection.commit();
        await connection.end();
        res.json({ success: true, message: '新增用户及详细资料成功！' });

    } catch (error) {
        await connection.rollback();
        await connection.end();
        console.error('新增用户事务报错:', error);
        res.status(500).json({ success: false, message: error.message || '系统错误或学号/工号重复' });
    }
});

// --- [API] 5. 删除用户接口 (教务管理员专属) ---
app.delete('/api/users/:id', async (req, res) => {
    const userId = req.params.id; 

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('DELETE FROM user WHERE user_id = ?', [userId]);
        
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '未找到该用户' });
        }

        res.json({ success: true, message: '用户删除成功！' });

    } catch (error) {
        console.error('删除用户接口报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- [API] 6. 编辑（更新）用户接口 (🌟 升级为带事务联动更新) ---
app.put('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    const { role, status, realName, userNo, sex } = req.body; 

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction(); // 开启事务

        // 1. 更新 user 表的基础状态
        await connection.execute('UPDATE user SET status = ? WHERE user_id = ?', [status, userId]);

        // 2. 根据角色，联动更新详情表
        const roleNum = Number(role);
        if (roleNum === 1) {
            await connection.execute('UPDATE administrator SET name = ? WHERE admin_id = ?', [realName, userId]);
        } else if (roleNum === 2) {
            await connection.execute('UPDATE teacher SET teacher_name = ?, teacher_no = ? WHERE teacher_id = ?', [realName, userNo, userId]);
        } else if (roleNum === 3) {
            await connection.execute('UPDATE student SET stu_name = ?, stu_no = ?, sex = ? WHERE stu_id = ?', [realName, userNo, sex, userId]);
        }

        await connection.commit(); // 提交事务
        await connection.end();
        res.json({ success: true, message: '用户资料联动更新成功！' });

    } catch (error) {
        if (connection) {
            await connection.rollback(); // 出错回滚
            await connection.end();
        }
        console.error('编辑用户报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误或学号/工号重复' });
    }
});


// ==========================================
//          [API] 课程管理模块 (教务管理员)
// ==========================================

// --- 7. 获取所有课程列表 ---
app.get('/api/courses', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        // 按 ID 降序排列，新添加的课程在最前面
        const [courses] = await connection.execute('SELECT * FROM course ORDER BY id DESC');
        await connection.end();
        res.json({ success: true, data: courses });
    } catch (error) {
        console.error('获取课程列表报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- 8. 新增课程 ---
app.post('/api/courses', async (req, res) => {
    const { course_code, course_name, course_hour, credit } = req.body;
    try {
        if (!course_code || !course_name || !course_hour || !credit) {
            return res.status(400).json({ success: false, message: '请完整填写课程信息' });
        }

        const connection = await mysql.createConnection(dbConfig);
        
        // 检查课程代码是否重复 (唯一约束)
        const [existing] = await connection.execute('SELECT id FROM course WHERE course_code = ?', [course_code]);
        if (existing.length > 0) {
            await connection.end();
            return res.status(400).json({ success: false, message: '该课程代码已存在' });
        }

        await connection.execute(
            'INSERT INTO course (course_code, course_name, course_hour, credit) VALUES (?, ?, ?, ?)', 
            [course_code, course_name, course_hour, credit]
        );
        await connection.end();
        res.json({ success: true, message: '新增课程成功！' });
    } catch (error) {
        console.error('新增课程报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- 9. 编辑(更新)课程 ---
app.put('/api/courses/:id', async (req, res) => {
    const courseId = req.params.id;
    // 课程代码通常不允许修改，只允许修改名称、学时和学分
    const { course_name, course_hour, credit } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'UPDATE course SET course_name = ?, course_hour = ?, credit = ? WHERE id = ?', 
            [course_name, course_hour, credit, courseId]
        );
        await connection.end();
        res.json({ success: true, message: '课程信息更新成功！' });
    } catch (error) {
        console.error('更新课程报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- 10. 删除课程 ---
app.delete('/api/courses/:id', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM course WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ success: true, message: '课程删除成功！' });
    } catch (error) {
        console.error('删除课程报错:', error);
        // 如果这门课已经被排进了开课计划(course_schedule)，会因为外键约束删除失败
        res.status(500).json({ success: false, message: '删除失败！该课程可能已被排课。' });
    }
});


// ==========================================
//          [API] 开课计划模块 (教务管理员)
// ==========================================

// --- 11. 获取所有开课计划 ---
app.get('/api/schedules', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        // 联合 teacher 表和 course 表，把教师姓名和课程名查出来
        const sql = `
            SELECT cs.*, t.teacher_name, c.course_name, c.course_code
            FROM course_schedule cs
            LEFT JOIN teacher t ON cs.teacher_id = t.teacher_id
            LEFT JOIN course c ON cs.course_id = c.id
            ORDER BY cs.id DESC
        `;
        const [schedules] = await connection.execute(sql);
        await connection.end();
        res.json({ success: true, data: schedules });
    } catch (error) {
        console.error('获取开课计划报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- 12. 新增开课计划 ---
app.post('/api/schedules', async (req, res) => {
    const { teacher_id, course_id, teaching_class, class_time_info, school_year, semester } = req.body;
    try {
        if (!teacher_id || !course_id || !teaching_class || !school_year || !semester) {
            return res.status(400).json({ success: false, message: '请完整填写必填项' });
        }

        const connection = await mysql.createConnection(dbConfig);
        
        // 校验唯一约束：同一个老师、同一学期、同一门课不能重复开
        const [existing] = await connection.execute(
            'SELECT id FROM course_schedule WHERE teacher_id=? AND course_id=? AND school_year=? AND semester=?',
            [teacher_id, course_id, school_year, semester]
        );
        if (existing.length > 0) {
            await connection.end();
            return res.status(400).json({ success: false, message: '该开课计划已存在（同教师/同课程/同学期冲突）' });
        }

        await connection.execute(
            'INSERT INTO course_schedule (teacher_id, course_id, teaching_class, class_time_info, school_year, semester) VALUES (?, ?, ?, ?, ?, ?)',
            [teacher_id, course_id, teaching_class, class_time_info || '', school_year, semester]
        );
        await connection.end();
        res.json({ success: true, message: '开课计划发布成功！' });
    } catch (error) {
        console.error('新增开课计划报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- 13. 编辑开课计划 ---
app.put('/api/schedules/:id', async (req, res) => {
    // 通常只允许修改上课时间地点和教学班名称，教师和课程一旦排定不建议乱改
    const { teaching_class, class_time_info } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'UPDATE course_schedule SET teaching_class = ?, class_time_info = ? WHERE id = ?',
            [teaching_class, class_time_info, req.params.id]
        );
        await connection.end();
        res.json({ success: true, message: '开课计划更新成功！' });
    } catch (error) {
        console.error('更新开课计划报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- 14. 删除开课计划 ---
app.delete('/api/schedules/:id', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM course_schedule WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ success: true, message: '开课计划取消成功！' });
    } catch (error) {
        console.error('删除开课计划报错:', error);
        res.status(500).json({ success: false, message: '删除失败！可能有学生已经选了这门课。' });
    }
});

// ==========================================
//          [API] 选课管理模块 (教务管理员)
// ==========================================

// --- 15. 获取所有选课记录 ---
app.get('/api/selections', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        // 超级联合查询：串联起 选课表、学生表、排课表、课程表、教师表
        const sql = `
            SELECT 
                sc.id, sc.score, 
                s.stu_no, s.stu_name, 
                c.course_name, c.credit, 
                cs.teaching_class, cs.school_year, cs.semester,
                t.teacher_name
            FROM student_course sc
            JOIN student s ON sc.stu_id = s.stu_id
            JOIN course_schedule cs ON sc.course_schedule_id = cs.id
            JOIN course c ON cs.course_id = c.id
            JOIN teacher t ON cs.teacher_id = t.teacher_id
            ORDER BY sc.id DESC
        `;
        const [selections] = await connection.execute(sql);
        await connection.end();
        res.json({ success: true, data: selections });
    } catch (error) {
        console.error('获取选课记录报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- 16. 新增选课 (排课分配) ---
app.post('/api/selections', async (req, res) => {
    const { stu_id, course_schedule_id } = req.body;
    try {
        if (!stu_id || !course_schedule_id) return res.status(400).json({ success: false, message: '请选择学生和开课计划' });

        const connection = await mysql.createConnection(dbConfig);
        
        // 校验：防止同一个学生重复选同一门排课
        const [existing] = await connection.execute('SELECT id FROM student_course WHERE stu_id = ? AND course_schedule_id = ?', [stu_id, course_schedule_id]);
        if (existing.length > 0) {
            await connection.end();
            return res.status(400).json({ success: false, message: '该学生已选修此课程班级，请勿重复分配' });
        }

        await connection.execute('INSERT INTO student_course (stu_id, course_schedule_id) VALUES (?, ?)', [stu_id, course_schedule_id]);
        await connection.end();
        res.json({ success: true, message: '选课分配成功！' });
    } catch (error) {
        console.error('新增选课报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- 17. 录入/修改成绩 ---
app.put('/api/selections/:id', async (req, res) => {
    const { score } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE student_course SET score = ? WHERE id = ?', [score, req.params.id]);
        await connection.end();
        res.json({ success: true, message: '成绩更新成功！' });
    } catch (error) {
        console.error('更新成绩报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- 18. 删除选课记录 ---
app.delete('/api/selections/:id', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM student_course WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ success: true, message: '退课成功！' });
    } catch (error) {
        console.error('删除选课报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// ==========================================
//          [API] 教师端专属模块 (Role = 2)
// ==========================================

// --- 19. 教师获取自己负责的教学班级 ---
app.get('/api/teacher/classes', async (req, res) => {
    // 通过查询参数传入当前登录教师的 user_id
    const { teacher_id } = req.query; 
    try {
        const connection = await mysql.createConnection(dbConfig);
        const sql = `
            SELECT cs.*, c.course_name, c.credit, c.course_code
            FROM course_schedule cs
            JOIN course c ON cs.course_id = c.id
            WHERE cs.teacher_id = ?
            ORDER BY cs.school_year DESC, cs.semester DESC
        `;
        const [classes] = await connection.execute(sql, [teacher_id]);
        await connection.end();
        res.json({ success: true, data: classes });
    } catch (error) {
        console.error('获取教师班级报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// --- 20. 教师获取某教学班的学生名单及成绩 ---
app.get('/api/teacher/students', async (req, res) => {
    // 传入开课计划的 ID，查出选了这门课的所有学生
    const { schedule_id } = req.query;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const sql = `
            SELECT sc.id as selection_id, sc.score, s.stu_no, s.stu_name, s.sex
            FROM student_course sc
            JOIN student s ON sc.stu_id = s.stu_id
            WHERE sc.course_schedule_id = ?
        `;
        const [students] = await connection.execute(sql, [schedule_id]);
        await connection.end();
        res.json({ success: true, data: students });
    } catch (error) {
        console.error('获取学生名单报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// ==========================================
//          [API] 学生端专属模块 (Role = 3)
// ==========================================

// --- 21. 学生获取自己的课程与成绩 ---
app.get('/api/student/courses', async (req, res) => {
    const { stu_id } = req.query; // 获取当前登录学生的 ID
    try {
        const connection = await mysql.createConnection(dbConfig);
        // 联合查询：选课表 -> 排课表 -> 课程表 & 教师表
        const sql = `
            SELECT 
                sc.score, 
                c.course_name, c.course_code, c.credit, c.course_hour, 
                cs.school_year, cs.semester, 
                t.teacher_name
            FROM student_course sc
            JOIN course_schedule cs ON sc.course_schedule_id = cs.id
            JOIN course c ON cs.course_id = c.id
            JOIN teacher t ON cs.teacher_id = t.teacher_id
            WHERE sc.stu_id = ?
            ORDER BY cs.school_year DESC, cs.semester DESC
        `;
        const [courses] = await connection.execute(sql, [stu_id]);
        await connection.end();
        res.json({ success: true, data: courses });
    } catch (error) {
        console.error('获取学生成绩报错:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});
// --- 启动服务器 ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 后端服务器已启动！正在监听端口 ${PORT}...`);
});