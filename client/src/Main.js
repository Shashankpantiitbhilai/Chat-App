import React from "react";

import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Register from "./components/Auth/Register.jsx";
import ProtectedUser from "./ProtectedUser.js";
import Dashboard from "./components/chatPanel/Home.jsx";
import Login from "./components/Auth/Login.jsx";
const Main = () => {
    return (
        <Routes>

            <Route path="/" element={
                <ProtectedUser>
                    <Dashboard />
                </ProtectedUser>
            }/>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default Main;