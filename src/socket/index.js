import prisma from "../utils/prisma.client.js";

export default function initializeSocketIO(io) {
  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);
    socket.on("joinPoll", (pollId) => {
      console.log(`A user joined poll ${pollId}`);
      socket.join(`poll-${pollId}`); // join a room for this poll
    });
    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });
}

/**
 * Broadcast updated poll results to all clients in a poll room.
 * This is called by the vote controller after a vote is saved.
 */
export async function broadcastPollResults(io, pollId) {
  console.log("Broadcasting results for poll", pollId);
  // Fetch updated vote counts
  const pollOptions = await prisma.pollOption.findMany({
    where: { pollId: parseInt(pollId) },
    include: { votes: true },
  });

  const totalVotes = pollOptions.reduce(
    (sum, opt) => sum + opt.votes.length,
    0
  );
  const results = pollOptions.map((opt) => ({
    id: opt.id,
    text: opt.text,
    votes: opt.votes.length,
    pollId: parseInt(pollId),
    percentage:
      totalVotes > 0
        ? ((opt.votes.length / totalVotes) * 100).toFixed(2)
        : "0.00",
  }));

  io.to(`poll-${pollId}`).emit("updateResults", results);
}
