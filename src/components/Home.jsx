import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Link } from 'react-router-dom';

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
    const [nuevoReporteCoords, setNuevoReporteCoords] = useState(null);
    const [tipo, setTipo] = useState('Choque');
    const [descripcion, setDescripcion] = useState('');

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
    };

    const startSelectingLocation = () => {
        setShowModal(false); 
        setIsSelectingLocation(true); 
    };

    const obtenerNombreUbicacion = async (lat, lng) => {
        try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address,poi`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.features && data.features.length > 0) {
                return data.features[0].place_name;
            } else {
                return "Ubicación sin nombre";
            }
        } catch (error) {
            console.error("Error obteniendo dirección:", error);
            return "Error al obtener ubicación";
        }
    };

    const handleMapClick = async (latlng) => {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nuevoReporteCoords) return alert("Debes seleccionar una ubicación");

        const payload = {
            type: tipo,
            description: descripcion,
            address: direccion,
            latitude: nuevoReporteCoords.lat,
            longitude: nuevoReporteCoords.lng,
            userId: usuario._id
        };

        try {
            let res;
            if (editingId) {
                res = await fetch(`http://localhost:3000/reports/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('http://localhost:3000/reports/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                alert(editingId ? '¡Reporte actualizado!' : '¡Reporte enviado!');
                handleCloseModal(); 
                fetchReportes();    
            } else {
                alert('Error al guardar');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleStartEdit = (reporte) => {
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

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <nav className="navbar navbar-dark bg-primary px-3 shadow" style={{ zIndex: 1000 }}>
                <span className="navbar-brand fw-bold">City Watch</span>

                <div className='d-flex align-items-center gap-2'>
                    {!isSelectingLocation && (
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
                {isSelectingLocation && (
                    <div className="alert alert-info position-absolute top-0 start-50 translate-middle-x mt-3 shadow fw-bold text-center" style={{ zIndex: 1001 }}>
                        📍 Haz clic en el mapa para ubicar el incidente
                        <br />
                        <button className='btn btn-sm btn-secondary mt-1' onClick={() => { setIsSelectingLocation(false); setShowModal(true); }}>Cancelar</button>
                    </div>
                )}

                <MapContainer center={[21.15226, -101.71132]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${token}`}
                        attribution='Mapbox'
                        tileSize={512}
                        zoomOffset={-1}
                    />

                    <MapClickHandler onClick={handleMapClick} />

                    {popupInfo && (
                        <Popup
                            position={popupInfo.latlng}
                            onClose={() => setPopupInfo(null)} // Se limpia al cerrar
                        >
                            <div className="text-center">
                                <small className="text-muted fw-bold">Ubicación</small>
                                <br />
                                <span>{popupInfo.address}</span>
                            </div>
                        </Popup>
                    )}

                    {Array.isArray(reportes) && reportes.map((rep) => (
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
                    ))}

                    {nuevoReporteCoords && (
                        <Marker position={nuevoReporteCoords} opacity={0.8}>
                            <Popup>
                                <strong>Ubicación seleccionada:</strong> <br />
                                {direccion || "Cargando..."}
                            </Popup>
                        </Marker>
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
                                                {nuevoReporteCoords ? (
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
                                                )}
                                            </div>

                                            <div className="modal-footer px-0 pb-0">
                                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancelar</button>
                                                <button type="submit" className="btn btn-primary" disabled={!nuevoReporteCoords}>
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