import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Link } from 'react-router-dom';
import TablaReportes from './TablaReportes'; // Componente importado

const token = import.meta.env.VITE_MAPBOX_TOKEN;
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const Home = ({ usuario, onLogout }) => {
    const [reportes, setReportes] = useState([]);
    const [showMenu, setShowMenu] = useState(false);
    const [direccion, setDireccion] = useState('');
    const [popupInfo, setPopupInfo] = useState(null);
    const [showModal, setShowModal] = useState(false); 
    const [isSelectingLocation, setIsSelectingLocation] = useState(false); 
    const [editingId, setEditingId] = useState(null); 
    const [nuevoReporteCoords, setNuevoReporteCoords] = useState(null); // Para Point
    const [tipo, setTipo] = useState('Choque');
    const [descripcion, setDescripcion] = useState('');
    const [showTable, setShowTable] = useState(false); // Estado para la tabla

    // Estados para Polígono
    const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
    const [polygonCoords, setPolygonCoords] = useState([]); // Array de {lat, lng}

    useEffect(() => {
        fetchReportes();
    }, []);

    const fetchReportes = async () => {
        try {
            const res = await fetch('http://localhost:3000/reports/');
            if (res.ok) {
                const data = await res.json();
                setReportes(data);
            }
        } catch (error) {
            console.error("Error cargando reportes:", error);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setNuevoReporteCoords(null);
        setPopupInfo(null);
        setEditingId(null); 
        setTipo('Choque');  
        setDescripcion('');
        setIsDrawingPolygon(false); // Asegurar que el modo de dibujo se apague
        setIsSelectingLocation(false); // Asegurar que el modo de selección se apague
        setPolygonCoords([]);
    };

    const MapClickHandler = ({ onClick }) => {
        useMapEvents({
            click(e) {
                onClick(e.latlng);
            },
        });
        return null;
    };

    const handleOpenModal = () => {
        setNuevoReporteCoords(null);
        setTipo('Choque');
        setDescripcion('');
        setShowModal(true);
        setIsDrawingPolygon(false);
        setPolygonCoords([]);
    };
    
    // Inicia selección de un punto (Point)
    const startSelectingLocation = () => {
        setShowModal(false); 
        setIsSelectingLocation(true); 
        setIsDrawingPolygon(false); // Desactivar el modo Polígono
    };

    // Inicia dibujo de un polígono
    const startDrawingPolygon = () => {
        setShowModal(false);
        setIsSelectingLocation(false); // Desactivar el modo Point
        setIsDrawingPolygon(true);
        setPolygonCoords([]); 
    };
    
    // Finaliza el dibujo del polígono y abre el modal
    const finishPolygon = async () => {
        if (polygonCoords.length < 3) {
            alert("Un polígono debe tener al menos 3 puntos. Intenta de nuevo.");
            setIsDrawingPolygon(false);
            setPolygonCoords([]);
            setShowModal(true); 
            return;
        }

        // Usar la dirección del primer punto como referencia
        setDireccion("Buscando dirección...");
        const primerPunto = polygonCoords[0];
        const nombre = await obtenerNombreUbicacion(primerPunto.lat, primerPunto.lng);
        setDireccion(nombre);

        setIsDrawingPolygon(false); 
        setTipo('Polígono'); 
        setShowModal(true); 
    }

    const obtenerNombreUbicacion = async (lat, lng) => {
        try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address,poi`;
            const res = await fetch(url);
            const data = await res.json();
            return (data.features && data.features.length > 0) ? data.features[0].place_name : "Ubicación sin nombre";
        } catch (error) {
            console.error("Error obteniendo dirección:", error);
            return "Error al obtener ubicación";
        }
    };

    const handleMapClick = async (latlng) => {
        if (isDrawingPolygon) {
            setPolygonCoords(prev => [...prev, latlng]);
            return; 
        }

        if (isSelectingLocation) {
            setPopupInfo(null);
            setNuevoReporteCoords(latlng);
            setDireccion("Buscando dirección...");
            setIsSelectingLocation(false);

            const nombre = await obtenerNombreUbicacion(latlng.lat, latlng.lng);
            setDireccion(nombre);
            setShowModal(true);
        }else {
            if (!showModal) {
                setPopupInfo({ latlng, address: "Cargando dirección..." });
                const nombre = await obtenerNombreUbicacion(latlng.lat, latlng.lng);
                setPopupInfo({ latlng, address: nombre });
            }
        }
    };

    // Transforma Leaflet {lat, lng} a GeoJSON [lng, lat]
    const mapCoordsToGeoJSON = (coords, type) => {
        if (type !== 'Polígono') {
            // Point: [lng, lat]
            return [coords.lng, coords.lat]; 
        } 
        
        // Polygon: [[[lng, lat], ...]]
        if (!coords || coords.length < 3) {
            return []; // Retorna vacío si es inválido
        }
        
        const ring = coords.map(p => [p.lng, p.lat]);
        
        // --- Cierre obligatorio del anillo ---
        const first = ring[0];
        const last = ring[ring.length - 1];

        if (first[0] !== last[0] || first[1] !== last[1]) {
            ring.push(first);
        }
        
        // Verifica que el anillo cerrado tenga al menos 4 puntos
        if (ring.length < 4) {
            return []; // Sigue siendo inválido si no tiene 4 puntos
        }

        return [ring]; // Envuelto en el array requerido para Polígono
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let reportLocation = null;
        let geoJsonType = '';

        if (tipo !== 'Polígono' && !nuevoReporteCoords) {
             alert("Debes seleccionar una ubicación de tipo Point.");
             return;
        }
        
        if (tipo === 'Polígono') {
            if (polygonCoords.length < 3) {
                 alert("Debes dibujar un polígono de al menos 3 puntos.");
                 return;
            }
            
            reportLocation = mapCoordsToGeoJSON(polygonCoords, 'Polígono');
            geoJsonType = 'Polygon';
            
            // --- VERIFICACIÓN DE SEGURIDAD FINAL ---
            // Un polígono válido debe ser un array con un anillo, y ese anillo debe tener >= 4 pares de coordenadas (cerrado).
            if (!Array.isArray(reportLocation) || reportLocation.length === 0 || reportLocation[0].length < 4) {
                alert("Error de coordenadas: El polígono no se cerró correctamente (mínimo 3 puntos + cierre). Vuelve a dibujar.");
                console.error("Coordenadas de Polígono inválidas:", reportLocation);
                return;
            }
            // ----------------------------------------------------
        } else {
            reportLocation = mapCoordsToGeoJSON(nuevoReporteCoords, 'Point');
            geoJsonType = 'Point';
        }


        const payload = {
            type: tipo,
            description: descripcion,
            address: direccion,
            location: {
                type: geoJsonType,
                coordinates: reportLocation
            },
            // Se asume que el backend obtiene el userId de la sesión o del cuerpo. 
            user: usuario._id 
        };

        // --- DEBUG: Ver el payload antes de enviar ---
        console.log("Payload enviado al servidor:", payload);
        // --- DEBUG CRÍTICO: Verificar la estructura de coordenadas del polígono
        if (geoJsonType === 'Polygon') {
             console.log("Coordenadas Polígono (Estructura final):", JSON.stringify(payload.location.coordinates));
        }

        try {
            let res;
            if (editingId && geoJsonType === 'Point') {
                res = await fetch(`http://localhost:3000/reports/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else if (!editingId) {
                res = await fetch('http://localhost:3000/reports/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                 alert("La edición de reportes de Polígono no está permitida.");
                 return;
            }

            if (res.ok) {
                alert(editingId ? '¡Reporte actualizado!' : '¡Reporte enviado!');
                handleCloseModal(); 
                fetchReportes();    
            } else {
                // Manejo de errores que reportaste
                let errorMessage = res.statusText;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.message || errorData.error || res.statusText;
                    console.error("Backend Error Detail:", errorData);
                } catch (e) {
                    console.error("Failed to parse backend error response:", e);
                }
                alert(`Error al guardar o actualizar el reporte. Detalle: ${errorMessage}`);
            }
        } catch (error) {
            console.error("Error de red al enviar reporte:", error);
            alert(`Error de conexión: ${error.message}`);
        }
    };

    const handleStartEdit = (reporte) => {
        // Solo permitir edición para Point
        if (reporte.location.type !== 'Point') {
            alert("Solo se permite editar reportes de tipo Punto.");
            return;
        }

        setTipo(reporte.type);
        setDescripcion(reporte.description);
        setDireccion(reporte.address);
        setEditingId(reporte._id);
        const coords = {
            lat: reporte.location.coordinates[1],
            lng: reporte.location.coordinates[0]
        };
        setNuevoReporteCoords(coords);
        setShowModal(true);
    };

    // Función auxiliar para obtener coordenadas de polígono en formato Leaflet [lat, lng]
    const getLeafletPolygonCoords = (reporte) => {
        // Coordenadas GeoJSON para Polygon son [[[lng, lat], ...]]
        const ring = reporte.location.coordinates[0];
        // Convertir [lng, lat] a [lat, lng]
        return ring.map(coord => [coord[1], coord[0]]);
    }

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <nav className="navbar navbar-dark bg-primary px-3 shadow" style={{ zIndex: 1000 }}>
                <span className="navbar-brand fw-bold">City Watch</span>

                <div className='d-flex align-items-center gap-2'>
                    {/* Botón para mostrar/ocultar la tabla */}
                    <button 
                        className={`btn ${showTable ? 'btn-warning text-dark' : 'btn-light text-primary'} fw-bold shadow-sm me-2`} 
                        onClick={() => setShowTable(!showTable)}
                        title="Ver listado de reportes"
                    >
                        {showTable ? 'Ver Mapa' : 'Ver Reportes'} 📋
                    </button>
                    
                    {!isSelectingLocation && !isDrawingPolygon && !showTable && (
                        <button className='btn btn-light text-primary fw-bold shadow-sm me-2' onClick={handleOpenModal}>
                            + Reportar
                        </button>
                    )}
                    <div className="position-relative">
                        <button
                            className="btn btn-outline-light border-0"
                            onClick={() => setShowMenu(!showMenu)}
                            title="Menú"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                                <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" />
                            </svg>
                        </button>

                        {showMenu && (
                            <div className="dropdown-menu show position-absolute end-0 mt-2 shadow-lg" style={{ minWidth: '200px' }}>
                                <div className="px-3 py-2 border-bottom bg-light">
                                    <small className="text-muted d-block">Usuario</small>
                                    <strong>{usuario?.name}</strong>
                                </div>

                                <Link to="/perfil" className="dropdown-item py-2">
                                    👤 Mi Perfil / Mis Reportes
                                </Link>

                                <div className="dropdown-divider"></div>

                                <button
                                    className="dropdown-item text-danger py-2"
                                    onClick={() => { setShowMenu(false); onLogout(); }}
                                >
                                    🚪 Cerrar Sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <div style={{ flex: 1, position: 'relative' }}>
                
                {/* Overlay y Contenedor para TablaReportes - Ajustado para centrar y dimensionar */}
                {showTable && (
                    <div className="position-absolute w-100 h-100 bg-dark bg-opacity-75 d-flex justify-content-center align-items-center" style={{ zIndex: 1050 }}>
                        {/* Contenedor central con ancho máximo y altura responsive */}
                        <div className="bg-white rounded shadow-2xl p-0 w-11/12 h-5/6 md:w-3/4 lg:w-4/5" style={{maxWidth: '1200px'}}>
                            <TablaReportes 
                                reportes={reportes} 
                                usuarioId={usuario._id} 
                                onEdit={handleStartEdit} 
                                onRefresh={fetchReportes}
                                onClose={() => setShowTable(false)} // Función para cerrar la tabla
                            />
                        </div>
                    </div>
                )}
                
                {isSelectingLocation && (
                    <div className="alert alert-info position-absolute top-0 start-50 translate-middle-x mt-3 shadow fw-bold text-center" style={{ zIndex: 1001 }}>
                        📍 Haz clic en el mapa para ubicar el incidente
                        <br />
                        <button className='btn btn-sm btn-secondary mt-1' onClick={() => { setIsSelectingLocation(false); setShowModal(true); }}>Cancelar</button>
                    </div>
                )}
                
                {isDrawingPolygon && (
                    <div className="alert alert-warning position-absolute top-0 start-50 translate-middle-x mt-3 shadow fw-bold text-center" style={{ zIndex: 1001 }}>
                        📐 Haz clic para añadir puntos. Puntos: **{polygonCoords.length}**
                        <br />
                        {polygonCoords.length >= 3 && (
                            <button className='btn btn-sm btn-success mt-1 me-2' onClick={finishPolygon}>Finalizar Polígono</button>
                        )}
                        <button className='btn btn-sm btn-secondary mt-1' onClick={handleCloseModal}>Cancelar</button>
                    </div>
                )}


                <MapContainer center={[21.15226, -101.71132]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${token}`}
                        attribution='Mapbox'
                        tileSize={512}
                        zoomOffset={-1}
                    />

                    {/* Solo activar el click si no estamos en la tabla */}
                    {!showTable && <MapClickHandler onClick={handleMapClick} />} 

                    {popupInfo && (
                        <Popup
                            position={popupInfo.latlng}
                            onClose={() => setPopupInfo(null)} 
                        >
                            <div className="text-center">
                                <small className="text-muted fw-bold">Ubicación</small>
                                <br />
                                <span>{popupInfo.address}</span>
                            </div>
                        </Popup>
                    )}

                    {/* Dibujar reportes (Points y Polygons) */}
                    {Array.isArray(reportes) && reportes.map((rep) => (
                        rep.location.type === 'Point' ? (
                            <Marker key={rep._id} position={[rep.location.coordinates[1], rep.location.coordinates[0]]}>
                                <Popup>
                                    <strong>{rep.type}</strong> <br />
                                    {rep.description} <br />
                                    <small className="text-muted">📍 {rep.address}</small>
                                    {(rep.user?._id === usuario._id || rep.user === usuario._id) && (
                                        <div className="mt-2 border-top pt-2 text-center">
                                            <button
                                                className="btn btn-sm btn-outline-primary py-0"
                                                onClick={() => handleStartEdit(rep)}
                                            >
                                                ✏️ Editar
                                            </button>
                                        </div>
                                    )}
                                </Popup>
                            </Marker>
                        ) : (
                             <Polygon 
                                key={rep._id} 
                                positions={getLeafletPolygonCoords(rep)} 
                                color="purple" 
                                weight={3} 
                                opacity={0.7}
                            >
                                <Popup>
                                    <strong>{rep.type}</strong> <br />
                                    {rep.description} <br />
                                    <small className="text-muted">📍 {rep.address}</small>
                                </Popup>
                            </Polygon>
                        )
                    ))}

                    {/* Dibujar marcador temporal para Point o polígono temporal para Polygon */}
                    {nuevoReporteCoords && !isDrawingPolygon && (
                        <Marker position={nuevoReporteCoords} opacity={0.8}>
                            <Popup>
                                <strong>Ubicación seleccionada:</strong> <br />
                                {direccion || "Cargando..."}
                            </Popup>
                        </Marker>
                    )}
                    
                    {polygonCoords.length > 0 && isDrawingPolygon && (
                        <Polygon positions={polygonCoords} color="orange" weight={3} opacity={0.6} />
                    )}
                    
                </MapContainer>

                {showModal && (
                    <>
                        <div className="modal-backdrop show" style={{ opacity: 0.5 }}></div>
                        <div className="modal show d-block" tabIndex="-1">
                            <div className="modal-dialog modal-dialog-centered">
                                <div className="modal-content shadow-lg">
                                    <div className="modal-header bg-primary text-white">
                                        <h5 className="modal-title">
                                            {editingId ? 'Editar Reporte' : 'Nuevo Reporte'}
                                        </h5>
                                        <button type="button" className="btn-close btn-close-white" onClick={handleCloseModal}></button>
                                    </div>
                                    <div className="modal-body">
                                        <form onSubmit={handleSubmit}>
                                            <div className="mb-3">
                                                <label className="form-label fw-bold">Tipo de Incidente</label>
                                                <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                                                    <option value="Choque">Choque 💥</option>
                                                    <option value="Tráfico">Tráfico 🚗</option>
                                                    <option value="Obra">Obras 🚧</option>
                                                    <option value="Manifestación">Manifestación 📢</option>
                                                    <option value="Bache">Bache 🕳️</option>
                                                    <option value="Polígono">Polígono 📐</option>
                                                </select>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label fw-bold">Descripción</label>
                                                <textarea
                                                    className="form-control"
                                                    rows="3"
                                                    value={descripcion}
                                                    onChange={(e) => setDescripcion(e.target.value)}
                                                    placeholder="Detalla lo sucedido..."
                                                ></textarea>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label fw-bold">Ubicación</label>
                                                
                                                {tipo === 'Polígono' ? (
                                                    <div className="p-2 border rounded bg-light">
                                                        <div className="d-flex align-items-center justify-content-between mb-1">
                                                            <small className={`fw-bold ${polygonCoords.length > 0 ? 'text-success' : 'text-danger'}`}>
                                                                {polygonCoords.length > 0 ? `✅ ${polygonCoords.length} Puntos Seleccionados` : '❌ Polígono no definido'}
                                                            </small>
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-outline-primary w-100 py-2" 
                                                            onClick={startDrawingPolygon}
                                                        >
                                                            📐 Dibujar Polígono en el mapa
                                                        </button>
                                                         {polygonCoords.length > 0 && (
                                                            <small className="text-muted d-block text-truncate mt-1">
                                                                📍 Dirección de referencia: {direccion}
                                                            </small>
                                                         )}
                                                    </div>

                                                ) : (
                                                    nuevoReporteCoords ? (
                                                        <div className="p-2 border rounded bg-light">
                                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                                <small className="text-success fw-bold">✅ Coordenadas listas</small>
                                                                <button type="button" className="btn btn-sm btn-link text-decoration-none" onClick={startSelectingLocation}>Cambiar</button>
                                                            </div>
                                                            <small className="text-muted d-block text-truncate">
                                                                📍 {direccion}
                                                            </small>
                                                        </div>
                                                    ) : (
                                                        <button type="button" className="btn btn-outline-primary w-100 py-2" onClick={startSelectingLocation}>
                                                            📍 Seleccionar en el mapa
                                                        </button>
                                                    )
                                                )}
                                            </div>

                                            <div className="modal-footer px-0 pb-0">
                                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancelar</button>
                                                <button 
                                                    type="submit" 
                                                    className="btn btn-primary" 
                                                    disabled={
                                                        editingId && tipo === 'Polígono' // No permitir edición de polígono
                                                        || (tipo !== 'Polígono' && !nuevoReporteCoords) 
                                                        || (tipo === 'Polígono' && polygonCoords.length < 3)
                                                    }
                                                >
                                                    {editingId ? 'Actualizar Cambios' : 'Guardar Reporte'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Home;