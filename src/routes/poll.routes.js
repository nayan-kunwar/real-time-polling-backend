import express from "express";
import {
  createPoll,
  getPolls,
  submitVote,
} from "../controllers/poll.controller.js";

const router = express.Router();

router.route("/").post(createPoll).get(getPolls);
router.route("/:pollId/vote").post(submitVote); // vote is tightly coupled with poll. without poll, vote has no meaning.

export default router;
