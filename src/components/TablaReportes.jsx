import { useState } from 'react';

// Se incluye usuarioId y onEdit para la gestión de acciones
const TablaReportes = ({ reportes, usuarioId, onClose, onRefresh, onEdit }) => {
    const [pagina, setPagina] = useState(1);
    const [porPagina] = useState(10); 
    const [reporteAConfirmar, setReporteAConfirmar] = useState(null); // Para la confirmación de eliminación

    const totalPaginas = Math.ceil(reportes.length / porPagina);
    const inicio = (pagina - 1) * porPagina;
    const fin = inicio + porPagina;
    const actuales = reportes.slice(inicio, fin);
    
    // Muestra el modal de confirmación
    const confirmarEliminar = (reporte) => setReporteAConfirmar(reporte);

    // Ejecuta la eliminación
    const eliminarReporte = async () => {
        if (!reporteAConfirmar) return;

        const id = reporteAConfirmar._id;
        try {
            const res = await fetch(`http://localhost:3000/reports/${id}`, { method: 'DELETE' });
            if (res.ok) {
                console.log(`Reporte ${id} eliminado.`);
                onRefresh();
            } else {
                 console.error("Error al eliminar el reporte:", res.statusText);
            }
        } catch (error) {
            console.error("Error en la petición de eliminación:", error);
        } finally {
            setReporteAConfirmar(null);
        }
    };
    
    // Función para formatear las coordenadas para la visualización
    const formatCoordinates = (location) => {
        if (!location || !location.coordinates) return 'N/A';
        
        const type = location.type;
        const coords = location.coordinates;
        
        if (type === 'Point') {
            // [lng, lat]
            const [lng, lat] = coords;
            return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        }
        
        if (type === 'Polygon') {
            // Un polígono tiene anillos de coordenadas
            // Eliminamos ringCount ya que no se estaba usando
            const vertexCount = coords[0] ? coords[0].length : 0; 
            return `Polígono: ${vertexCount} vértices`;
        }
        
        return 'Ubicación compleja';
    };

    return (
        // Contenedor ajustado para integrarse al wrapper de Home.jsx (ya no es fixed)
        <div className="p-4 bg-white shadow-xl rounded-lg h-full w-full flex flex-col">
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                <h5 className="mb-0 text-primary fw-bold">Listado General de Reportes ({reportes.length})</h5>
                <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary" onClick={onRefresh}>🔄 Refrescar</button>
                    <button className="btn btn-sm btn-danger" onClick={onClose}>✖️ Cerrar Vista</button>
                </div>
            </div>
            
            <div className="flex-grow-1 overflow-auto">
                <table className="table table-sm table-striped align-middle">
                    <thead>
                        <tr>
                            <th style={{ width: '5%' }}>#</th>
                            <th style={{ width: '10%' }}>Tipo</th>
                            <th style={{ width: '25%' }}>Descripción</th>
                            <th style={{ width: '25%' }}>Dirección</th>
                            <th style={{ width: '15%' }}>Coordenadas</th> 
                            <th style={{ width: '10%' }}>Usuario</th>
                            <th style={{ width: '10%' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {actuales.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center text-muted py-3">No hay reportes para mostrar.</td>
                            </tr>
                        ) : (
                            actuales.map((r, i) => {
                                // Comprobación de propiedad para edición/eliminación
                                const isOwner = r.user?._id === usuarioId || r.user === usuarioId;
                                // Solo se permite editar si es Point
                                const isEditable = isOwner && r.location.type === 'Point';
                                
                                return (
                                    <tr key={r._id}>
                                        <td>{inicio + i + 1}</td>
                                        <td>
                                            <span className={`badge bg-${r.type === 'Polígono' ? 'secondary' : 'info'}`}>
                                                {r.type}
                                            </span>
                                        </td>
                                        <td>{r.description.length > 50 ? r.description.substring(0, 50) + '...' : r.description}</td>
                                        <td><small className="text-muted">{r.address}</small></td>
                                        <td><small className="text-secondary">{formatCoordinates(r.location)}</small></td> 
                                        <td>{r.user?.name || (r.user && r.user.substring(0, 8) + '...')}</td>
                                        <td className="d-flex gap-1">
                                            {isEditable && (
                                                <button 
                                                    className="btn btn-sm btn-outline-primary" 
                                                    onClick={() => onEdit(r)}
                                                    title="Editar Reporte"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                            {isOwner && (
                                                <button 
                                                    className="btn btn-sm btn-outline-danger" 
                                                    onClick={() => confirmarEliminar(r)}
                                                    title="Eliminar Reporte"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3 border-top pt-3">
                <span className="text-muted">Página {pagina} de {totalPaginas}</span>
                <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>⬅️ Anterior</button>
                    <button className="btn btn-sm btn-outline-primary" disabled={pagina === totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente ➡️</button>
                </div>
            </div>

            {/* Modal de Confirmación para Eliminar (Reemplazo de window.confirm) */}
            {reporteAConfirmar && (
                <>
                    <div className="modal-backdrop show" style={{ opacity: 0.5, zIndex: 1060 }}></div>
                    <div className="modal show d-block" tabIndex="-1" style={{ zIndex: 1070 }}>
                        <div className="modal-dialog modal-dialog-centered modal-sm">
                            <div className="modal-content shadow-lg">
                                <div className="modal-header bg-danger text-white">
                                    <h5 className="modal-title">Confirmar Eliminación</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setReporteAConfirmar(null)}></button>
                                </div>
                                <div className="modal-body">
                                    <p>¿Estás seguro de que deseas eliminar el reporte de tipo <strong>{reporteAConfirmar.type}</strong> en la dirección <em>{reporteAConfirmar.address}</em>?</p>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setReporteAConfirmar(null)}>Cancelar</button>
                                    <button type="button" className="btn btn-danger" onClick={eliminarReporte}>Sí, Eliminar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TablaReportes;