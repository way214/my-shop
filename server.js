require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(session({
    secret: 'my-shop-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.json());

const dbPath = 'db.json';

function syncAdmin() {
    let db = { users: [] };
    if (fs.existsSync(dbPath)) {
        try { db = JSON.parse(fs.readFileSync(dbPath)); } catch(e) { db = { users: [] }; }
    }
    const adminIdx = db.users.findIndex(u => u.email === "admin@test.com");
    if (adminIdx !== -1) {
        db.users[adminIdx].password = "123"; 
        db.users[adminIdx].permissions = ["all"];
    } else {
        db.users.push({ id: 1, name: "老闆", email: "admin@test.com", password: "123", role: "核心管理", permissions: ["all"], lineId: null });
    }
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}
syncAdmin();

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = JSON.parse(fs.readFileSync(dbPath));
    
    // 這裡做了強力轉換：將輸入與資料庫內容全部轉為「去空白字串」再比對
    const user = db.users.find(u => 
        String(u.email).trim() === String(email).trim() && 
        String(u.password).trim() === String(password).trim()
    );

    if (user) {
        req.session.user = user;
        console.log(`✅ 登入成功: ${email}`);
        res.json({ success: true });
    } else {
        console.log(`❌ 登入失敗: ${email} (密碼嘗試: ${password})`);
        res.json({ success: false, message: '帳號或密碼錯誤' });
    }
});

app.get('/api/check-login', (req, res) => {
    res.json(req.session.user ? { loggedIn: true, user: req.session.user } : { loggedIn: false });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/staff', (req, res) => {
    const db = JSON.parse(fs.readFileSync(dbPath));
    res.json(db.users);
});

app.post('/api/staff', (req, res) => {
    const db = JSON.parse(fs.readFileSync(dbPath));
    db.users.push({ id: Date.now(), ...req.body, lineId: null });
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

app.put('/api/staff/:id', (req, res) => {
    let db = JSON.parse(fs.readFileSync(dbPath));
    const idx = db.users.findIndex(u => u.id == req.params.id);
    if (idx !== -1) {
        db.users[idx] = { ...db.users[idx], ...req.body };
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } else { res.status(404).json({ success: false }); }
});

app.delete('/api/staff/:id', (req, res) => {
    if (req.params.id == 1) return res.status(403).json({ success: false });
    let db = JSON.parse(fs.readFileSync(dbPath));
    db.users = db.users.filter(u => u.id != req.params.id);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.listen(PORT, () => console.log(`🚀 服務運行中：http://localhost:${PORT}`));