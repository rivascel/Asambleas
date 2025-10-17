import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { UserContext } from "../../components/UserContext";

const socket5 = io("https://localhost:3000", {
  withCredentials: true,
});

const AttendeesList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState(null);
  const [isApproved, setIsApproved] = useState(null);
  const [check, setCheck] = useState(false);

  useEffect( ()=>{
    const fetchUsers = async () =>  {
      try {
        const [pendingRes, approvedRes] = await Promise.all([
          fetch("https://localhost:3000/api/recover-users", { 
              method: 'POST',
              headers: { 'Content-Type':'application/json' },
              body: JSON.stringify({ roomId: "main-room" }),
            }),
          fetch("https://localhost:3000/api/searched-users-approved", { 
              method: 'POST',
              headers: { 'Content-Type':'application/json' },
              body: JSON.stringify({ roomId: "main-room" }),
            })
        ]);

        if (!pendingRes.ok || !approvedRes.ok) {
          throw new Error("Error al cargar los usuarios");
        }

        const pendingUsers = await pendingRes.json();
        const approvedUsers = await approvedRes.json();
        console.log("pending, approved", pendingUsers, approvedUsers);

        setPendingUsers(pendingUsers.pendingUsers || pendingUsers || []);
        setIsApproved(approvedUsers.approvedUsers || approvedUsers || []);

      } catch (error) {
        console.error("Error cargando usuarios:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  },[]);

  const handleApprove = async (userId) => {

    socket5.emit("approve", userId);
    try {
          const response = await fetch("https://localhost:3000/api/approved-users",
            { 
                method: 'POST',
                headers: { 'Content-type':'application/json' },
                body: JSON.stringify({ roomId: "main-room" , userId: userId }),
            });

            setPendingUsers(prev => prev.filter(user => user.user_id !== userId));
            setIsApproved(prev => [...prev, userId]);

          // if (!error) {
          // setUsers(prev => 
          //   prev.map(u => 
          //     u.user_id === userId ? { ...u, status: 'approved' } : u));
          // }
    } catch (err) {
    console.error(err);
    console.log("Error al enviar la solicitud.");
    }
  }

  const handleCancel = async (email) => {
    try {
        await fetch("https://localhost:3000/api/cancel-users",
          { 
              method: 'POST',
              headers: { 'Content-type':'application/json' },
              body: JSON.stringify({ userId: email }),
          });

          // Actualiza los estados localmente
          setIsApproved(prev => prev.filter(id => id !== email));
          // setPendingUsers(prev => [...prev, { user_id: email }]);
              
        // if (!error) {
        // setUsers(prev => 
        //   prev.map(u => 
        //     u.user_id === email ? { ...u, status: 'cancel' } : u));
        // }
    } catch (err) {
    console.error(err);
    console.log("Error al enviar la solicitud.");
    }
  }

  return (
    <div className="bg-white p-4 rounded shadow-md text-center">
      <p className="text-green-600 font-medium">Solicitudes recibidas</p>

      {loading ? (
          <p> Cargando </p>
        ) : (
              <>
                <h2 className="text-lg font-bold">Usuarios pendientes</h2>
                
                  {pendingUsers.length > 0 ? (
                    pendingUsers.map(user => (
                      <div key={user.user_id} className="mb-2 p-2 border rounded">
                        <p>{user.user_id} </p>
                        <button
                          onClick={()=>handleApprove(user.user_id)}
                          className="bg-blue-500 text-red px-3 py-1 rounded hover:bg-blue-600"
                        >
                          Aprobar
                        </button>
                      </div>
                      ))
                      ) : (
                          <p>No hay usuarios pendientes</p>
                    )
                  } 
                  
                <h2 className="text-lg font-bold mt-4">Usuarios aprobados</h2>
                  {isApproved.length > 0 ? (
                    isApproved.map((email, index) => (
                        <div key={`approved-${ index }`} className="mb-2 p-2 border rounded">
                          <p>{email} </p>
                          <button
                            onClick={()=>handleCancel(email)}
                            className="bg-blue-500 text-red px-3 py-1 rounded hover:bg-blue-600"
                          >
                            Cancelar aprobacion
                          </button>
                        </div>
                    )) 
                  ) : ( <p>No hay usuarios pendientes</p>
                )}
              </>
            )
    }
    </div>
  );
};

export default AttendeesList;

       