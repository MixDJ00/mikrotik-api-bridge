const express = require('express');
const MikroNode = require('mikronode-ng');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY || 'your_secure_key';

app.post('/update-proxy', async (req, res) => {
  const { key, username, password, newUsername, newPassword } = req.body;

  if (key !== API_KEY) {
    return res.status(403).send({ error: 'Unauthorized' });
  }

  const device = new MikroNode('hoangmproxy.xyz');
  try {
    const [login] = await device.connect();
    const conn = await login('admin', 'Duong@123');
    const chan = conn.openChannel();

    // Xóa user cũ (nếu cần)
    await chan.write(`/ip/proxy/access/remove`, [`?user=${username}`]);

    // Tạo user mới
    await chan.write('/ip/proxy/access/add', [
      `=user=${newUsername}`,
      `=password=${newPassword}`,
      `=action=allow`
    ]);

    chan.close();
    conn.close();
    res.send({ success: true, message: 'User updated' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Error updating MikroTik' });
  }
});

app.listen(3000, () => console.log('MikroTik API Bridge running on port 3000'));
