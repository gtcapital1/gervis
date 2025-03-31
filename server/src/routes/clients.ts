// Endpoint per attivare/disattivare un cliente
router.patch("/:id/toggle-active", async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: "Active status must be a boolean" });
    }

    const result = await db
      .update(clients)
      .set({ active })
      .where(eq(clients.id, parseInt(id)));

    if (!result) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error toggling client active status:", error);
    res.status(500).json({ 
      error: error.message || "Failed to update client status",
      details: error.message
    });
  }
}); 