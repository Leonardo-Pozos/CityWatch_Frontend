import { useState } from "react"
import { Link } from 'react-router-dom';
import '/src/styles/Login.css'
import { useNavigate } from 'react-router-dom';

function Login({ onLogin }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        try{
            const res = await fetch('http://localhost:3000/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok) {
                onLogin(data.usuario);
                navigate('/');
            } else {
                alert(data.error || 'Credenciales incorrectas');
            }
        }catch(error){
            console.error("Error de red:", error);
            alert("Error al conectar con el servidor");
        }
    };

    return (
        <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-login position-relative p-0">            
            <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
            <div className="card shadow-lg border-0 rounded-4 z-1" style={{ width: '100%', maxWidth: '420px' }}>
                <div className="card-body p-4 p-md-5">
                    <div className="text-center mb-4">
                        <h2 className="fw-bold text-primary">CityWatch</h2>
                        <p className="text-muted small">Reporta. Colabora. Mejora tu ciudad.</p>
                    </div>

                    <form onSubmit={handleLogin}>
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

                        <div className="form-floating mb-3">
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
                                Iniciar Sesión
                            </button>
                            
                            <div className="text-center text-muted my-2 small">o</div>

                            <Link to="/register" className="d-grid text-decoration-none">
                                <button type="button" className="btn btn-outline-secondary">
                                    Crear cuenta nueva
                                </button>
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Login;