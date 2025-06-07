import React, { useState, useContext } from "react";
import { io } from "socket.io-client";
import { UserContext } from "../../components/UserContext";

const socket1 = io("http://localhost:3000", {
  withCredentials: true,
});

const SendQuestions = () => {
  // const [decisionText, setDecisionText] = useState("Propuesta de ejemplo para ser votada.");
  const { decisionText, setDecisionText } = useContext(UserContext);

  const SendtoUsers = (e) => {
    socket1.emit('send-decision', decisionText);
  };

  return (
    <div className="bg-white p-4 rounded shadow-md space-y-4">
      <div>
        <textarea
          value={decisionText}
          onChange={(e) => setDecisionText(e.target.value)}
          className="w-full border rounded p-2"
          rows={4}
        />
        <button
            onClick={SendtoUsers}
            className="bg-blue-600 text-black px-6 py-2 rounded hover:bg-blue-700"
          >
            Envie Pregunta a los asistentes
          </button>
      </div>

      
    </div>
  );
};

export default SendQuestions;

