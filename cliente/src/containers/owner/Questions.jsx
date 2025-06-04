import React, { useState, useEffect, useContext } from "react";
import { io } from "socket.io-client";
import axios from 'axios';
import { UserContext } from "../../components/UserContext";

const socket2 = io("http://localhost:3000", {
  withCredentials: true,
});

const Questions = () => {
  const [selected, setSelected] = useState(null);
  const [decisionText, setDecisionText] = useState("");
  const { email, ownerData } = useContext(UserContext);
  // const [votingEnabled, setVotingEnabled] = useState(false); // Cambia a true cuando debas habilitar la votación
  const { votingEnabled, setVotingEnabled  } = useContext(UserContext);


  useEffect(() => {
      socket2.on('receive-decision', text => {
        setDecisionText(text);
      });

      // Limpieza para evitar múltiples listeners
      return () => {
        socket2.off('receive-decision');
      };
    }, []);

 
  const handleVoteChange = async (e, decision) => {
    if (!votingEnabled) return;
    const value = e.target.value;
    setSelected(value);

    const nuevoVoto = {
      interior: ownerData.interior,
      apartamento: ownerData.apartamento,
      correo: email,
      proposicion: decision, 
      valor: parseInt(value),
    };
    
    await axios.post('http://localhost:3000/api/votacion', nuevoVoto)
      .then(response => {
      })
    .catch(error => {
      console.error('Error al enviar votos:', error);
     }); 
  };

  return (
    <div className="bg-white p-4 rounded shadow-md space-y-4">
      <div>
        <textarea
          value={decisionText}
          readOnly
          className="w-full border rounded p-2"
          rows={4}
        />
      </div>

      {votingEnabled ? (
        <p className="text-green-600">¡Puedes votar ahora! ✅</p>
      ) : (
        <p className="text-gray-400">La votación aún no está habilitada ⏳</p>
      )}


      <form className="space-y-2">
        <fieldset>
          <legend className="font-medium mb-2">Opciones para decidir sobre propuesta</legend>
          <label className="block">
            <input
              type="radio"
              name="myRadio"
              value="1"
              disabled={!votingEnabled}
              checked={selected === "1"}
              onChange={ (e) => handleVoteChange(e, decisionText)}
            />{" "}
            Aprueba
          </label>
          <label className="block">
            <input
              type="radio"
              name="myRadio"
              value="2"
              disabled={!votingEnabled}
              checked={selected === "2"}
              onChange={ (e) => handleVoteChange(e, decisionText) } 
            />{" "}
            Rechaza
          </label>
          <label className="block">
            <input
              type="radio"
              name="myRadio"
              value="0"
              disabled={!votingEnabled}
              checked={selected === "0"}
              onChange={ (e) => handleVoteChange(e, decisionText) }
            />{" "}
            Blanco
          </label>
        </fieldset>
      </form>
    </div>
  );
};

export default Questions;

