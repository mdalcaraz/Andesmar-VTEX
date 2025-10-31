export const healthController = {
  index: (req, res) => {
    res.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() })
  }
}
