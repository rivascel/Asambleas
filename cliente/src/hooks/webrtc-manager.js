// Import the new functions
import { 
  getAllViewersAndListen,
  listenToSignals, sendSignal, listenToSignalsFromViewer, listenToViewers,
  listenToApprovals
} from "../../src/supabase-client";

// import { handleIncomingICECandidate, processCandidateQueue } from "./webrtc-utilities.js";

let peerConnections = {};
let localStream;
let candidateQueue = [];
let remoteStream;
const appliedAnswers = new Set();

  const response = await fetch('https://localhost:3000/api/webrtc-config');
  const configuration = await response.json();

function createPeerConnection(viewerId) {
  const pc = new RTCPeerConnection(configuration);
  peerConnections[viewerId] = pc;
  return pc;
}

function getPeerConnection(viewerId) {
  return peerConnections[viewerId];
}

function closePeerConnection(viewer) {
  const pc = peerConnections[viewer];
  if (pc) {
    pc.close();
    delete peerConnections[viewer];
    console.log(`✅ PeerConnection de ${viewer} cerrada`);
  }
}


export async function startBroadcasting(roomId, adminId, localVideoElement) {
  // Obtener configuración del servidor
  // const pc = new RTCPeerConnection(configuration);

  try {
    // await registerAdminIsActive(roomId, adminId);

    // 1. Start the admin's local video stream
    await startLocalStream(roomId, adminId, localVideoElement /*, pc*/);
   
  } catch (error) {
    console.error("Failed to start broadcast:", error);
  }
}

  // export async function getAdmin(roomId) {
  //   return await getActiveAdmin(roomId);
  // };


export async function startLocalStream(roomId, adminId, localVideoElement) {
    
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoElement.srcObject = localStream;
    
    // Agregar tracks del local stream
    // localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    await createOfferToViewer(roomId, adminId /*, pc*/);

    return localStream;
  } catch (error) {
    console.error("Error al obtener el stream local:", error);
    throw error;
  }
}

export async function stopLocalStream(localVideoElement, viewerId) {
  // await deleteAdmin(adminId);
  localStream = localVideoElement?.srcObject;
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localVideoElement.srcObject = null;
    console.log("stream detenido correctamente")
  } else {
    console.warn("No hay stream activo en el videoElement");
  }
};

export async function joinStreamAsAdmin(roomId, adminId, streamTarget) {
  try {
    if (!streamTarget) {
    console.log('Invalid video element provided');
    return;
  }
    await receivingStream(roomId, adminId, streamTarget);
    console.log("Admin joined the stream successfully");
  } catch (error) {
    console.error("Viewer failed to join stream:", error);
  }
};

// Admin crea y envía oferta a un viewer
export async function createOfferToViewer(roomId, adminId) {
  if (!adminId)  {
    throw new Error("adminId y roomId es requerido");
  }
  if (!roomId)  {
    throw new Error("roomId es requerido");
  } 

  let unsubscribe;
  let viewerPc;
  let viewerId;
  try {
    
    const {viewers, unsubscribe:unsub} = await getAllViewersAndListen(roomId, async (newViewerId)=>{
      console.log("Nuevo viewer ", newViewerId);
      viewerId=newViewerId;
      console.log("viewer encontrado para oferta:", viewerId);
        // Aquí podrías enviar una nueva oferta al viewer si es necesario
    });
    unsubscribe = unsub;

    for (const viewerId of viewers) {

      viewerPc = getPeerConnection(viewerId);
      if (!viewerPc) {
        viewerPc = createPeerConnection(viewerId);
      } 

      if (localStream) {
        localStream.getTracks().forEach(track => {
          viewerPc.addTrack(track, localStream);
        });
      } else {
        console.error("localStream no está disponible para agregar tracks!");
        return; // O manejar el error apropiadamente
      }


      // Manejar ICE candidates
      viewerPc.onicecandidate = async (event) => {
        if (event.candidate) {
          // Enviar a cada viewer individualmente

          //registra candidates en tabla webrtc_signaling
            try {
              await sendSignal({
              room_id: roomId,
              from_user: adminId,
              to_user: viewerId,
              type: "ice-candidate",
              payload: {
                candidate: event.candidate.candidate,        // ← Esto es crucial
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid
              },
              });
      
            } catch (error) {
                console.error(`Error enviando ICE candidate a ${viewerId}:`, error);
            }
        }
      };

      // Crear y enviar oferta
      const offer = await viewerPc.createOffer();
      await viewerPc.setLocalDescription(offer);

      // Registra oferta en webrtc_signaling
      // Enviar a cada viewer
      await sendSignal({
        room_id: roomId,
        from_user: adminId,
        to_user: viewerId,
        type: "offer",
        payload: offer
      });
    
      // peerConnections[viewerId] = viewerPc;

      console.log(`Oferta enviada a viewer ${viewerId}`);
      console.log()
       
    }

    return { viewers, unsubscribe };
  } catch (error) {
    if (unsubscribe) unsubscribe();
    // viewerPc.close();
    console.error("Error al crear oferta:", error);
    throw error;
    }
}

//Permite recuperar los usuarios aporbados para iniciar llamada
let ApprovedViewer;
export function listenForApprovals(room){
  return new Promise(async (resolve) => {
    const { unsubscribeChannel } = await listenToApprovals(room, (approver) => { 
      ApprovedViewer = approver.user_id;
      console.log("Viewer aprobado:", ApprovedViewer);
      // unsubscribeChannel.unsubscribe();
      resolve(ApprovedViewer);
    });
  });
}

// Escucha las answers a la offer que creó el viewer al admin
export async function listenForAnswers(adminId) {
  //Viene del video_owner.jsx con el usuario adminId
  await listenToSignals(adminId, async ({ from_user, type, payload }) => { 
    const viewerId = from_user;
    // const pc = peerConnections[viewerId];
    const pc = getPeerConnection(viewerId);

    if (!pc) {
      console.warn(`No se encontró conexión para viewer ${viewerId}`);
      // return;
    } 

    if (type === "answer") {
      await handleAnswer(from_user, payload);
    

        // Verificar el estado de señalización
    console.log("Estado actual de señalización:", pc.signalingState);
    
    if (pc.signalingState !== "have-local-offer") {
        console.warn("Estado incorrecto para answer. Estado actual:", pc.signalingState);
        return;
    }

    console.log("📦 Payload recibido del answer:", payload);

    const answer = typeof payload === "string" ? JSON.parse(payload) : payload;

    if (pc.signalingState === "have-local-offer") {
      await pc.setRemoteDescription(answer);
      console.log(`✅ Answer aplicado para ${viewerId}`);
    } else {
      console.warn(`⚠️ Estado inesperado: ${pc.signalingState} para ${viewerId}`);
    }

    try {
      while (candidateQueue.length > 0) {
        const queuedCandidate = candidateQueue.shift();
        try {
            await pc.addIceCandidate(queuedCandidate);
            console.log('✅ Candidato en cola agregado')
        } catch (err) {
          console.error('Error agregando candidato en cola:', err);
        }
      }
    } catch (error) {
    console.error(`❌ Error al aplicar la respuesta de ${viewerId}:`, error);
    }

    if (type === "ice-candidate") {
      try {
        const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
        console.log("📦 Payload ICE recibido:", parsed); // Debug detallado

         // Manejo de candidato vacío (end-of-candidates)
        if (parsed.candidate === "") {
          console.log("✅ Fin de candidatos ICE");
          return;
        }

        // Validación estricta
        if (!parsed?.candidate) {
          console.warn("❗ Candidato ICE no válido (falta 'candidate'):", parsed);
          return;
        }

        // console.log("📦 Payload recibido para ICE:", parsed);

        // Validación mejorada del candidato ICE
        if (!parsed || (!parsed.candidate && parsed.candidate !== "")) {
          console.warn("❗ ICE candidate incompleto:", parsed);
          return;
        }

        // Crear y agregar el candidato ICE
        const iceCandidate = new RTCIceCandidate({
          candidate: parsed.candidate || "",
          sdpMid: parsed.sdpMid || null,
          sdpMLineIndex: parsed.sdpMLineIndex !== undefined ? 
            Number(parsed.sdpMLineIndex) : null
        });

        // Usar handleIncomingICECandidate o agregar directamente
        await handleIncomingICECandidate(pc, iceCandidate);

      } catch (error) {
        console.error(`Error agregando ICE candidate de ${viewerId}:`, error);
      }
    };
  };
    async function handleAnswer(viewerId, answer) {
      const key = `${viewerId}:${answer.sdp}`;
      // Evitar procesar el mismo answer dos veces
      if (appliedAnswers.has(key)) {
        console.log("⏩ Answer duplicado ignorado:", viewerId);
        return;
      }
      appliedAnswers.add(key);

    }
  });
};

export async function receivingStream(roomId, adminId, streamTarget) {

  if (ApprovedViewer !== undefined) {

    if (peerConnections[ApprovedViewer]) {
      peerConnections[ApprovedViewer].close();
      delete peerConnections[ApprovedViewer];
    };

    // const pc = new RTCPeerConnection(configuration);
    let approvedViewervPc = await getPeerConnection(ApprovedViewer);
    if (!approvedViewervPc) {
      approvedViewervPc = createPeerConnection(ApprovedViewer);
    }
    
    // let pc = createPeerConnection(viewerId);
    remoteStream = new MediaStream();

    // Prepara la conexión para recibir audio y video.
    approvedViewervPc.addTransceiver('video', { direction: 'sendrecv' });
    approvedViewervPc.addTransceiver('audio', { direction: 'sendrecv' });
    
      // 2. Mostrar el video remoto (stream del admin)
    approvedViewervPc.ontrack = async (event)  => {
      console.log("🎥 Track recibido:", event.track.kind);

      await event.streams[0].getTracks().forEach(track => {
        if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
        remoteStream.addTrack(track);
        }
      });
        
      if (streamTarget) {
        streamTarget.srcObject = remoteStream;
        console.log("📺 Stream remoto asignado al video con", remoteStream.getTracks().length, "tracks");
      }
    };

      // Manejar ICE candidates
    approvedViewervPc.onicecandidate = async (event) => {
      if (event.candidate) {
        // Enviar a cada viewer individualmente
          try {
              await sendSignal({
              room_id: roomId,  
              from_user: ApprovedViewer,  //De mi (viewer)
              to_user: adminId,     //Para el admin 
              type: "ice-candidate",
              payload: {
                candidate: event.candidate.candidate,        // ← Esto es crucial
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid
              },
            });

          } catch (error) {
              console.error(`Error enviando ICE candidate `, error);
          }
      }
    };

    // ✅ PASO 1: Inicializa una cola para los candidatos que lleguen temprano.
    // Track connection state
    let isSettingRemoteDescription = false;
    let isCreatingAnswer = false;
    let candidateQueue = [];

    //Escucha las ofertas enviadas por el viewer al admin
    listenToSignalsFromViewer(adminId, async ({ to_user, from_user, type, payload, room_id }) => {
      try {
        if (type === "offer") {
          if (isSettingRemoteDescription || isCreatingAnswer || approvedViewervPc.signalingState !== "stable") {
            console.warn('Ya se está procesando una oferta o no estamos en estado estable');
            return;
          }

          isSettingRemoteDescription = true;
          
          let offer;
          if (typeof payload === 'string') {
            try {
              offer = JSON.parse(payload);
            } catch (e) {
              console.error('Error parsing offer payload:', e);
              return;
            }
          } else {
            offer = payload;
          }

          if (approvedViewervPc.connectionState === "closed") {
            console.warn("⚠️ Intentando usar una peer connection cerrada.");
            return;
          }

          await approvedViewervPc.setRemoteDescription(new RTCSessionDescription(offer));

          console.log("Remote description set");

          // 2. Process queued candidates (with ufrag validation)
          await processCandidateQueue(approvedViewervPc, candidateQueue);

          // 3. Create and send answer
          isCreatingAnswer = true;

          const answer = await approvedViewervPc.createAnswer();
          console.log("Answer created:", answer.type);

          await approvedViewervPc.setLocalDescription(answer);
          console.log("Local description set");

          approvedViewervPc.onconnectionstatechange = () => {
            console.log("📡 Conexión state:", approvedViewervPc.connectionState);
            if (approvedViewervPc.connectionState === "disconnected" || approvedViewervPc.connectionState === "failed" || approvedViewervPc.connectionState === "closed") {
              console.warn("❌ Conexión cerrada, liberando recursos");
              approvedViewervPc.close();
              delete peerConnections[adminId];
            }
          };

          // Enviar respuesta al admin

          await sendSignal({
            room_id: room_id,
            from_user: to_user,  //o viewer
            to_user: from_user,   // o adminId
            type: "answer",
            payload: answer,
          });
          console.log("Answer sent to viewer");

        } 
        else if (type === "ice-candidate" && payload) {

          try {
              const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;

              // console.log("📦 Payload recibido para ICE:", parsed);

              // Validar que tenga las claves necesarias
              if (!parsed.candidate) {
                console.log("ICE end-of-candidates recibido");
                return;
              }

              if (
                !parsed.sdpMid ||
                parsed.sdpMLineIndex === undefined
              ) {
                console.warn("❗ ICE candidate incompleto:", parsed);
                return;
              }

              // Asegurar que sdpMLineIndex sea número (por si viene como string)
              parsed.sdpMLineIndex = Number(parsed.sdpMLineIndex);
              const candidate = new RTCIceCandidate(parsed);

              if (!approvedViewervPc || approvedViewervPc.connectionState === "closed") {
                console.warn("⚠️ Peer connection cerrada o no existe");
                return;
              }

              if (approvedViewervPc.remoteDescription) {
                await approvedViewervPc.addIceCandidate(candidate);
                console.log("✅ ICE candidate agregado");
              } else {
                candidateQueue.push(candidate);
                console.log("🕒 ICE candidate en cola (sin remoteDescription)");
              }

          } catch (error) {
            console.error("❌ Error procesando ICE:", error);
          }
        }

            // Return cleanup function
        return () => {
        unsubscribe();

        if (approvedViewervPc) {
          approvedViewervPc.close();
          approvedViewervPc = null;

        }
        remoteStream.getTracks().forEach(track => track.stop());
        }

      } 
      catch (error) {
        console.error('Error in signal handler:', error);
        // Reset flags on error
        isSettingRemoteDescription = false;
        isCreatingAnswer = false;
      } 
      finally {
            isSettingRemoteDescription = false;
            isCreatingAnswer = false;
      }
    });
  } else {
    console.log("No hay viewer aprobado para iniciar la conexión.");
    closePeerConnection(ApprovedViewer);
  }
};

export async function handleIncomingICECandidate(pc, candidate) {
  if (!pc.remoteDescription) {
    candidateQueue.push(candidate);
    console.log("🕒 Candidate en cola");
  } else {
    try {
      await pc.addIceCandidate(candidate);
      console.log("✅ Candidate agregado");
    } catch (err) {
      console.error("❌ Error agregando ICE:", err);
    }
  }
}

// Helper function to process queued candidates
export async function processCandidateQueue(pc, queue) {
  const processed = [];
  const errors = [];

  for (const candidate of queue) {
    try {
      await pc.addIceCandidate(candidate);
      processed.push(candidate);
      console.log('Processed queued ICE candidate');
    } catch (error) {
      if (error.toString().includes('ufrag')) {
        console.warn('Skipping queued candidate with ufrag mismatch');
      } else {
        errors.push(error);
      }
    }
  }

  // Clear processed candidates
  queue.splice(0, processed.length);

  if (errors.length > 0) {
    console.error('Errors processing some candidates:', errors);
  }
}


 