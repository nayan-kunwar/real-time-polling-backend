import express from "express";
import { createUser, getUsers } from "../controllers/user.controller.js";

const router = express.Router();

router.route("/").post(createUser).get(getUsers);

export default router;
