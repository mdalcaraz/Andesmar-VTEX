
export const vtex = {
  getPrice: (req, res) => {
    res.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() })
  }
}