import React, { useState, useEffect, useContext,useRef } from "react";
import { io } from "socket.io-client";
import { UserContext } from "../../components/UserContext";
import axios from 'axios';

const socket3 = io("http://localhost:3000", {
  withCredentials: true,
});

const PollingManage = () => {

    const intervalo = useRef(null);

    const [finalMinute, setFinalMinute] = useState(0);
    const [displayTime, setDisplayTime] = useState("00:00");
    const { decisionText, setApprovalVotes, setRejectVotes, setBlankVotes, setVotingEnabled } = useContext(UserContext);


    const initCronometer = () => {
        let minute = 0;
        let second = 0;
        setDisplayTime("00:00");

        socket3.emit('start-cronometer', { 
            time: `${minute}:00` 
        });

        intervalo.current = setInterval(()=>{
            second++;
            if (second === 60) {
                minute++;
                second = 0;
            }

            if (minute >= finalMinute) {
                parar();
                alert("El tiempo terminó");

                socket3.emit('end-cronometer');
            }

            const sAux = second < 10 ? "0" + second : second;
            const mAux = minute < 10 ? "0" + minute : minute;

            // Actualizar el cronómetro
            const time = mAux + ":" + sAux;
            setDisplayTime(time);

            // Enviar el cronómetro actualizado a los clientes
            socket3.emit('update-cronometer', { time });

            function parar() {
                if (intervalo.current) {
                    clearInterval(intervalo.current);
                    intervalo.current= null;
                }
            }
        }, 100);
    };

    async function countVotes() {
            try { 
            //trae las votaciones
            const response = await axios.get("http://localhost:3000/api/file")
            //trae los propietarios y su participacion
            const res = await axios.get("http://localhost:3000/api/emailFile")
    
            const votesData = response.data;
            const ownerData = res.data;
    
            if (!Array.isArray(votesData) && !Array.isArray(ownerData)) {
                        throw new Error("La respuesta del servidor no es un arreglo.");
                }
    
            for (let i = 0; i < votesData.length; i++) {
                let vote = votesData[i];
                if (typeof vote.correo !== 'string') {
                    console.warn(`Correo inválido en votesData[${i}]:`, vote);
                    continue;
                }
                let found = false; // Bandera para verificar si encontramos el correo en ownerData
                
                for (let j = 0; j < ownerData.length; j++) { 
                    if ( typeof votesData[i].correo === 'string' &&
                         typeof ownerData[j].correo === 'string' &&
                         votesData[i].correo.trim() === ownerData[j].correo.trim()) {
                        // console.log(`Voto ${i}: ${votesData[i].correo}, Data ${j}: ${ownerData[j].correo}`);
                        found = true; // Se encontró una coincidencia
    
                        votesData[i].participacion = ownerData[j].participacion;
                        
                        // console.log("Consolidado Votacion",votesData);
                        break; // Salir del bucle interno si ya encontramos el correo
                    }
                }
            
                if (!found) {
                    console.log(`No se encontró el correo: ${votesData[i].correo}`);
                }
            }
    
            const filteredVotes = votesData.filter(vote => decisionText === vote.proposicion.trim());
    
            const contarVotosApprobal = (votos) => {
                        return votos.reduce((total, voto) => {
                            if (parseInt(voto.valor) === 1 && voto.participacion === 0) {
                                return total + 1;  // Cuenta el voto
                            } else if (parseInt(voto.valor) === 1 && voto.participacion !== 0) {
                                return total + (1 * voto.participacion);  // Multiplica por participación
                            } else {
                                return total;
                            }
                        }, 0);
                    };
                    
            const contarVotosReject = (votos) => {
                return votos.reduce((total, voto) => {
                    if (voto.valor === 2 && voto.participacion === 0) {
                        return total + 1;
                    } else if (voto.valor === 2 && voto.participacion !== 0) {
                        return total + (1 * voto.participacion);
                    } else {
                        return total;
                    }
                }, 0);
            };
                    
            const contarVotosBlank = (votos) => {
                return votos.reduce((total, voto) => {
                    if (voto.valor === 0 && voto.participacion === 0) {
                        return total + 1;
                    } else if (voto.valor === 0 && voto.participacion !== 0) {
                        return total + (1 * voto.participacion);
                    } else {
                        return total;
                    }
                }, 0);
            };
    
            setApprovalVotes(contarVotosApprobal(filteredVotes));
            setRejectVotes(contarVotosReject(filteredVotes));
            setBlankVotes(contarVotosBlank(filteredVotes));
    
          socket3.emit('send-votes',{
            approval: contarVotosApprobal(filteredVotes),
            reject: contarVotosReject(filteredVotes),
            blank: contarVotosBlank(filteredVotes),

          });
    
            } catch (error) {
            console.error("Error al contar los votos:", error);
            return null;
            };
        };

    return (
        <div className="bg-white p-4 rounded shadow-md space-y-4">
            <div className="meeting__polling--cronometer">
                <h3>Ingreso los minutos para votar:</h3>
                <input 
                   type="number" 
                   name="minuto" 
                   value={finalMinute}
                   onChange={(e) => setFinalMinute(parseInt(e.target.value))}
                />

                <h3>Cronómetro actual: {displayTime}</h3>
                <button 
                    onClick={initCronometer}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                        Inicie cronometro
                </button>
            </div>
            <div className="meeting__polling--summary">
                <h2>Resultados Votación</h2>
                    <canvas id="results" width="300" height="200"></canvas>
                    <div id="statical" hidden></div>
                    <button type="button" 
                    id="calculo"
                    onClick={countVotes}
                    >Conteo</button>
                    <button type="button" 
                    id="ocultar">Ocultar</button>
            </div>
        </div>
    );
};
export default PollingManage;