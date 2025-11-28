import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from "../components/Login";
import Home from "../components/Home";
import RegistroDeCuenta from "../components/RegistroDeCuenta";

function AppRouter() {
    const [usuario, setUsuario] = useState('')

    useEffect(() => {
        const usuarioLogueado = localStorage.getItem('usuario');
        if (usuarioLogueado) {
            setUsuario(JSON.parse(usuarioLogueado))
        }
    }, []);

    useEffect(() => {
        if (usuario) {
            localStorage.setItem('usuario', JSON.stringify(usuario));
        } else {
            localStorage.removeItem('usuario')
        }
    }, [usuario]);

    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={
                        usuario ? <Navigate to="/" /> : <Login onLogin={setUsuario} />
                    } />
                <Route
                    path="/"
                    element={
                        usuario ? <Home usuario={usuario} onLogout={() => setUsuario(null)} /> : <Navigate to="/login" />
                    } />
                <Route
                    path="/register"
                    element={
                        <RegistroDeCuenta onRegister={setUsuario} />
                    } />
            </Routes>
        </Router>
    )
}

export default AppRouter