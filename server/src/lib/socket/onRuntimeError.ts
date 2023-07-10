import { Socket } from "socket.io";
import { emitToSocket } from "./emitToSocket";

export const onRuntimeError = (
  socket: Socket,
  { message: prefix, error }: { message: string; error: any }
) => {
  try {
    let errorMessage = error;

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    const message = `${prefix}: ${errorMessage}`;

    console.error(message);

    emitToSocket(socket, {
      event: "error",
      data: {
        message,
      },
    });
  } catch (e) {
    console.error(`Error emitting to socket: ${e}`);
  }
};
