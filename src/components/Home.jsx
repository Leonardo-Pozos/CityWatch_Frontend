import React, { useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw'; 
import 'leaflet/dist/leaflet.css';             
import 'leaflet-draw/dist/leaflet.draw.css';   
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const token = import.meta.env.VITE_MAPBOX_TOKEN;

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const Home = ({ onLogout }) => {
    const [figuras, setFiguras] = useState(null);
    const onCreated = (e) => {
        const { layerType, layer } = e;
        
        if (layerType === 'marker') {
            console.log("📍 Marcador creado en:", layer.getLatLng());
        } else {
            console.log("📐 Polígono creado:", layer.getLatLngs());
        }
        const geoJsonData = layer.toGeoJSON();
        setFiguras(geoJsonData);
    };

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <nav className="navbar navbar-dark bg-primary px-3 shadow" style={{ zIndex: 1000 }}>
                <span className="navbar-brand fw-bold">CityWatch 📍</span>
                <button className="btn btn-sm btn-light text-primary fw-bold" onClick={onLogout}>
                    Cerrar Sesión
                </button>
            </nav>
            <div style={{ flex: 1, position: 'relative' }}>
                <MapContainer 
                    center={[21.15226, -101.71132]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${token}`}
                        attribution='&copy; Mapbox &copy; OpenStreetMap'
                        tileSize={512}
                        zoomOffset={-1}
                    />
                    <FeatureGroup>
                        <EditControl
                            position="topright"
                            onCreated={onCreated}
                            draw={{
                                rectangle: true,
                                polygon: true,
                                circle: false,      
                                circlemarker: false,
                                marker: true,
                                polyline: true
                            }}
                        />
                    </FeatureGroup>
                </MapContainer>

                {figuras && (
                    <div className="card position-absolute bottom-0 start-0 m-3 p-3 shadow" style={{ zIndex: 999, width: '300px' }}>
                        <h6 className="fw-bold">Reporte Listo</h6>
                        <small className="text-muted">Coordenadas capturadas:</small>
                        <pre className="bg-light p-2 mt-1 border rounded" style={{ fontSize: '10px', maxHeight: '100px', overflow: 'auto' }}>
                            {JSON.stringify(figuras.geometry, null, 2)}
                        </pre>
                        <button className="btn btn-success btn-sm w-100">
                            Enviar Reporte a Mongo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;