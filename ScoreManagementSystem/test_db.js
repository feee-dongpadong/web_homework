const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        // 1. 创建数据库连接
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',          // 替换为你的 MySQL 用户名，通常是 root
            password: 'wpf697697', // 👈 务必在这里换成你真实的 MySQL 密码
            database: 'exp1'       // 我们刚才建好的数据库名
        });

        console.log('✅ 数据库连接成功！大动脉已打通！');

        // 2. 联合查询 user 表和 administrator 表，找回刚才初始化的账号
        const sql = `
            SELECT u.username, u.role, a.name, a.telephone 
            FROM user u 
            JOIN administrator a ON u.user_id = a.admin_id 
            WHERE u.username = ?
        `;
        const [rows, fields] = await connection.execute(sql, ['admin01']);

        console.log('🎉 查找到的初始管理员信息：');
        console.log(rows);

        // 3. 测试完毕，关闭连接释放资源
        await connection.end();

    } catch (error) {
        console.error('❌ 数据库连接失败，请检查密码或服务状态：\n', error.message);
    }
}

// 执行测试
testConnection();