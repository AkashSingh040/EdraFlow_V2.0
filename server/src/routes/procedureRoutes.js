const express = require("express");
const {
  getProcedures,
  createProcedure,
  deleteProcedure,
} = require("../controllers/procedureController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// All procedure routes are admin-only
router.use(protect, adminOnly);

router.get("/", getProcedures);
router.post("/", createProcedure);
router.delete("/:id", deleteProcedure);

module.exports = router;
