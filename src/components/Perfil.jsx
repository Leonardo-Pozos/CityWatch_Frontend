import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Perfil = ({ usuario }) => {
    const [misReportes, setMisReportes] = useState([]);

    // Función para formatear la fecha
    const formatearFecha = (timestamp) => {
        if (!timestamp) return 'Fecha desconocida';
        return new Date(timestamp).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    useEffect(() => {
        const fetchMisReportes = async () => {
            try {
                // Se obtiene la lista completa de reportes
                const res = await fetch('http://localhost:3000/reports');
                const data = await res.json();

                if (res.ok && usuario) {
                    // Se filtra por reportes donde el 'user' (objeto o ID) coincida con el usuario logueado
                    const mis = data.filter(r => r.user?._id === usuario._id || r.userId === usuario._id || r.user === usuario._id);
                    setMisReportes(mis);
                }
            } catch (error) {
                console.error("Error al cargar los reportes del perfil:", error);
            }
        };

        if (usuario && usuario._id) fetchMisReportes();
    }, [usuario]);

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Mi Perfil</h1>
                <Link to="/">
                    <button className="btn btn-outline-primary">⬅ Volver al Mapa</button>
                </Link>
            </div>
            <div className="card mb-4 shadow-sm border-0">
                <div className="card-body d-flex align-items-center gap-3">
                    <div className="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center" style={{width: '60px', height: '60px', fontSize: '24px'}}>
                        {usuario?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="mb-0">{usuario?.name} {usuario?.lastName}</h4>
                        <p className="text-muted mb-0">{usuario?.email}</p>
                    </div>
                </div>
            </div>

            {/* Lista de Reportes */}
            <h3 className="mb-3">Mis Reportes Generados ({misReportes.length})</h3>
            
            {misReportes.length === 0 ? (
                <div className="alert alert-info">Aún no has generado ningún reporte.</div>
            ) : (
                <div className="row">
                    {misReportes.map((rep) => (
                        <div key={rep._id} className="col-md-6 mb-3">
                            <div className="card h-100 shadow-sm">
                                <div className="card-header d-flex justify-content-between align-items-center bg-white">
                                    <span className="badge bg-primary">{rep.type}</span>
                                    <small className="text-muted">{formatearFecha(rep.createdAt)}</small>
                                </div>
                                <div className="card-body">
                                    <p className="card-text">{rep.description}</p>
                                    <small className="text-muted d-block mb-1">
                                        📍 Dirección: {rep.address}
                                    </small>
                                    <small className="text-muted">
                                        🗺️ Coords: {rep.location.coordinates[1].toFixed(4)}, {rep.location.coordinates[0].toFixed(4)}
                                    </small>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Perfil;