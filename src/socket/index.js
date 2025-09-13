const initializeSocketIO = (io) => {
  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);
    socket.on("joinPoll", (pollId) => {
      console.log(`A user joined poll ${pollId}`);
      socket.join(`poll_${pollId}`); // join a room for this poll
    });
    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });
};

export default initializeSocketIO;
