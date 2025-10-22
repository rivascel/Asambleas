import React, { useState, useEffect, useRef, useContext } from "react";
import { UserContext } from "../../components/UserContext";
import { io } from "socket.io-client";
import { startBroadcasting, stopLocalStream, 
  listenForAnswers,
  joinStreamAsAdmin, listenForApprovals
 } from "../../hooks/webrtc-manager";
import { listenToApprovals, registerAdminIsActive } from "../../supabase-client";

const socket10 = io("https://localhost:3000", {
  withCredentials: true,
});

// const script = document.createElement("script");
// script.src = "https://cdn.metered.ca/sdk/frame/1.4.3/sdk-frame.min.js";
// document.body.appendChild(script);

const VideoGeneral = () => {

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const localRef = useRef();
  const remoteRef = useRef();
  const { email } = useContext(UserContext);
  const roomId="main-room";

  const socket16 = io("https://localhost:3000", {
    withCredentials: true,
  });

  const ownerInfo = JSON.parse(localStorage.getItem("ownerInfo"));
  const [approvedViewer, setApprovedViewer] = useState(null);
  const [viewerReady, setViewerReady] = useState(false);
  let check=false;

  //1. Effect escuchar aprobaciones
  useEffect(() => {

    let unsubscribe;
    listenForApprovals(roomId);
    
    (async () => {
      unsubscribe = await listenToApprovals(roomId, ({ user_id }) => { 
      console.log("Escuchando aprobaciones", user_id);
      setApprovedViewer(user_id);
      setViewerReady(true);
    });
      })();
    
    return () => {
      if (unsubscribe) unsubscribe();
    }

  },[roomId]);

  //Detectar stream del viewer
//   useEffect(() => {
//     if (!approvedViewer) return;

//     const interval = setInterval(() => {
//     const video = remoteRef.current;
//     if (video && video.srcObject && video.readyState >= 3) {
//       setViewerReady(true)};
//     }, 2000);

//   return () => clearInterval(interval);
// }, [approvedViewer]);

useEffect( () => {
    // if (check) {

    if (!approvedViewer) return;

    const fetchData =  async () => {
      // const adminId = await getAdmin(roomId);
      // Unirse al stream
      await registerAdminIsActive(roomId, email);
      await joinStreamAsAdmin(roomId, email, remoteRef.current);
      console.log("valores stream del admin", roomId, email);
      
      // Lógica de la llamada...
      console.log('Llamada en curso...');
      
      // Esperar fin de llamada (5 minutos ejemplo)
      // await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      
      // Prepararse para el siguiente viewer
      setApprovedViewer(true);
    };
    fetchData();
  // }
  //   else return;
  }, [approvedViewer]);


  //control manual del admin
  // const startViewerTimer = (minutes) => {
  //   if (!approvedViewer || !viewerReady) return;

  //   socket.emit('start-timer', {
  //     viewerId: approvedViewer,
  //     duration: minutes * 60,
  //     roomId: roomId
  //   });
  // };

// const skipViewer = () => {
//   setApprovedViewer(null);
//   setViewerReady(false);
// };

// 4. Fin de intervención
// useEffect(() => {
//   const handleTimerEnd = (data) => {
//     if (data.viewerId === approvedViewer) {
//       setApprovedViewer(null);
//       setViewerReady(false);
//     }
//     };

//   socket.on('timer-ended', handleTimerEnd);
//   return () => socket.off('timer-ended', handleTimerEnd);
// }, [approvedViewer]);

  const openBroadcasting = async () => {
    try {
      // 1. Obtener stream local
      await startBroadcasting(roomId, email, localRef.current);
      //Funcion que escucha las respuestas 

      await listenForAnswers(email);

      setIsBroadcasting(true);

    } catch (error) {
      console.error("Error al iniciar llamada:", error);
    }
  };

  const hangUpBroadcasting = async () => {
    try {
      stopLocalStream(localRef.current);
      setIsBroadcasting(false);
    } catch (error) {
      console.error("Error al colgar llamada:", error);
    }
  };

  return (
    <div className="space-y-6">
{/* 

      {/* Transmisión en vivo */}
      <div className="bg-white p-4 rounded shadow-md">
        <h3 className="text-lg font-medium mb-2">Transmisión de Asamblea</h3>
        
        <div className="flex gap-4 mb-4">
          <video ref={localRef} autoPlay playsInline muted className="rounded border"></video>
        </div>

        <h3 className="text-lg font-medium mb-2">Intervencion de copropietario</h3>

        <div className="flex gap-4 mb-4">
          <video ref={remoteRef} autoPlay playsInline muted className="rounded border"></video>
        </div>

        <div className="controls">
          {!isBroadcasting ? (
           <button
            onClick={openBroadcasting}
            className="bg-blue-600 text-blue px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Iniciar transmisión
          </button> 
          ):(
          <button
            onClick={hangUpBroadcasting}
            className="bg-red-600 text-blue px-6 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            Detener transmisión
          </button>  
          )
        }
        </div>
        
      </div>
    </div>
    )
};

export default VideoGeneral;