import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [email, setEmail] = useState("");
  const [users, setUsers] = useState([]); // NUEVO
  const [adminId, setAdminId] = useState(""); // NUEVO
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ownerData, setOwnerData] = useState(null); // NUEVO
  const [quorum, setQuorum] = useState(null);
  const [votingEnabled, setVotingEnabled] = useState(false); 
  const [decisionText, setDecisionText] = useState("Propuesta de ejemplo para ser votada.");
  const [approvalVotes, setApprovalVotes] = useState(0);
  const [rejectVotes, setRejectVotes] = useState(0);
  const [blankVotes, setBlankVotes] = useState(0);    
  const [checkApprove, setCheckApprove] = useState(null);

    // ✅ Recuperar datos guardados al inicio
  useEffect(() => {
    const savedData = localStorage.getItem("ownerInfo");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setEmail(parsed.email);
      setOwnerData(parsed.ownerData);
      setQuorum(parsed.quorum || null);
      setIsAuthenticated(true);
    }
  }, []);

  const login = (email, data) => {
    setEmail(email);
    setIsAuthenticated(true);
    setOwnerData(data);

     localStorage.setItem(
      "ownerInfo",
      JSON.stringify({ email, ownerData: data, quorum }) // quorum puede agregarse después
    );
  };

  const logout = () => {
    setEmail("");
    setIsAuthenticated(false);
    setOwnerData(null);
    setQuorum(null);
    localStorage.removeItem("ownerInfo");
  };
  return (
    <UserContext.Provider value={
      { 
        isAuthenticated,
        setIsAuthenticated,
        email,
        setEmail,
        login,
        logout,
        ownerData,
        quorum,
        setQuorum,
        votingEnabled, 
        setVotingEnabled,
        decisionText,
        setDecisionText,
        approvalVotes,
        rejectVotes,
        blankVotes,
        setApprovalVotes,
        setRejectVotes,
        setBlankVotes,
        setAdminId,
        checkApprove,
        setCheckApprove

       }}>
      {children}
    </UserContext.Provider>


  );
};

export default UserProvider;
