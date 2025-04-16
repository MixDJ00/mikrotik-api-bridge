const express = require('express');
const cors = require('cors');
const { RouterOSAPI } = require('node-routeros');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Middleware xác thực API key
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Kết nối đến Mikrotik
async function connectToMikrotik() {
  const conn = new RouterOSAPI({
    host: process.env.MIKROTIK_HOST || 'hoangmproxy.xyz',
    user: process.env.MIKROTIK_USER || 'admin',
    password: process.env.MIKROTIK_PASSWORD || 'Duong@123',
    port: process.env.MIKROTIK_PORT || 8728
  });

  try {
    await conn.connect();
    return conn;
  } catch (error) {
    console.error('Không thể kết nối đến Mikrotik:', error);
    throw error;
  }
}

// Endpoint kiểm tra kết nối
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

// Endpoint để lấy danh sách proxy
app.get('/api/proxies', apiKeyAuth, async (req, res) => {
  try {
    const conn = await connectToMikrotik();
    const proxies = await conn.write('/ip/proxy/access/print');
    conn.close();
    res.json(proxies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint để cập nhật username/password
app.post('/api/update-proxy', apiKeyAuth, async (req, res) => {
  const { proxyId, username, password } = req.body;
  
  if (!proxyId || !username || !password) {
    return res.status(400).json({ error: 'Thiếu thông tin cần thiết' });
  }

  try {
    const conn = await connectToMikrotik();
    // Tách proxyId thành IP và port
    const [ip, port] = proxyId.split(':');
    
    // Tìm ID của proxy dựa trên IP và port
    const proxies = await conn.write('/ip/proxy/access/print', [
      '=.proplist=.id,target,port',
      `?target=${ip}`,
      `?port=${port}`
    ]);
    
    if (proxies.length === 0) {
      conn.close();
      return res.status(404).json({ error: 'Không tìm thấy proxy' });
    }
    
    const proxyEntryId = proxies[0]['.id'];
    
    // Cập nhật username và password
    await conn.write('/ip/proxy/access/set', [
      `=.id=${proxyEntryId}`,
      `=user=${username}`,
      `=pass=${password}`
    ]);
    
    conn.close();
    res.json({ success: true, message: 'Đã cập nhật thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
