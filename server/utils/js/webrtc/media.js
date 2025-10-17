// media.js

let localStream = null;

export async function openUserMedia(peerConnection, videoElementId /*= 'localVideo'*/) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        // Mostrar en el video local
        const videoEl = document.getElementById(videoElementId);
        if (videoEl) videoEl.srcObject = localStream;

        // Agregar los tracks al peerConnection
        if (peerConnection && localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
        return localStream;
        
    } catch (error) {
        console.error("Error al acceder a la cámara/micrófono:", error);
        throw error;
    }
}

export function hangUp(peerConnection, videoElementId = 'localVideo') {
    const videoEl = document.getElementById(videoElementId);
    
    // Detener y liberar el stream local
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Detener el video
    if (videoEl) {
        videoEl.srcObject = null;
    }

    // Cerrar la conexión
    if (peerConnection) {
        peerConnection.getSenders().forEach(sender => sender.track?.stop());
        peerConnection.close();
    }
}
