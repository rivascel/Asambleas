import React, { useState, useEffect, useRef, useContext } from "react";
import { UserContext } from "../../components/UserContext";
import { io } from "socket.io-client";
import { getAdmin, joinStreamAsViewer, startLocalStream,
  stopLocalStream, 
  listenForAnswers,
  closingConnection
     } from '../../hooks/webrtc-client';

const socket11 = io("https://localhost:3000", {
  withCredentials: true,
});

const VideoGeneral = () => {
  const localRef = useRef();
  const remoteRef = useRef();
  const roomId = 'main-room';
  const { email, ownerData, login, checkApprove } = useContext(UserContext);
  const [adminId, setAdminId] = useState(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const adminRef = useRef();
  const username = email;
  const [viewerReady, setViewerReady] = useState(checkApprove);
  
  const ownerInfo = JSON.parse(localStorage.getItem("ownerInfo"));
  //   if (ownerInfo) {
  //   // console.log("Email del usuario:", ownerInfo.email);
  // }

  let userId;
  socket11.on("approve",userId => {
    console.log("Usuario aprobado:", userId);
  });

  // useEffect(() => {
  //   setViewerReady(checkApprove); // sincroniza con el contexto
  // }, [checkApprove]);


  useEffect(() => {
    // 1️⃣ Validación temprana
    if (!email || !roomId || !ownerInfo?.email) {
      console.warn("Esperando datos para fetch...");
      return;
    }
    
    setViewerReady(checkApprove); // sincroniza con el contexto
    
    const fetchData = async () => {
      const admin = await getAdmin(roomId);
      setAdminId(admin);
      console.log("Admin",admin);

  // const getUser = async () => {
      try {
        const response = await fetch("https://localhost:3000/api/recover-users-id", { 
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ roomId: "main-room", userId: email })
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);

        const userData = await response.json();
        console.log("userData",userData);
        
        const userById = userData.approvedUsersById || [];

        if (userById.includes(email)) {
          console.log("Usuario aprobado uniendose a stream...")
          joinStreamAsViewer(roomId, ownerInfo.email, admin, remoteRef.current);
          setViewerReady(true);
        } else {
          console.log("Usuario aun no aprobado");
          setViewerReady(false);
        };

      } catch (error) {
        console.error("Error fetching user", error);
      }
    };
    // getUser();

    // };
    fetchData();
    
  },[checkApprove, roomId, email, ownerInfo]);

  const openCall = async () => {
    try {
      const adminId = await getAdmin(roomId);
      await startLocalStream(roomId, ownerInfo.email, localRef.current);

      listenForAnswers(ownerInfo.email); 
      setIsAllowed(true);
    } catch (error) {
        console.error("Error al iniciar llamada:", error);
    }
  }

  const closeCall = () => {
    stopLocalStream(localRef.current);
    setIsAllowed(false);
    closingConnection(adminId);
    
  }

  return (
    <div className="space-y-6">
      {/* Transmisión en vivo */}
      <div className="bg-white p-4 rounded shadow-md">

        <h2 className="text-xl font-semibold mb-2">Asamblea en vivo</h2>
        <video ref={remoteRef} autoPlay playsInline className="w-full rounded border"
        ></video>

        <h2 className="text-xl font-semibold mb-2">Intervención del copropietario</h2>
        {viewerReady ? (
          <>
            <video ref={localRef} autoPlay playsInline className="w-full rounded border"
            ></video>

            <div className="controls">
              {!isAllowed ? (
                <button
                  onClick={openCall}
                  className="bg-blue-600 text-blue px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Iniciar llamada
                </button> 
                ):(
                <button
                  onClick={closeCall}
                  className="bg-red-600 text-blue px-6 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  Detener llamada
                </button>  
                )
              }
            </div>
          </>
        ):(
          <p>No hay petición de intervención</p>
        )

        }

      </div>
    </div>
    )
};

export default VideoGeneral;