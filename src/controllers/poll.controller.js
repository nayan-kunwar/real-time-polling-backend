import { parse } from "dotenv";
import { broadcastPollResults } from "../socket/index.js";
import prisma from "../utils/prisma.client.js";

export const createPoll = async (req, res) => {
  const { question, options, creatorId, isPublished } = req.body;

  try {
    // Validate input
    if (
      !question ||
      !options ||
      !Array.isArray(options) ||
      options.length < 2
    ) {
      return res.status(400).json({
        message: "Question and at least two options are required.",
      });
    }

    if (!creatorId) {
      return res.status(400).json({ message: "Creator ID is required." });
    }

    // Check that the creator exists
    const creator = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!creator) {
      return res.status(404).json({ message: "Creator not found." });
    }

    // Create the poll with options
    const poll = await prisma.poll.create({
      data: {
        question,
        isPublished: isPublished ?? false,
        creatorId,
        options: {
          create: options.map((text) => ({ text })),
        },
      },
      include: {
        options: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Poll created successfully.",
      poll,
    });
  } catch (error) {
    console.error("Error creating poll:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getPolls = async (req, res) => {
  try {
    // Fetch polls with options, votes, and the users who voted
    const polls = await prisma.poll.findMany({
      include: {
        options: {
          include: {
            votes: {
              include: {
                user: { select: { id: true, name: true, email: true } }, // Include voter details
              },
            },
          },
        },
        creator: { select: { id: true, name: true } },
      },
    });

    // Transform data to include total votes, percentages, and voters
    const formattedPolls = polls.map((poll) => {
      const totalVotes = poll.options.reduce(
        (sum, opt) => sum + opt.votes.length,
        0
      );

      const options = poll.options.map((opt) => {
        const voteCount = opt.votes.length;
        const percentage =
          totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(2) : "0.00";

        // Extract voters for this option
        const voters = opt.votes.map((vote) => ({
          id: vote.user.id,
          name: vote.user.name,
          email: vote.user.email,
        }));

        return {
          id: opt.id,
          text: opt.text,
          votes: voteCount,
          percentage: `${percentage}%`,
          voters, // List of users who voted for this option
        };
      });

      return {
        id: poll.id,
        question: poll.question,
        isPublished: poll.isPublished,
        creator: poll.creator,
        totalVotes,
        options,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Polls retrieved successfully.",
      polls: formattedPolls,
    });
  } catch (error) {
    console.error("Error fetching polls:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const submitVote = async (req, res) => {
  const { pollId } = req.params;
  const { userId, pollOptionId } = req.body;

  try {
    if (!pollOptionId) {
      return res.status(400).json({ message: "pollOptionId is required" });
    }

    // Find poll
    const poll = await prisma.poll.findUnique({
      where: { id: parseInt(pollId) },
    });
    if (!poll) return res.status(404).json({ message: "Poll not found." });

    // Validate option belongs to poll
    const option = await prisma.pollOption.findUnique({
      where: { id: pollOptionId },
    });
    if (!option || option.pollId !== poll.id) {
      return res.status(400).json({ message: "Invalid poll option." });
    }

    // Check if user has a previous vote in this poll
    const existingVote = await prisma.vote.findFirst({
      where: {
        userId: parseInt(userId),
        pollOption: { pollId: poll.id },
      },
    });

    // If exists and it's a different option → delete old vote
    if (existingVote && existingVote.pollOptionId !== pollOptionId) {
      await prisma.vote.delete({ where: { id: existingVote.id } });
    }

    // If already voted for the same option → return
    if (existingVote && existingVote.pollOptionId === pollOptionId) {
      return res.status(200).json({ message: "Vote unchanged" });
    }

    // Create new vote
    const vote = await prisma.vote.create({
      data: { userId: parseInt(userId), pollOptionId },
    });

    // Return updated results
    const updatedOptions = await prisma.pollOption.findMany({
      where: { pollId: poll.id },
      include: { votes: true },
    });

    const results = updatedOptions.map((opt) => ({
      id: opt.id,
      text: opt.text,
      votes: opt.votes.length,
    }));

    // Broadcast updated results
    await broadcastPollResults(req.app.get("io"), pollId);

    return res.status(201).json({ message: "Vote submitted", vote, results }); // pollId percentage
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
