import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Link } from 'react-router-dom';
import TablaReportes from './TablaReportes';

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
    const [showTable, setShowTable] = useState(false);

    const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
    const [polygonCoords, setPolygonCoords] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [filterTipo, setFilterTipo] = useState('');

    const mapRef = useRef();

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
        setIsDrawingPolygon(false);
        setIsSelectingLocation(false);
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

    const startSelectingLocation = () => {
        setShowModal(false);
        setIsSelectingLocation(true);
        setIsDrawingPolygon(false);
    };

    const startDrawingPolygon = () => {
        setShowModal(false);
        setIsSelectingLocation(false);
        setIsDrawingPolygon(true);
        setPolygonCoords([]);
    };

    const finishPolygon = async () => {
        if (polygonCoords.length < 3) {
            alert("Un polígono debe tener al menos 3 puntos. Intenta de nuevo.");
            setIsDrawingPolygon(false);
            setPolygonCoords([]);
            setShowModal(true);
            return;
        }

        setDireccion("Buscando dirección...");
        const primerPunto = polygonCoords[0];
        const nombre = await obtenerNombreUbicacion(primerPunto.lat, primerPunto.lng);
        setDireccion(nombre);

        setIsDrawingPolygon(false);
        setTipo('Polígono');
        setShowModal(true);
    };

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
        } else {
            if (!showModal) {
                setPopupInfo({ latlng, address: "Cargando dirección..." });
                const nombre = await obtenerNombreUbicacion(latlng.lat, latlng.lng);
                setPopupInfo({ latlng, address: nombre });
            }
        }
    };

    const mapCoordsToGeoJSON = (coords, type) => {
        if (type !== 'Polígono') {
            return [coords.lng, coords.lat];
        }
        if (!coords || coords.length < 3) return [];
        const ring = coords.map(p => [p.lng, p.lat]);
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            ring.push(first);
        }
        if (ring.length < 4) return [];
        return [ring];
    };

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
        } else {
            reportLocation = mapCoordsToGeoJSON(nuevoReporteCoords, 'Point');
            geoJsonType = 'Point';
        }

        const payload = {
            type: tipo,
            description: descripcion,
            address: direccion,
            location: { type: geoJsonType, coordinates: reportLocation },
            user: usuario._id
        };

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
                let errorMessage = res.statusText;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.message || errorData.error || res.statusText;
                } catch (e) { }
                alert(`Error al guardar. Detalle: ${errorMessage}`);
            }
        } catch (error) {
            alert(`Error de conexión: ${error.message}`);
        }
    };

    const handleStartEdit = (reporte) => {
        if (reporte.location.type !== 'Point') {
            alert("Solo se permite editar reportes de tipo Punto.");
            return;
        }
        setTipo(reporte.type);
        setDescripcion(reporte.description);
        setDireccion(reporte.address);
        setEditingId(reporte._id);
        setNuevoReporteCoords({ lat: reporte.location.coordinates[1], lng: reporte.location.coordinates[0] });
        setShowModal(true);
    };

    const getLeafletPolygonCoords = (reporte) => {
        const ring = reporte.location.coordinates[0];
        return ring.map(coord => [coord[1], coord[0]]);
    };

    const handleSearch = () => {
        const results = reportes.filter(rep => {
            const matchesTipo = filterTipo ? rep.type.toLowerCase().includes(filterTipo.toLowerCase()) : true;
            const matchesNombre = searchQuery ? rep.address.toLowerCase().includes(searchQuery.toLowerCase()) : true;
            return matchesTipo && matchesNombre;
        });
        setSearchResults(results);
    };

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            {/* Navbar */}
            <nav className="navbar navbar-dark bg-primary px-3 shadow" style={{ zIndex: 1000 }}>
                <span className="navbar-brand fw-bold">City Watch</span>
                <div className='d-flex align-items-center gap-2'>
                    <button
                        className={`btn ${showTable ? 'btn-warning text-dark' : 'btn-light text-primary'} fw-bold shadow-sm me-2`}
                        onClick={() => setShowTable(!showTable)}
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

                                <Link to="/perfil" className="dropdown-item py-2">👤 Mi Perfil / Mis Reportes</Link>

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

                {/* Buscador flotante */}
                <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 1100,
                    width: '250px',
                    background: 'white',
                    padding: '8px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                    <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Buscar ubicación..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <select className="form-select mb-2" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
                        <option value="">Todos los tipos</option>
                        <option value="Choque">Choque</option>
                        <option value="Tráfico">Tráfico</option>
                        <option value="Obra">Obra</option>
                        <option value="Manifestación">Manifestación</option>
                        <option value="Bache">Bache</option>
                        <option value="Polígono">Polígono</option>
                    </select>
                    <button className="btn btn-primary w-100" onClick={handleSearch}>Buscar</button>

                    {searchResults.length > 0 && (
                        <div className="mt-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {searchResults.map(rep => (
                                <div
                                    key={rep._id}
                                    className="p-1 border-bottom"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                        if (rep.location.type === 'Point') {
                                            mapRef.current.setView([rep.location.coordinates[1], rep.location.coordinates[0]], 16);
                                        } else {
                                            const coords = rep.location.coordinates[0];
                                            const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
                                            const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
                                            mapRef.current.setView([centerLat, centerLng], 16);
                                        }
                                    }}
                                >
                                    <strong>{rep.type}</strong> - {rep.address}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Overlay para tabla */}
                {showTable && (
                    <div className="position-absolute w-100 h-100 bg-dark bg-opacity-75 d-flex justify-content-center align-items-center" style={{ zIndex: 1050 }}>
                        <div className="bg-white rounded shadow-2xl p-0 w-11/12 h-5/6 md:w-3/4 lg:w-4/5" style={{ maxWidth: '1200px' }}>
                            <TablaReportes
                                reportes={reportes}
                                usuarioId={usuario._id}
                                onEdit={handleStartEdit}
                                onRefresh={fetchReportes}
                                onClose={() => setShowTable(false)}
                            />
                        </div>
                    </div>
                )}

                {/* Indicadores de selección */}
                {isSelectingLocation && (
                    <div className="alert alert-info position-absolute top-0 start-50 translate-middle-x mt-3 shadow fw-bold text-center" style={{ zIndex: 1001 }}>
                        📍 Haz clic en el mapa para ubicar el incidente
                        <br />
                        <button className='btn btn-sm btn-secondary mt-1' onClick={() => { setIsSelectingLocation(false); setShowModal(true); }}>Cancelar</button>
                    </div>
                )}

                {isDrawingPolygon && (
                    <div className="alert alert-warning position-absolute top-0 start-50 translate-middle-x mt-3 shadow fw-bold text-center" style={{ zIndex: 1001 }}>
                        📐 Haz clic para añadir puntos. Puntos: <b>{polygonCoords.length}</b>
                        <br />
                        {polygonCoords.length >= 3 && (
                            <button className='btn btn-sm btn-success mt-1 me-2' onClick={finishPolygon}>Finalizar Polígono</button>
                        )}
                        <button className='btn btn-sm btn-secondary mt-1' onClick={handleCloseModal}>Cancelar</button>
                    </div>
                )}

                <MapContainer
                    center={[21.15226, -101.71132]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    whenCreated={mapInstance => { mapRef.current = mapInstance; }}
                >
                    <TileLayer
                        url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${token}`}
                        attribution='Mapbox'
                        tileSize={512}
                        zoomOffset={-1}
                    />

                    {!showTable && <MapClickHandler onClick={handleMapClick} />}

                    {popupInfo && (
                        <Popup position={popupInfo.latlng} onClose={() => setPopupInfo(null)}>
                            <div className="text-center">{popupInfo.address}</div>
                        </Popup>
                    )}

                    {/** ============================
                     *       MARCADORES ACTUALIZADOS  
                     * ============================ */}
                    {reportes.map(rep => (
                        rep.location.type === 'Point' ? (
                            <Marker
                                key={rep._id}
                                position={[rep.location.coordinates[1], rep.location.coordinates[0]]}
                            >
                                <Popup>
                                    <div className="fw-bold">{rep.type}</div>
                                    <div>{rep.address}</div>
                                    <div>{rep.description}</div>

                                    <button
                                        className="btn btn-sm btn-primary mt-2"
                                        onClick={() => handleStartEdit(rep)}
                                    >
                                        Editar
                                    </button>
                                </Popup>
                            </Marker>
                        ) : (
                            rep.location.type === 'Polygon' && (
                                <Polygon
                                    key={rep._id}
                                    positions={getLeafletPolygonCoords(rep)}
                                    pathOptions={{ color: 'red' }}
                                >
                                    <Popup>
                                        <div className="fw-bold">{rep.type}</div>
                                        <div>{rep.address}</div>
                                        <div>{rep.description}</div>

                                        <button className="btn btn-sm btn-secondary mt-2" disabled>
                                            No editable
                                        </button>
                                    </Popup>
                                </Polygon>
                            )
                        )
                    ))}

                    {isDrawingPolygon && polygonCoords.length > 0 && (
                        <Polygon positions={polygonCoords.map(p => [p.lat, p.lng])} pathOptions={{ color: 'orange', dashArray: '5,5' }} />
                    )}
                </MapContainer>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{editingId ? 'Editar' : 'Nuevo'} Reporte</h5>
                                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-2">
                                        <label className="form-label">Tipo</label>
                                        <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value)} disabled={tipo === 'Polígono'}>
                                            <option value="Choque">Choque</option>
                                            <option value="Tráfico">Tráfico</option>
                                            <option value="Obra">Obra</option>
                                            <option value="Manifestación">Manifestación</option>
                                            <option value="Bache">Bache</option>
                                        </select>
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label">Descripción</label>
                                        <textarea className="form-control" value={descripcion} onChange={e => setDescripcion(e.target.value)} required />
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label">Dirección</label>
                                        <input type="text" className="form-control" value={direccion} readOnly />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">{editingId ? 'Guardar' : 'Reportar'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
