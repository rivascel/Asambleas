import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { UserContext } from "../../components/UserContext";
import { useNavigate } from 'react-router-dom';

const RegisterAdmin = ({ onRegister }) => {

    const [email, setEmail] = useState("");
    const [adminId, setAdminId] = useState("");
    const [message, setMessage] = useState("");
    const { login } = useContext(UserContext);
    const navigate = useNavigate();

    // useEffect(() => {
    //     window.location.href = "/admin/dashboard";
    //   }, []);

    const handleSendLink = async () => {
      try {
        onRegister?.(email); // si quieres avanzar al siguiente paso visual
        login(email);
        setAdminId(email); // Guardar el ID del admin
        document.cookie = `username=${email}; `;
        navigate("/admin/dashboard"); // ✅ sin recargar la página
        
      } catch (error) {
        console.error(error);
        setMessage("Hubo un error al enviar el enlace.");
      }
    };

    return (
        <>
        <div className="input-group">
            <label htmlFor="username">Escribe tu correo electrónico</label>
            <input  id="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
        </div>
        <div className="button-container">
            <button type="button" className="btn primary" id="login" onClick={handleSendLink}>
                Entrar al chat
            </button>
        </div>
        </>
    ); 
};

export default RegisterAdmin;


