import { useState } from 'react'
import '/src/styles/Login.css'
import { Link, useNavigate } from 'react-router-dom'

function RegistroDeCuenta({ onRegister }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [lastName, setLastName] = useState('')

    const navigate = useNavigate()

    const userRegistration = async (e) => {
        e.preventDefault();

        try{
            const res = await fetch('http://localhost:3000/login/createAccount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, lastName, email, password })
            });

            const data = await res.json();

            if (res.ok) {
                alert('Cuenta creada con éxito');
                if (onRegister) onRegister(data.nuevoUsuario); 
                navigate('/'); 
            } else {
                alert(data.message || 'Error al registrar usuario');
            }
        }catch(error){
            console.error('Error de conexión:', error);
            alert('No se pudo conectar con el servidor.');
        }
    };

    return (
        <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-login position-relative p-0">
            <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
            <div className="card shadow-lg border-0 rounded-4 z-1" style={{ width: '100%', maxWidth: '500px' }}>
                <div className="card-body p-4 p-md-5">

                    <div className="text-center mb-4">
                        <h2 className="fw-bold text-primary">Únete a CityWatch</h2>
                        <p className="text-muted small">Sé parte del cambio en tu ciudad.</p>
                    </div>

                    <form onSubmit={userRegistration}>
                        <div className="row g-2 mb-3">
                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="name"
                                        placeholder="Nombre"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                    <label htmlFor="name">Nombre</label>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="lastName"
                                        placeholder="Apellidos"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                    <label htmlFor="lastName">Apellidos</label>
                                </div>
                            </div>
                        </div>

                        <div className="form-floating mb-3">
                            <input
                                type="email"
                                className="form-control"
                                id="email"
                                placeholder="nombre@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <label htmlFor="email">Correo electrónico</label>
                        </div>

                        <div className="form-floating mb-4">
                            <input
                                type="password"
                                className="form-control"
                                id="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <label htmlFor="password">Contraseña</label>
                        </div>

                        <div className="d-grid gap-2">
                            <button type="submit" className="btn btn-primary btn-lg fw-bold shadow-sm">
                                Registrarse
                            </button>

                            <Link to="/login" className="d-grid text-decoration-none">
                                <button type="button" className="btn btn-outline-secondary border-0">
                                    ¿Ya tienes cuenta? Inicia sesión
                                </button>
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default RegistroDeCuenta;