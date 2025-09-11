import { createClient } from '@supabase/supabase-js';
import { CHAR_CARRIAGE_RETURN } from 'picomatch/lib/constants';

const SUPABASE_URL = 'https://hhmqduncjwddwptghsaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhobXFkdW5jandkZHdwdGdoc2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4ODQ0NTIsImV4cCI6MjA1NzQ2MDQ1Mn0.0IC33LEBv1O4QO9ctymNJu7nMjzXqk1P3Un9gf8WYds';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function registerViewer(roomId, viewerId ) {
  const { error } = await supabase.from("active_users").upsert([
    {
      user_id: viewerId,
      room_id: roomId,
      is_admin:false,
      created_at: new Date().toISOString(),
    },
  ]);
  if (error) console.error("Error registrando viewer:", error);
}

// Simulación para detectar viewers (desde tabla active_users)
export const getAllViewersAndListen = async (roomId, onNewViewer) => {
  const viewers = new Set(); // Usamos Set para evitar duplicados

  const { data: currentViewers, error} = await supabase
    .from("active_users")
    .select("*")
    .eq("room_id",roomId)
    .eq("is_admin",false)

     if (error) {
      console.error("Error obteniendo viewers:", error);
      throw error;
    }
    
    currentViewers?.forEach((viewer)=>{
      viewers.add(viewer.user_id)
      onNewViewer?.(viewer.user_id);
    });

    const channel = supabase
    .channel(`active_users_${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "active_users",
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        if (!payload.new.is_admin) {
          viewers.add(payload.new.user_id);
          onNewViewer?.(payload.new.user_id);
        }
      }
    )
    .subscribe((status)=>{
      console.log("Estado de suscripción:", status);
    });

  return {
    viewers: Array.from(viewers), // Convertimos a array para facilidad de uso
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
}
//=========================== send signal
export async function sendSignal({ room_id, from_user, to_user, type, payload }) {
  try {

    if (!from_user || !room_id) {
      throw new Error("from_user o roomId es requerido");
    }
    const { error } = await supabase.from("webrtc_signaling").insert([
      {
        room_id: room_id,
        from_user: from_user,
        to_user: to_user,
        type:type,
        payload: typeof payload === 'string' ? payload : JSON.stringify({
                          ...payload,
                          sdpMLineIndex: Number(payload.sdpMLineIndex) || 0
                        })
      },
    ]);

    if (error) { 
      console.error("❌ Error al insertar señal:", error);
    } else {
      console.log("✅ Señal enviada con éxito", from_user);
    }
  } catch (e){
    console.error("🧨 Excepción:", e);
  }
}

//===================================================
//El administrador escucha las señales de los viewers para emitir oferta
export const listenToSignals = async (userId, callback) => {

return supabase
    .channel(`Signals-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signaling',
        filter: `to_user=eq.${userId}`
      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe((status) => {
    console.log("Estado de suscripción:", status);
  });
};

//Los vieweres escuchan las señales del admin y envian la respuesta (answers)
export const listenToSignalsFromAdmin = async (userId, callback) => {
  // const responds = new Set(); // Usamos Set para evitar duplicados

  // const { data: currentResponds, error} = await supabase
  //   .from("webrtc_signaling")
  //   .select("*")
  //   .eq("from_user",userId)

  //   // console.log("currentResponds", currentResponds);

  //    if (error) {
  //     console.error("Error obteniendo responders:", error);
  //     throw error;
  //   }
    
  //   currentResponds?.forEach(({ from_user, to_user, type, payload, room_id })=>{
  //     const key = `${from_user} ${to_user}-${type}-${payload}-${room_id}`;

  //      if (!responds.has(key)) {
  //       responds.add(key);
  //       // callback?.(responds); // o desestructura si prefieres

  //     // const { to_user, from_user, payload: data } = respond.new;
  //     callback({ from_user, to_user, type, payload, room_id });
  //     };
  //   });

    if (!userId) {
      console.error("Usuario no definido aun"); 
      return;
    }


    const channel = supabase
    .channel(`Signals-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signaling',
        filter: `from_user=eq.${userId}`

      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe((status) => {
    console.log("Estado de suscripción:", status);

    return {
      removeChannel: () => supabase.removeChannel(channel)
    }
  });

  // return {
  //   responds : Array.from(responds),
  //   unsubscribe: () => {
  //     supabase.removeChannel(channel);
  //   }
  // };
};

//Los vieweres escuchan las señales del admin y envian la respuesta (answers)

export const listenToSignalsFromViewer = async (userId, callback) => {
  // const responds = new Set(); // Usamos Set para evitar duplicados

  // const { data: currentResponds, error} = await supabase
  //   .from("webrtc_signaling")
  //   .select("*")
  //   .eq("to_user",userId)

    // console.log("currentResponds", currentResponds);

    //  if (error) {
    //   console.error("Error obteniendo responders:", error);
    //   throw error;
    // }
    
    // currentResponds?.forEach(({ from_user, to_user, type, payload, room_id })=>{
    //   const key = `${from_user} ${to_user}-${type}-${payload}-${room_id}`;

    //    if (!responds.has(key)) {
    //     responds.add(key);
    //     // callback?.(responds); // o desestructura si prefieres

    //   // const { to_user, from_user, payload: data } = respond.new;
    //   callback({ from_user, to_user, type, payload, room_id });
    //   };
    // });

    if (!userId) {
      console.error("Usuario no definido aun"); 
      return;
    }

    const channel = supabase
    .channel(`Signals-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signaling',
        filter: `to_user=eq.${userId}`

      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe((status) => {
    console.log("Estado de suscripción:", status);

    return {
      removeChannel: () => supabase.removeChannel(channel)
    }

  });


  // return {
  //   responds : Array.from(responds),
  //   unsubscribe: () => {
  //     supabase.removeChannel(channel);
  //   }
  // };
};


//=================================

// Add these two new functions to your supabase-client.js file

/**
 * A viewer sends this request to an admin to initiate a video stream.
 */
export const sendJoinRequest = async (roomId, viewerId, adminId) => {
  const { error } = await supabase.from('webrtc_signaling').upsert([
    {
      room_id: roomId,
      from_user: viewerId, // The viewer's ID
      to_user: adminId,     // The admin's ID
      type: 'join',
      payload: { message: 'Requesting to join stream' }, // Payload can be simple
      created_at: new Date().toISOString()
    }
  ]);

  if (error) throw new Error('Error sending join request: ', error.message);
};

/**
 * An admin listens for new viewers joining the room.
 */

export async function registerAdminIsActive(roomId, adminId) {
  try {
    const { error } = await supabase.from('active_users').upsert([
      {
        user_id: adminId,
        room_id: roomId,
        is_admin: true,
        created_at: new Date().toISOString(),
      }
    ]);
    if (error) {console.error("Error registering admin as active:", error)}
    else {console.log("✅ Admin registrado como activo");};
  } catch (error) {
    console.error("❌ Excepción en registerAdminIsActive:", error);
  }  
}

export async function deleteAdmin(adminId) {
  const { error } = await supabase
    .from('active_users')
    .delete()
    .eq('user_id', adminId);
  if (error) {console.error("Error deleting admin:", error)}
  else {console.log("✅ Admin eliminado");};
}

export async function getActiveAdmin(roomId){
  const { data, error } = await supabase
    .from('active_users')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('is_admin', true)
    .single();

    // console.log("data", data);

    if (error) {
    console.error("❌ Error consultando admin activo:", error);
    return null;
    }
  return data?.user_id ?? null;
}

//==========================================

// export const listenForJoinRequests = (adminId, callback) => {
//   return supabase
//     .channel(`joins-for-admin-${adminId}`)
//     .on(
//       'postgres_changes',
//       {
//         event: 'INSERT',
//         schema: 'public',
//         table: 'webrtc_signaling',
//         filter: `to_user=eq.${adminId},type=eq.join` // Filter for 'join' messages to the admin
//       },
//       payload => callback(payload.new)
//     )
//     .subscribe();
// };

// export const offerToViewer = async (roomId, fromUser, toUser, offer) => {
//   const { error } = await supabase.from('webrtc_signaling').insert([
//     {
//       room_id: roomId,
//       from_user: fromUser,
//       to_user: toUser,
//       type: 'offer',
//       payload: offer,
//       created_at: new Date().toISOString()
//     }
//   ]);
  
//   if (error) throw new Error('Error sending offer: ' + error.message);
// };

// export const answerToAdmin = async (roomId, fromUser, toUser, answer) => {
//   const { error } = await supabase.from('webrtc_signaling').insert([
//     {
//       room_id: roomId,
//       from_user: fromUser,
//       to_user: toUser,
//       type: 'answer',
//       payload: answer,
//       created_at: new Date().toISOString()
//     }
//   ]);
  
//   if (error) throw new Error('Error sending answer: ' + error.message);
// };

// export const candidatesToViewer = async (roomId, fromUser, toUser, candidate) => {
//   if (!candidate) return;
  
//   const { error } = await supabase.from('webrtc_signaling').insert([
//     {
//       room_id: roomId,
//       from_user: fromUser,
//       to_user: toUser,
//       type: 'ice-candidate',
//       payload: candidate,
//       created_at: new Date().toISOString()
//     }
//   ]);
  
//   if (error) throw new Error('Error sending ICE candidate: ' + error.message);
// };

// export const candidatesToAdmin = async (roomId, viewer, adminId, candidate) => {
//   if (!candidate) return;
  
//   const { error } = await supabase.from('webrtc_signaling').insert([
//     {
//       room_id: roomId,
//       from_user: viewer,
//       to_user: adminId,
//       type: 'ice-candidate',
//       payload: candidate,
//       created_at: new Date().toISOString()
//     }
//   ]);
  
//   if (error) throw new Error('Error sending ICE candidate: ' + error.message);
// };


// export const listenForIceCandidates = (userId, callback) => {
//   return supabase
//     .channel(`ice-${userId}`)
//     .on(
//       'postgres_changes',
//       {
//         event: 'INSERT',
//         schema: 'public',
//         table: 'webrtc_signaling',
//         filter: `to_user=eq.${userId},type=eq.ice-candidate`
//       },
//       payload => callback(payload.new)
//     )
//     .subscribe();
// };

