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

// export const getPolls = async (req, res) => {
//   try {
//     // Fetch polls with options and their votes
//     const polls = await prisma.poll.findMany({
//       include: {
//         options: {
//           include: {
//             votes: true, // Fetch votes for each option
//           },
//         },
//         creator: { select: { id: true, name: true } },
//       },
//     });
//     return res
//       .status(200)
//       .json({ success: true, message: "Polls retrieved successfully.", polls });
//   } catch (error) {
//     console.error("Error fetching polls:", error);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// };

export const getPolls = async (req, res) => {
  try {
    // Fetch polls with options and their votes
    const polls = await prisma.poll.findMany({
      include: {
        options: {
          include: {
            votes: true, // Fetch votes for each option
          },
        },
        creator: { select: { id: true, name: true } },
      },
    });

    // Transform data to include total votes and percentages
    const formattedPolls = polls.map((poll) => {
      const totalVotes = poll.options.reduce(
        (sum, opt) => sum + opt.votes.length,
        0
      );

      const options = poll.options.map((opt) => {
        const voteCount = opt.votes.length;
        const percentage =
          totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(2) : "0.00";
        return {
          id: opt.id,
          text: opt.text,
          votes: voteCount,
          percentage: `${percentage}%`,
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
      sucess: true,
      message: "Polls retrieved successfully.",
      polls: formattedPolls,
    });
  } catch (error) {
    console.error("Error fetching polls:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// export const submitVote = async (req, res) => {
//   const { pollId } = req.params;
//   const { userId = 1, pollOptionId } = req.body;

//   try {
//     // Validate input
//     if (!userId || !pollOptionId) {
//       return res
//         .status(400)
//         .json({
//           success: false,
//           message: "userId and pollOptionId are required.",
//         });
//     }

//     // Check poll existence
//     const poll = await prisma.poll.findUnique({
//       where: { id: parseInt(pollId) },
//     });
//     if (!poll) {
//       return res.status(404).json({ message: "Poll not found." });
//     }

//     // Check option belongs to this poll
//     const option = await prisma.pollOption.findUnique({
//       where: { id: pollOptionId },
//     });
//     if (!option || option.pollId !== poll.id) {
//       return res
//         .status(400)
//         .json({ message: "Invalid poll option for this poll." });
//     }

//     // Prevent double voting
//     const existingVote = await prisma.vote.findUnique({
//       where: { userId_pollOptionId: { userId, pollOptionId } },
//     });

//     if (existingVote) {
//       return res
//         .status(409)
//         .json({ message: "You have already voted for this option." });
//     }

//     // Create vote
//     const vote = await prisma.vote.create({
//       data: { userId, pollOptionId },
//     });

//     // Get updated results
//     const updatedOptions = await prisma.pollOption.findMany({
//       where: { pollId: poll.id },
//       include: { votes: true },
//     });
//     const results = updatedOptions.map((opt) => ({
//       id: opt.id,
//       text: opt.text,
//       votes: opt.votes.length,
//     }));

//     // // Emit real-time update
//     // if (req.io) {
//     //   req.io.to(`poll-${poll.id}`).emit("updateResults", results);
//     // }

//     return res.status(201).json({
//       message: "Vote submitted successfully.",
//       vote,
//       results,
//     });
//   } catch (error) {
//     console.error("Error submitting vote:", error);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// };

export const submitVote = async (req, res) => {
  const { pollId } = req.params;
  const { userId = 1, pollOptionId } = req.body;

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
        userId,
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
      data: { userId, pollOptionId },
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
    // 🔴 Broadcast live results to all clients in this poll room
    if (req.io) {
      req.io.to(`poll_${poll.id}`).emit("pollUpdated", {
        pollId: poll.id,
        options: results,
      });
    }
    return res.status(201).json({ message: "Vote submitted", vote, results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
